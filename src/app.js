import { servantSeeds, ceSeeds, loadCatalog, sameServant } from "./data.js";
import { suggest } from "./engine.js";

const getElement = (selector) => document.querySelector(selector);
const state = {
  region: "NA",
  servants: servantSeeds,
  ces: ceSeeds,
  owned: new Set(),
  core: [],
  ceCounts: {},
  filter: "all",
  servantLimit: 12,
  ceLimit: 8,
  goal: "balanced",
  enemy: "any",
  friend: false,
  cost: 112,
  result: null,
};

// The browser owns the collection. We store names and classes alongside IDs
// because the small offline sample and Atlas Academy use different IDs.
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const key = () => `chaldea-party-lab:${state.region}`;

function save() {
  const savedServant = (id) => {
    const servant = state.servants.find((item) => item.id === id);
    return (
      servant && {
        id: servant.id,
        name: servant.name,
        className: servant.className,
      }
    );
  };

  const data = {
    ownedServants: [...state.owned].map(savedServant).filter(Boolean),
    coreServants: state.core.map(savedServant).filter(Boolean),
    ceCounts: Object.entries(state.ceCounts)
      .map(([id, count]) => {
        const ce = state.ces.find((item) => item.id === id);
        return ce && { id: ce.id, name: ce.name, count };
      })
      .filter(Boolean),
    goal: state.goal,
    enemy: state.enemy,
    friend: state.friend,
    cost: state.cost,
  };
  try {
    localStorage.setItem(key(), JSON.stringify(data));
  } catch (error) {
    // The builder still works when a browser blocks local storage.
    console.warn("Collection could not be saved in this browser:", error);
  }
}
function loadSaved() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(key()) || "{}");
  } catch {}
  const servantId = (entry) => {
    const saved = typeof entry === "string" ? { name: entry } : entry;
    return (
      state.servants.find((unit) => unit.id === saved.id)?.id ||
      state.servants.find((unit) => saved.className && sameServant(unit, saved))
        ?.id ||
      state.servants.find((unit) => unit.name === saved.name)?.id
    );
  };
  const ceId = (entry) =>
    state.ces.find((ce) => ce.id === entry.id)?.id ||
    state.ces.find((ce) => ce.name === entry.name)?.id;

  const ownedEntries = data.ownedServants || data.ownedNames || [];
  const coreEntries = data.coreServants || data.coreNames || [];
  state.owned = new Set(ownedEntries.map(servantId).filter(Boolean));
  state.core = coreEntries.map(servantId).filter(Boolean).slice(0, 3);
  state.ceCounts = Object.fromEntries(
    (data.ceCounts || [])
      .map((entry) => {
        const saved = Array.isArray(entry)
          ? { name: entry[0], count: entry[1] }
          : entry;
        return [
          ceId(saved),
          Math.max(0, Math.min(6, Number(saved.count) || 0)),
        ];
      })
      .filter(([id]) => id),
  );
  state.goal = data.goal || "balanced";
  state.enemy = data.enemy || "any";
  state.friend = !!data.friend;
  state.cost = Number.isFinite(Number(data.cost)) ? Number(data.cost) : 112;
  getElement("#goal").value = state.goal;
  getElement("#enemy").value = state.enemy;
  getElement("#friend").checked = state.friend;
  getElement("#cost").value = state.cost;
}
function portrait(item) {
  const img = item.face
    ? `<img src="${escapeHtml(item.face)}" alt="" loading="lazy" onerror="this.remove()">`
    : "";
  return `<span class="portrait">${img}${escapeHtml(item.className?.[0] || item.name?.[0] || "✦")}</span>`;
}
function stars(n) {
  return `<span class="stars">${"★".repeat(Math.min(5, n || 0))}</span>`;
}
function renderCore() {
  getElement("#core-count").textContent = `${state.core.length} / 3 selected`;
  getElement("#core-tray").innerHTML = Array.from({ length: 3 }, (_, i) => {
    const servant = state.servants.find((item) => item.id === state.core[i]);
    if (!servant) return `<div class="core-slot">＋ Core pick ${i + 1}</div>`;

    return `
      <div class="core-slot filled">
        ${portrait(servant)}
        <div>
          <strong>${escapeHtml(servant.name)}</strong>
          <small>${escapeHtml(servant.className)}</small>
        </div>
        <button data-remove-core="${escapeHtml(servant.id)}"
                aria-label="Remove ${escapeHtml(servant.name)}">×</button>
      </div>
    `;
  }).join("");
}

function servantRow(servant) {
  const isOwned = state.owned.has(servant.id);
  const isCore = state.core.includes(servant.id);
  const name = escapeHtml(servant.name);
  const id = escapeHtml(servant.id);

  return `
    <div class="catalog-item">
      ${portrait(servant)}
      <div class="catalog-copy">
        <strong title="${name}">${name}</strong>
        <small>${escapeHtml(servant.className)} · ${stars(servant.rarity)}</small>
      </div>
      <div class="item-actions">
        <button class="tiny-btn ${isOwned ? "on" : ""}" data-own="${id}"
                aria-label="${isOwned ? "Remove" : "Add"} ${name} ${isOwned ? "from" : "to"} owned">
          ${isOwned ? "✓ Own" : "＋ Own"}
        </button>
        <button class="tiny-btn ${isCore ? "core-on" : ""}" data-core="${id}"
                aria-label="${isCore ? "Remove" : "Select"} ${name} as core"
                title="Build around">${isCore ? "★" : "☆"}</button>
      </div>
    </div>
  `;
}

// Each renderer updates one section of the page from the current state.
function renderServants() {
  const query = getElement("#servant-search").value.toLowerCase().trim();
  let list = state.servants.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.className.toLowerCase().includes(query),
  );
  if (state.filter === "owned")
    list = list.filter((s) => state.owned.has(s.id));
  if (state.filter === "unowned")
    list = list.filter((s) => !state.owned.has(s.id));
  list.sort(
    (a, b) =>
      Number(state.core.includes(b.id)) - Number(state.core.includes(a.id)) ||
      Number(state.owned.has(b.id)) - Number(state.owned.has(a.id)) ||
      a.name.localeCompare(b.name),
  );
  getElement("#servant-list").innerHTML =
    list.slice(0, state.servantLimit).map(servantRow).join("") ||
    '<div class="empty-state">No Servants match your search.</div>';
  getElement("#servant-page-status").textContent =
    `Showing ${Math.min(list.length, state.servantLimit)} of ${list.length}`;
  getElement("#servant-more").hidden = list.length <= state.servantLimit;
  getElement("#servant-count").textContent = `${state.owned.size} owned`;
  getElement("#stat-servants").textContent = state.owned.size;
  getElement("#stat-core").textContent = `${state.core.length} / 3`;
}

function craftEssenceRow(ce) {
  const name = escapeHtml(ce.name);
  const id = escapeHtml(ce.id);

  return `
    <div class="catalog-item">
      ${portrait(ce)}
      <div class="catalog-copy">
        <strong title="${name}">${name}</strong>
        <small>Cost ${ce.cost} · ${stars(ce.rarity)}</small>
      </div>
      <div class="quantity">
        <button data-ce="${id}" data-delta="-1" aria-label="Remove one ${name}">−</button>
        <strong>${state.ceCounts[ce.id] || 0}</strong>
        <button data-ce="${id}" data-delta="1" aria-label="Add one ${name}">＋</button>
      </div>
    </div>
  `;
}

function renderCEs() {
  const query = getElement("#ce-search").value.toLowerCase().trim();
  const list = state.ces
    .filter((ce) => ce.name.toLowerCase().includes(query))
    .sort(
      (a, b) =>
        (state.ceCounts[b.id] || 0) - (state.ceCounts[a.id] || 0) ||
        a.name.localeCompare(b.name),
    );
  getElement("#ce-list").innerHTML =
    list.slice(0, state.ceLimit).map(craftEssenceRow).join("") ||
    '<div class="empty-state">No Craft Essences match your search.</div>';
  const total = Object.values(state.ceCounts).reduce((a, b) => a + b, 0);
  getElement("#ce-count").textContent = `${total} copies owned`;
  getElement("#stat-ces").textContent = total;
  getElement("#ce-page-status").textContent =
    `Showing ${Math.min(list.length, state.ceLimit)} of ${list.length}`;
  getElement("#ce-more").hidden = list.length <= state.ceLimit;
}
function render() {
  renderCore();
  renderServants();
  renderCEs();
}
function teamMember(servant, ce, isFriend) {
  const ceName = isFriend
    ? "Friend support"
    : ce
      ? escapeHtml(ce.name)
      : "No CE";

  return `
    <div class="team-member">
      ${portrait(servant)}
      <strong title="${escapeHtml(servant.name)}">${escapeHtml(servant.name)}</strong>
      <small>${ceName}</small>
    </div>
  `;
}

function suggestionCard(party, index) {
  const titles = ["Recommended party", "Alternate lineup", "Flexible option"];
  const frontline = party.front
    .map((servant, slot) =>
      teamMember(servant, party.ces[slot], servant.id === party.friendId),
    )
    .join("");
  const backline = party.back
    .map((servant, slot) => teamMember(servant, party.ces[slot + 3], false))
    .join("");
  const emptySlots = Array.from(
    { length: 3 - party.back.length },
    () =>
      '<div class="team-member"><span class="portrait">＋</span><small>Empty slot</small></div>',
  ).join("");

  return `
    <article class="suggestion-card ${index === 0 ? "top" : ""}">
      <div class="suggestion-head">
        <span class="rank">${index === 0 ? "BEST MATCH" : `OPTION ${index + 1}`}</span>
        <span class="score">✦ ${party.score} synergy</span>
      </div>
      <h3>${titles[index]}</h3>
      <p class="composition">${party.front.map((s) => s.className).join(" · ")}</p>
      <div class="team-label">FRONTLINE</div>
      <div class="team-row">${frontline}</div>
      <div class="team-label">BACKLINE</div>
      <div class="team-row">${backline}${emptySlots}</div>
      <div class="team-label">WHY IT WORKS</div>
      <ul class="reason-list">
        ${party.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
      <div class="cost-line">
        Party cost ${party.cost} / ${state.cost}
        ${party.back.length < 3 ? " · Add owned Servants to fill empty backline slots" : ""}
      </div>
    </article>
  `;
}
function renderResults() {
  const target = getElement("#suggestions");
  if (!state.result) {
    target.innerHTML = "";
    return;
  }
  if (state.result.error) {
    target.innerHTML = `<div class="empty-state"><strong>Couldn’t make a party yet</strong>${escapeHtml(state.result.error)}</div>`;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  target.innerHTML = `
    <div class="suggestions-header">
      <div>
        <h2>Suggested lineups</h2>
        <p>Ranked for your ${escapeHtml(state.goal)} plan · Score is a relative heuristic</p>
      </div>
      <span class="count-pill">${state.result.results.length} parties</span>
    </div>
    <div class="suggestion-grid">
      ${state.result.results.map(suggestionCard).join("")}
    </div>
  `;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
function changeCollection() {
  save();
  state.result = null;
  render();
  renderResults();
}

// Catalog buttons share one listener so newly rendered rows work immediately.
document.addEventListener("click", (event) => {
  const own = event.target.closest("[data-own]");
  if (own) {
    const id = own.dataset.own;
    state.owned.has(id) ? state.owned.delete(id) : state.owned.add(id);
    changeCollection();
    return;
  }
  const core = event.target.closest("[data-core],[data-remove-core]");
  if (core) {
    const id = core.dataset.core || core.dataset.removeCore;
    state.core = state.core.includes(id)
      ? state.core.filter((x) => x !== id)
      : state.core.length < 3
        ? [...state.core, id]
        : state.core;
    changeCollection();
    return;
  }
  const ce = event.target.closest("[data-ce]");
  if (ce) {
    const id = ce.dataset.ce;
    state.ceCounts[id] = Math.max(
      0,
      Math.min(6, (state.ceCounts[id] || 0) + Number(ce.dataset.delta)),
    );
    changeCollection();
    return;
  }
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.filter = filter.dataset.filter;
    document
      .querySelectorAll(".filter")
      .forEach((x) => x.classList.toggle("active", x === filter));
    state.servantLimit = 12;
    renderServants();
  }
});
getElement("#servant-more").onclick = () => {
  state.servantLimit += 20;
  renderServants();
};
getElement("#ce-more").onclick = () => {
  state.ceLimit += 20;
  renderCEs();
};
getElement("#servant-search").oninput = () => {
  state.servantLimit = 12;
  renderServants();
};
getElement("#ce-search").oninput = () => {
  state.ceLimit = 8;
  renderCEs();
};
for (const [id, keyName, convert] of [
  ["goal", "goal", (x) => x],
  ["enemy", "enemy", (x) => x],
  ["friend", "friend", (x) => x],
  ["cost", "cost", (x) => Math.max(0, Number(x) || 0)],
]) {
  getElement(`#${id}`).addEventListener("change", (event) => {
    state[keyName] = convert(
      id === "friend" ? event.target.checked : event.target.value,
    );
    save();
    state.result = null;
    renderResults();
  });
}
getElement("#generate").onclick = () => {
  const ces = state.ces
    .map((ce) => ({ ...ce, quantity: state.ceCounts[ce.id] || 0 }))
    .filter((ce) => ce.quantity);
  state.result = suggest({
    servants: state.servants,
    ces,
    owned: state.owned,
    core: state.core,
    friend: state.friend,
    goal: state.goal,
    enemy: state.enemy,
    costLimit: state.cost,
  });
  renderResults();
};
getElement("#region").onchange = (event) => switchRegion(event.target.value);
async function switchRegion(region) {
  state.region = region;
  state.servants = servantSeeds;
  state.ces = ceSeeds;
  state.result = null;
  state.servantLimit = 12;
  state.ceLimit = 8;
  loadSaved();
  render();
  renderResults();
  getElement("#data-status").textContent = `Loading ${region} catalog…`;
  const expectedRegion = region;
  try {
    const catalog = await loadCatalog(region);
    if (state.region !== expectedRegion) return;
    state.servants = catalog.servants;
    state.ces = catalog.ces;
    // Live IDs differ from sample IDs, so resolve saved names and classes again.
    loadSaved();
    getElement("#data-status").textContent =
      `${region} catalog · ${state.servants.length} Servants`;
    save();
    render();
  } catch (error) {
    if (state.region !== expectedRegion) return;
    getElement("#data-status").textContent = "Offline sample catalog";
    console.warn("Atlas Academy catalog unavailable:", error);
  }
}
switchRegion("NA");
