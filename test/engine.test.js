import test from "node:test";
import assert from "node:assert/strict";
import { suggest } from "../src/engine.js";
import { normalizeServant, normalizeCE } from "../src/data.js";

const servants = [
  {
    id: "damage",
    name: "Damage",
    className: "Saber",
    rarity: 5,
    cost: 16,
    card: "Arts",
    role: "damage",
    tags: ["single"],
  },
  {
    id: "support",
    name: "Support",
    className: "Caster",
    rarity: 5,
    cost: 16,
    card: "Arts",
    role: "support",
    tags: ["arts", "charge"],
  },
  {
    id: "other",
    name: "Other",
    className: "Rider",
    rarity: 2,
    cost: 4,
    card: "Quick",
    role: "flex",
    tags: [],
  },
  {
    id: "friend",
    name: "Friend",
    className: "Caster",
    rarity: 5,
    cost: 16,
    card: "Arts",
    role: "support",
    tags: ["arts", "charge"],
  },
];
const ces = [{ id: "ce", name: "CE", cost: 12, tags: ["arts"], quantity: 1 }];
const base = {
  servants,
  ces,
  owned: new Set(["damage", "support", "other"]),
  core: ["damage"],
  friend: false,
  goal: "boss",
  enemy: "any",
  costLimit: 112,
};

test("keeps the selected core and never adds unowned units without friend support", () => {
  const { results } = suggest(base);
  assert.ok(results.length > 0);
  for (const party of results) {
    assert.ok(party.front.some((unit) => unit.id === "damage"));
    assert.ok(!party.front.some((unit) => unit.id === "friend"));
    assert.ok(party.cost <= 112);
  }
});

test("an unowned core needs the friend support slot", () => {
  const input = { ...base, core: ["friend"] };
  assert.match(suggest(input).error, /friend support/);
  const { results } = suggest({ ...input, friend: true });
  assert.ok(results.every((party) => party.friendId === "friend"));
});

test("one owned CE copy is assigned no more than once", () => {
  const { results } = suggest(base);
  assert.ok(
    results.every(
      (party) => party.ces.filter((ce) => ce?.id === "ce").length <= 1,
    ),
  );
  const best = results[0];
  const damageSlot = best.front.findIndex((unit) => unit.id === "damage");
  assert.equal(best.ces[damageSlot]?.id, "ce");
});

test("a low cost limit can leave backline slots empty", () => {
  const { results } = suggest({ ...base, costLimit: 36 });
  assert.ok(results.length > 0);
  assert.ok(results.every((party) => party.cost <= 36));
});

test("a friend support uses no player cost or owned CE", () => {
  const { results } = suggest({
    ...base,
    owned: new Set(["damage", "other"]),
    core: ["friend"],
    friend: true,
    costLimit: 20,
  });

  assert.ok(results.length > 0);
  const friendSlot = results[0].front.findIndex((unit) => unit.id === "friend");
  assert.equal(results[0].ces[friendSlot], null);
  assert.ok(results[0].cost <= 20);
});

test("the documented Arts farming example scores 95", () => {
  const catalog = [
    {
      collectionNo: 284,
      name: "Altria Caster",
      className: "caster",
      rarity: 5,
      cost: 16,
    },
    {
      collectionNo: 268,
      name: "Space Ishtar",
      className: "avenger",
      rarity: 5,
      cost: 16,
    },
    {
      collectionNo: 37,
      name: "Zhuge Liang (Lord El-Melloi II)",
      className: "caster",
      rarity: 5,
      cost: 16,
    },
  ].map(normalizeServant);
  const kaleidoscope = normalizeCE({
    collectionNo: 34,
    name: "Kaleidoscope",
    rarity: 5,
    cost: 16,
  });

  const { results } = suggest({
    servants: catalog,
    ces: [{ ...kaleidoscope, quantity: 1 }],
    owned: new Set(catalog.map((servant) => servant.id)),
    core: [catalog[0].id],
    friend: false,
    goal: "farming",
    enemy: "any",
    costLimit: 112,
  });

  assert.equal(results[0].score, 95);
  assert.equal(results[0].cost, 64);
  assert.equal(results[0].ces[1]?.name, "Kaleidoscope");
});
