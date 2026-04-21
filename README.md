# ET7 — Weekly Irrigation Estimation Tool

A mobile-first progressive web app (PWA) for estimating weekly evapotranspiration (ET) and irrigation requirements across Kansas counties. Built for field use by farmers and agronomists.

---

## Overview

ET7 displays the typical cumulative reference evapotranspiration (ET₀) for the preceding 7 days for any day of the year, organized as a month × day heatmap. Users select their crop, planting date, soil water status, and observed rainfall to compute estimated crop ET (ETc) and a weekly irrigation recommendation — all from a single screen that works offline.

The name **ET7** reflects the tool's core metric: 7-day cumulative ET, the natural accounting window for weekly irrigation scheduling.

---

## Features

- **County-level ET₀ table** — 12-month × 31-day heatmap (magma colormap) showing typical cumulative weekly ET₀ for any day of year. Today's cell is highlighted automatically.
- **5-card workflow** — Reference ET → Crop Coefficient → Crop ET → Rainfall (user input) → Estimated Irrigation, displayed as a clear left-to-right calculation chain.
- **Crop Kcb curve** — Interactive SVG curve showing the basal crop coefficient (Kcb) through the growing season, with phenological stage annotations. Drag the handle to any point on the curve to adjust Kcb, or type a value directly.
- **Plant available water (PAW) selector** — Six color-coded buttons spanning wilting point to field capacity (Ks = 0.0 → 1.0) to capture water stress effects on ETc.
- **Season modifier** — ❄ Cooler / ⛅ Typical / ☀ Warmer buttons apply a ±10% adjustment to all ET values to account for year-to-year climate variability.
- **Weekly ET trend chart** — Plotly line chart showing median ET₀ and 25th–75th percentile band across the 52-week calendar year, with today's week marked.
- **Unit toggle** — Switch between inches (2 decimal places) and millimeters (1 decimal place) throughout the entire app.
- **Dark / light theme** — Toggle optimized for both indoor and outdoor (bright sunlight) conditions.
- **Persistent settings** — All user inputs (county, crop, planting date, rainfall, Kcb position, stress level, season, units) are saved automatically to `localStorage` and restored on next visit.
- **Multi-state support** — State and county dropdowns driven by JSON data files; adding a new state requires only a new data file and one line in the `STATES` config object.
- **PWA / offline capable** — Installable to home screen on iOS and Android. Works without cell signal after first load.

---

## Repository Structure

```
/
├── index.html          # Main application (single-file app)
├── manifest.json       # PWA web manifest
├── sw.js               # Service worker (offline caching)
├── ks_data.json        # Kansas county ET₀ climate data
├── icons/
│   ├── icon-192.png    # PWA icon (required)
│   └── icon-512.png    # PWA icon (required)
└── README.md
```

Optional future files:
```
├── ne_data.json        # Nebraska (when available)
├── co_data.json        # Colorado (when available)
└── crop_stages.json    # External crop stage definitions (see below)
```

---

## Data Files

### County ET₀ data — `ks_data.json`

Generated from [GRIDMET](https://www.climatologylab.org/gridmet.html) using the ASCE Penman-Monteith standardized equation for short reference crop ET. Values are stored in **mm/week**.

```json
{
  "counties": {
    "Allen": {
      "daily": [8.0, 8.5, 7.9, ...],
      "weekly_med": [8.9, 8.7, ...],
      "weekly_q25": [7.8, 7.5, ...],
      "weekly_q75": [10.2, 9.9, ...]
    }
  }
}
```

| Field | Length | Description |
|---|---|---|
| `daily` | 365 | ET₀ (mm/week) for DOY 1–365. Feb 29 omitted. |
| `weekly_med` | 52 | Median weekly ET₀. Week 53 omitted. |
| `weekly_q25` | 52 | 25th percentile weekly ET₀. |
| `weekly_q75` | 52 | 75th percentile weekly ET₀. |

The app converts mm → inches internally at load time. All downstream calculations use inches as the internal unit.

**Generating data with Python:**

```python
import json
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.float32, np.float64)):
            return float(obj)
        return super().default(obj)

data = {
    "counties": {
        "Allen": {
            "daily":      daily_array.tolist(),     # shape (365,), mm/week
            "weekly_med": weekly_med.tolist(),       # shape (52,),  mm/week
            "weekly_q25": weekly_q25.tolist(),
            "weekly_q75": weekly_q75.tolist(),
        }
    }
}

with open("ks_data.json", "w") as f:
    json.dump(data, f, cls=NumpyEncoder)
```

### Crop stage data — embedded in `index.html`

Crop definitions are currently embedded in the JS `CROPS` object. Each crop entry defines the Kcb curve and phenological stage annotations in a single unified structure:

```json
{
  "corn_full": {
    "name": "Corn — Full season",
    "description": "~110–120 day relative maturity · typical Kansas",
    "dateLabel": "Planting Date",
    "defaultDate": "04-01",
    "stages": [
      { "dap": 0,   "label": "VE",  "kcb": 0.15 },
      { "dap": 12,  "label": "V3",  "kcb": 0.15 },
      { "dap": 65,  "label": "VT",  "kcb": 1.10 },
      { "dap": 72,  "label": "R1",  "kcb": 1.15 },
      { "dap": 165, "label": "Mat.","kcb": 0.15 }
    ]
  }
}
```

Each `stages` entry serves dual purpose: the `[dap, kcb]` pairs define the Kcb interpolation curve, and the `label` is rendered as an annotated vertical line on the crop coefficient chart. The season length (`totalDays`) is inferred from the last stage's `dap`.

To migrate to an external file, save the structure above as `crop_stages.json` and add to `init()`:

```javascript
const cropData = await fetch('crop_stages.json').then(r => r.json());
Object.assign(CROPS, cropData);
```

---

## Supported Crops

| Key | Name | Default Planting | Season Length |
|---|---|---|---|
| `corn_full` | Corn — Full season | April 1 | 165 days |
| `corn_early` | Corn — Early season | April 15 | 125 days |
| `soybean` | Soybean | April 15 | 155 days |
| `winterWheat` | Winter Wheat | October 15 | 262 days |
| `sorghum` | Grain Sorghum | May 1 | 140 days |
| `sunflower` | Sunflower | May 1 | 130 days |

Kcb values follow FAO-56 guidelines adapted for typical Kansas conditions.

---

## Adding a New State

1. Generate a `{state}_data.json` file in the same format as `ks_data.json`.
2. Place it in the root directory alongside `index.html`.
3. Add one line to the `STATES` object in `index.html`:

```javascript
const STATES = {
  KS: { label: 'Kansas',   file: 'ks_data.json' },
  NE: { label: 'Nebraska', file: 'ne_data.json' }, // ← add this
};
```

4. Add a corresponding `<option>` to the state selector in the HTML:

```html
<select class="ctrl" id="state-sel" onchange="onStateChange()">
  <option value="KS" selected>Kansas</option>
  <option value="NE">Nebraska</option>
</select>
```

The county dropdown will populate automatically from the JSON keys when the user selects that state.

---

## ET Calculation Method

### Reference ET₀

Tabular values from GRIDMET represent the typical (median) cumulative ET₀ for the 7 days preceding any given day of year, for each Kansas county centroid. Values follow the ASCE Penman-Monteith equation for a short (grass) reference crop.

A season modifier scales all ET₀ values:

| Setting | Multiplier |
|---|---|
| ❄ Cooler | × 0.90 |
| ⛅ Typical | × 1.00 |
| ☀ Warmer | × 1.10 |

### Crop ET (ETc)

```
ETc = ET₀ × Kc
Kc  = Kcb × Ks
```

**Kcb** (basal crop coefficient) is interpolated linearly from the crop's stage–Kcb curve at the user's current position in the season (days after planting). The user can drag the handle or type a value to override.

**Ks** (water stress coefficient) is determined by the selected plant available water (PAW) level:

| PAW level | Ks |
|---|---|
| Wilting Point (0%) | 0.00 |
| 10% | 0.20 |
| 20% | 0.40 |
| 30% | 0.60 |
| 40% | 0.80 |
| ≥ 50% (Well Watered) | 1.00 |

### Estimated Irrigation

```
Irrigation = max(0, ETc − Rainfall)
```

where Rainfall is the user-entered 7-day observed precipitation total.

---

## Progressive Web App (PWA)

ET7 is installable as a PWA on iOS (Safari → Share → Add to Home Screen) and Android (Chrome → ⋮ → Add to Home Screen).

### Caching strategy (`sw.js`)

| Resource type | Strategy |
|---|---|
| App shell (HTML, fonts, Plotly) | Cache-first, update in background |
| Data files (`*_data.json`) | Network-first, fall back to cached version |

After one online visit, the app is fully functional offline. County data is served from cache when no network is available.

### Updating the cache

Bump the version constant in `sw.js` whenever you deploy changes:

```javascript
const CACHE_NAME = 'et7-v2'; // was v1
const DATA_CACHE = 'et7-data-v2';
```

Old caches are deleted automatically on the next activation.

### Required icons

Create an `icons/` folder with:

- `icon-192.png` — 192×192 px
- `icon-512.png` — 512×512 px

These can be generated from any image using [realfavicongenerator.net](https://realfavicongenerator.net) or a similar tool.

---

## Local Development

The app requires an HTTP server (not `file://`) for the service worker and JSON fetches to work.

```bash
# Python (simplest)
python -m http.server 8080

# Node.js
npx serve .

# Then open:
# http://localhost:8080
```

---

## Citation

**Climate data:** Abatzoglou, J.T. (2013). Development of gridded surface meteorological data for ecological applications and modelling. *International Journal of Climatology*, 33(1), 121–131. https://doi.org/10.1002/joc.3413

**Crop coefficients:** Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). *Crop evapotranspiration: Guidelines for computing crop water requirements*. FAO Irrigation and Drainage Paper 56. FAO, Rome.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

Developed by the **Soil Water Processes Lab**, Department of Agronomy, Kansas State University.
