import { costFor } from "./data.js";

const triangle = {
  Saber: "Lancer",
  Lancer: "Archer",
  Archer: "Saber",
  Rider: "Caster",
  Caster: "Assassin",
  Assassin: "Rider",
};
const weak = {
  Saber: "Archer",
  Lancer: "Saber",
  Archer: "Lancer",
  Rider: "Assassin",
  Caster: "Rider",
  Assassin: "Caster",
};
const has = (unit, tag) => unit.tags?.includes(tag);
const unitCost = (u) =>
  Number.isFinite(Number(u.cost)) ? Number(u.cost) : costFor(u.rarity);

// Higher scores mean a better fit for the selected battle plan.
function roleScore(unit, goal, enemy) {
  let score = unit.role === "damage" ? 12 : unit.role === "support" ? 10 : 5;
  if (goal === "farming") {
    score += has(unit, "aoe") ? 9 : 0;
    score += has(unit, "charge") ? 5 : 0;
    score -= has(unit, "single") ? 4 : 0;
  }
  if (goal === "boss") {
    score += has(unit, "single") ? 8 : 0;
    score += has(unit, "defense") || has(unit, "heal") ? 4 : 0;
  }
  if (goal === "survival") {
    score +=
      has(unit, "defense") || has(unit, "heal") || has(unit, "survival")
        ? 8
        : 0;
    score += has(unit, "taunt") ? 4 : 0;
  }
  if (enemy !== "any") {
    if (
      triangle[unit.className] === enemy ||
      (unit.className === "Berserker" && unit.role === "damage")
    )
      score += 8;
    if (weak[unit.className] === enemy) score -= 6;
  }
  return score;
}
function scoreFront(front, goal, enemy) {
  const damage = front.filter((x) => x.role === "damage");
  const supports = front.filter((x) => x.role === "support");
  let score = front.reduce((n, x) => n + roleScore(x, goal, enemy), 0);
  for (const d of damage) {
    for (const s of supports) {
      // Matching a support's NP card is not the same as a card-type buff.
      if (
        ["Arts", "Buster", "Quick"].includes(d.card) &&
        has(s, d.card.toLowerCase())
      )
        score += 7;
      if (has(s, "charge")) score += 5;
      if (has(s, "np") && goal === "farming") score += 3;
      if (has(s, "crit") && goal === "boss") score += 3;
    }
  }
  if (damage.length === 1 && supports.length === 2) score += 13;
  else if (damage.length === 2 && supports.length === 1)
    score += goal === "farming" ? 11 : 6;
  else if (damage.length === 0) score -= 16;
  if (goal === "survival")
    score +=
      front.filter(
        (x) => has(x, "defense") || has(x, "heal") || has(x, "survival"),
      ).length * 5;
  if (goal === "farming")
    score += damage.filter((x) => has(x, "aoe")).length * 4;
  return score;
}
function ceScore(ce, servant, goal) {
  // Unknown CEs still remain usable. We simply avoid claiming a special synergy.
  let score = 1;
  const damage = servant.role === "damage";
  if (damage) {
    if (has(ce, "charge")) score += goal === "farming" ? 10 : 5;
    if (has(ce, "np")) score += 9;
    if (has(ce, "attack")) score += 5;
    if (has(ce, servant.card?.toLowerCase())) score += 7;
    if (has(ce, "crit") && goal === "boss") score += 6;
  } else {
    if (has(ce, "support")) score += 8;
    if (has(ce, "defense")) score += goal === "survival" ? 9 : 4;
    if (has(ce, "charge")) score += 2;
  }
  return score;
}
function assignCEs(party, ces, costLimit, goal, friendId) {
  // Treat every owned CE copy as a separate item, then use each at most once.
  // A friend support's Servant and CE do not use the player's party cost.
  const base = party.reduce(
    (total, servant) =>
      total + (servant.id === friendId ? 0 : unitCost(servant)),
    0,
  );
  if (base > costLimit) return null;
  let remaining = costLimit - base;
  const copies = ces.flatMap((ce) =>
    Array.from({ length: Math.min(6, ce.quantity || 0) }, () => ce),
  );
  const assignments = Array(party.length).fill(null);
  let ceTotal = 0;

  // Pick the strongest CE/Servant match across all unfilled slots each time.
  // This avoids spending the only damage CE on a support just because it is first.
  while (copies.length) {
    let best = null;
    party.forEach((servant, slot) => {
      if (servant.id === friendId || assignments[slot]) return;
      copies.forEach((ce, copyIndex) => {
        if (unitCost(ce) <= remaining) {
          const score = ceScore(ce, servant, goal) + 1 - unitCost(ce) * 0.025;
          if (!best || score > best.score) best = { slot, copyIndex, score };
        }
      });
    });

    if (!best) break;
    const [ce] = copies.splice(best.copyIndex, 1);
    assignments[best.slot] = ce;
    remaining -= unitCost(ce);
    ceTotal += best.score;
  }
  return { assignments, cost: costLimit - remaining, ceScore: ceTotal };
}
function reasons(front, goal, enemy, assignments) {
  const out = [];
  const damage = front.find((s) => s.role === "damage");
  const supports = front.filter((s) => s.role === "support");
  if (damage && supports.length) {
    const match = supports.find((s) => has(s, damage.card?.toLowerCase()));
    if (match)
      out.push(`${match.name} supports ${damage.name}'s ${damage.card} focus.`);
    const chargers = supports.filter((s) => has(s, "charge"));
    if (chargers.length)
      out.push(
        `${chargers.map((s) => s.name).join(" and ")} ${chargers.length === 1 ? "brings" : "bring"} NP charge support.`,
      );
  }
  if (goal === "farming" && front.some((s) => has(s, "aoe")))
    out.push("AoE damage helps clear farming waves.");
  if (
    goal === "survival" &&
    front.some((s) => has(s, "defense") || has(s, "heal"))
  )
    out.push("Defensive or healing tools improve staying power.");
  if (enemy !== "any" && front.some((s) => triangle[s.className] === enemy))
    out.push(`Includes class advantage against ${enemy}.`);
  if (assignments.some(Boolean))
    out.push("Craft Essences are assigned within the cost limit.");
  if (!out.length)
    out.push("This lineup fits your selected roster and cost limit.");
  return out.slice(0, 4);
}
const choose = (items, n) => {
  if (n === 0) return [[]];
  if (items.length < n) return [];
  const result = [];
  function walk(start, picked) {
    if (picked.length === n) {
      result.push([...picked]);
      return;
    }
    for (let i = start; i <= items.length - (n - picked.length); i++) {
      picked.push(items[i]);
      walk(i + 1, picked);
      picked.pop();
    }
  }
  walk(0, []);
  return result;
};

export function suggest({
  servants,
  ces,
  owned,
  core,
  friend,
  goal = "balanced",
  enemy = "any",
  costLimit = 112,
}) {
  // A chosen core always stays in the frontline. Candidate teammates must be
  // owned, except for one optional friend support Servant.
  const byId = new Map(servants.map((s) => [s.id, s]));
  const locked = core.map((id) => byId.get(id)).filter(Boolean);
  if (!locked.length)
    return { error: "Choose at least one core Servant to build around." };
  if (locked.length > 3)
    return { error: "Choose no more than three core Servants." };
  const unownedCore = locked.filter((s) => !owned.has(s.id));
  if (unownedCore.length > (friend ? 1 : 0))
    return {
      error: friend
        ? "Only one unowned core Servant can use the friend support slot."
        : "Own your core Servant or enable a friend support slot.",
    };
  const ownedUnits = servants.filter(
    (s) => owned.has(s.id) && !core.includes(s.id),
  );
  const frontPool = ownedUnits
    .sort((a, b) => roleScore(b, goal, enemy) - roleScore(a, goal, enemy))
    .slice(0, 20);
  let friendCandidates = [];
  if (friend && !unownedCore.length)
    friendCandidates = servants
      .filter(
        (s) => !owned.has(s.id) && !core.includes(s.id) && s.role === "support",
      )
      .sort((a, b) => roleScore(b, goal, enemy) - roleScore(a, goal, enemy))
      .slice(0, 8);
  const need = 3 - locked.length;
  const fronts = [];
  for (const countFriend of friendCandidates.length && need ? [0, 1] : [0]) {
    const ownChoices = choose(frontPool, need - countFriend);
    for (const group of ownChoices) {
      if (countFriend) {
        for (const support of friendCandidates)
          fronts.push([...locked, ...group, support]);
      } else fronts.push([...locked, ...group]);
    }
  }
  if (!fronts.length)
    return { error: "Add enough owned Servants to complete the frontline." };
  const unique = [];
  const seen = new Set();
  for (const front of fronts) {
    const key = front
      .map((x) => x.id)
      .sort()
      .join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(front);
    }
  }
  const ranked = unique
    .map((front) => ({ front, baseScore: scoreFront(front, goal, enemy) }))
    .sort((a, b) => b.baseScore - a.baseScore)
    .slice(0, 50);
  const results = [];
  for (const row of ranked) {
    const used = new Set(row.front.map((s) => s.id));
    const friendId = row.front.find((s) => !owned.has(s.id))?.id || null;
    const remainingCost =
      costLimit -
      row.front.reduce(
        (total, unit) => total + (unit.id === friendId ? 0 : unitCost(unit)),
        0,
      );
    let backCost = 0;
    const back = [];
    const eligibleBack = servants
      .filter((s) => owned.has(s.id) && !used.has(s.id))
      .sort(
        (a, b) =>
          unitCost(a) - unitCost(b) ||
          roleScore(b, "survival", enemy) - roleScore(a, "survival", enemy),
      );
    for (const unit of eligibleBack) {
      if (back.length === 3) break;
      if (backCost + unitCost(unit) <= remainingCost) {
        back.push(unit);
        backCost += unitCost(unit);
      }
    }
    const party = [...row.front, ...back];
    const ce = assignCEs(party, ces, costLimit, goal, friendId);
    if (!ce) continue;
    const score = Math.round(row.baseScore + ce.ceScore * 0.4);
    results.push({
      front: row.front,
      back,
      ces: ce.assignments,
      cost: ce.cost,
      score,
      reasons: reasons(row.front, goal, enemy, ce.assignments),
      friendId,
    });
  }
  results.sort((a, b) => b.score - a.score);
  const distinct = [];
  const signatures = new Set();
  for (const result of results) {
    const key = result.front
      .map((s) => s.id)
      .sort()
      .join("|");
    if (!signatures.has(key)) {
      signatures.add(key);
      distinct.push(result);
    }
    if (distinct.length === 3) break;
  }
  if (!distinct.length)
    return {
      error:
        "No party fits this cost limit. Raise it or use lower-cost Servants.",
    };
  return { results: distinct };
}
