# Chaldea Party Lab

An unofficial Fate/Grand Order party suggester. Pick up to three core Servants, record the Servants and Craft Essences you own, then generate ranked parties for farming, bosses, survival, or a balanced plan. You can set an enemy class, party cost limit, and optional friend support slot.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```powershell
npm start
```

Open http://localhost:4173. The app saves collection choices in browser local storage, separately for NA and JP.

## Data and scoring

The app loads current basic Servant and Craft Essence catalogs from [Atlas Academy](https://api.atlasacademy.io). If that connection is unavailable, a small sample catalog remains usable. Atlas Academy supplies names, classes, rarity, cost, and portraits. Role, card focus, and CE effect tags are curated for a limited set of familiar units; other catalog entries remain selectable but receive a neutral role score. The ranking uses those tags, class advantage, plan choice, CE fit, and the specified party cost. It is a planning aid, **not** a damage calculator or a proof of optimality. The full effects of skills, NP refund, append skills, enemy traits, and CE level are not modeled.

Friend support permits one unowned frontline Servant. Owned CE copies are assigned at most once per party. The backline fills from owned Servants when available; empty slots remain if fewer than six total eligible Servants are available.

## Reading the code

Start with `src/app.js`. Its `state` object holds the current choices. `save()` and `loadSaved()` handle browser storage, the `render...()` functions update the screen, and `switchRegion()` loads the catalog.

`src/data.js` loads and cleans up Atlas Academy records. The small `servantSeeds` and `ceSeeds` lists provide the offline sample and curated synergy tags.

`src/engine.js` contains the recommendation rules. `roleScore()` rates individual Servants for the battle plan, `scoreFront()` rates frontline combinations, `assignCEs()` uses owned CE copies under the cost limit, and `suggest()` returns the three highest scoring lineups. You can adjust the numeric weights in those functions if you want to tune recommendations.

`src/style.css` controls the look of the page. `test/engine.test.js` checks the key ownership and cost rules; run it with `npm test`.

For a full walkthrough, including a worked score calculation and interview questions, read [the interview guide](docs/INTERVIEW_GUIDE.md).
