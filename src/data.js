export const servantSeeds = [
  ["Artoria Caster", "Caster", 5, "Arts", "support", "charge,arts,defense"],
  ["Scáthach-Skadi", "Caster", 5, "Quick", "support", "charge,quick,crit"],
  [
    "Koyanskaya of Light",
    "Assassin",
    5,
    "Buster",
    "support",
    "charge,buster,crit",
  ],
  ["Oberon", "Pretender", 5, "Buster", "support", "charge,np,buster"],
  [
    "Zhuge Liang (El-Melloi II)",
    "Caster",
    5,
    "Arts",
    "support",
    "charge,attack,defense",
  ],
  ["Merlin", "Caster", 5, "Buster", "support", "buster,crit,defense"],
  ["Lady Avalon", "Pretender", 5, "Arts", "support", "arts,defense,heal"],
  ["Tamamo-no-Mae", "Caster", 5, "Arts", "support", "arts,heal,defense"],
  ["Reines", "Rider", 5, "Arts", "support", "charge,defense"],
  [
    "Hans Christian Andersen",
    "Caster",
    2,
    "Arts",
    "support",
    "crit,heal,defense",
  ],
  ["Mash Kyrielight", "Shielder", 4, "Arts", "support", "defense,taunt"],
  ["Arash", "Archer", 1, "Buster", "damage", "aoe,charge"],
  ["Chen Gong", "Caster", 2, "Arts", "damage", "aoe,charge,buster"],
  ["Spartacus", "Berserker", 1, "Buster", "damage", "aoe,charge"],
  ["Morgan", "Berserker", 5, "Buster", "damage", "aoe,charge,crit"],
  ["Melusine", "Lancer", 5, "Buster", "damage", "aoe,charge"],
  ["Space Ishtar", "Avenger", 5, "Arts", "damage", "aoe,charge"],
  ["Senkō Muramasa", "Saber", 5, "Arts", "damage", "aoe,crit"],
  ["Ibuki-Dōji (Berserker)", "Berserker", 5, "Arts", "damage", "aoe,charge"],
  ["Kama (Avenger)", "Avenger", 5, "Arts", "damage", "aoe,charge"],
  ["Achilles", "Rider", 5, "Quick", "damage", "aoe,crit"],
  ["Dantes", "Avenger", 5, "Quick", "damage", "aoe,crit"],
  ["Sakata Kintoki", "Berserker", 5, "Buster", "damage", "single,charge"],
  ["Heracles", "Berserker", 4, "Buster", "damage", "single,survival"],
  ["Cu Chulainn", "Lancer", 3, "Quick", "damage", "single,survival"],
  ["Jeanne d’Arc", "Ruler", 5, "Arts", "support", "defense,heal"],
  ["Himiko", "Ruler", 5, "Buster", "support", "crit,defense"],
  ["Van Gogh", "Foreigner", 5, "Quick", "support", "crit,defense"],
  [
    "Nero Claudius (Bride)",
    "Saber",
    5,
    "Arts",
    "support",
    "charge,attack,heal",
  ],
  ["Paracelsus von Hohenheim", "Caster", 3, "Arts", "support", "arts,charge"],
  ["Asclepius", "Caster", 3, "Arts", "support", "heal,charge,defense"],
  ["Georgios", "Rider", 2, "Arts", "support", "taunt,defense"],
].map(([name, className, rarity, card, role, tags], index) => ({
  id: `seed-s-${index}`,
  name,
  className,
  rarity,
  card,
  role,
  tags: tags.split(","),
  cost: costFor(rarity),
  face: null,
  seed: true,
}));

export const ceSeeds = [
  ["Kaleidoscope", 5, "charge"],
  ["The Black Grail", 5, "np"],
  ["Aerial Drive", 5, "buster,np,charge"],
  ["Holy Night Supper", 5, "charge,np,crit"],
  ["Golden Sumo: Boulder Tournament", 5, "charge,attack"],
  ["Painting Summer", 5, "charge,arts,np"],
  ["Ocean Flyer", 5, "charge,arts,np"],
  ["Traces of Christmases Past", 5, "charge,quick,np"],
  ["The Imaginary Element", 4, "charge"],
  ["Dragon’s Meridian", 3, "charge"],
  ["Prisma Cosmos", 5, "support"],
  ["Fragment of 2030", 5, "crit"],
  ["Volumen Hydrargyrum", 5, "defense"],
  ["Chaldea Teatime", 5, "support"],
  ["Bond CE", 4, "support"],
].map(([name, rarity, tags], index) => ({
  id: `seed-ce-${index}`,
  name,
  rarity,
  tags: tags.split(","),
  cost: costFor(rarity),
  face: null,
  seed: true,
}));

export function costFor(rarity) {
  return { 0: 0, 1: 3, 2: 4, 3: 7, 4: 12, 5: 16 }[rarity] ?? 12;
}
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const servantAliases = {
  "artoria caster": "altria caster",
  "senko muramasa": "senji muramasa",
  "zhuge liang lord el melloi ii": "zhuge liang el melloi ii",
  reines: "sima yi reines",
  dantes: "edmond dantes",
};

function canonicalName(name) {
  const normalized = norm(name);
  return servantAliases[normalized] || normalized;
}

export function findSeed(item, seeds) {
  const name = canonicalName(item.name);
  const className = norm(item.className);

  return seeds.find(
    (seed) =>
      canonicalName(seed.name) === name &&
      (!className || !seed.className || norm(seed.className) === className),
  );
}

export function sameServant(a, b) {
  return (
    canonicalName(a.name) === canonicalName(b.name) &&
    norm(a.className) === norm(b.className)
  );
}

function displayClass(name) {
  return String(name || "Extra")
    .split(" ")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}
export function normalizeServant(item) {
  const seed = findSeed(item, servantSeeds);
  return {
    id: String(item.collectionNo || item.id),
    name: item.name || seed?.name || "Unknown Servant",
    className: displayClass(item.className || seed?.className),
    rarity: item.rarity ?? seed?.rarity ?? 3,
    cost: item.cost ?? costFor(item.rarity ?? seed?.rarity ?? 3),
    face: item.face || item.extraAssets?.faces?.ascension?.[1] || null,
    card: seed?.card || "Unknown",
    role: seed?.role || "flex",
    tags: seed?.tags || [],
    seed: false,
  };
}
export function normalizeCE(item) {
  const seed = findSeed(item, ceSeeds);
  return {
    id: String(item.collectionNo || item.id),
    name: item.name || seed?.name || "Unknown CE",
    rarity: item.rarity ?? seed?.rarity ?? 3,
    cost: item.cost ?? costFor(item.rarity ?? seed?.rarity ?? 3),
    face: item.face || null,
    tags: seed?.tags || [],
    seed: false,
  };
}
export async function loadCatalog(region) {
  const suffix = region === "JP" ? "_lang_en" : "";
  const [servants, ces] = await Promise.all([
    fetch(
      `https://api.atlasacademy.io/export/${region}/basic_servant${suffix}.json`,
    ).then(check),
    fetch(
      `https://api.atlasacademy.io/export/${region}/basic_equip${suffix}.json`,
    ).then(check),
  ]);
  return {
    servants: servants
      .filter((x) => x.collectionNo > 0 && x.type !== "enemyCollectionDetail")
      .map(normalizeServant),
    ces: ces.filter((x) => x.collectionNo > 0).map(normalizeCE),
    live: true,
  };
}
function check(response) {
  if (!response.ok)
    throw new Error(`Catalog request failed: ${response.status}`);
  return response.json();
}
