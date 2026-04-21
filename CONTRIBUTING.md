# Contributing to ET7

Thank you for your interest in contributing. ET7 is a practical field tool — contributions that improve clarity, accuracy, or usability for farmers and agronomists are especially welcome.

## Ways to contribute

- **New state data** — Generate a `{state}_data.json` file from GRIDMET and open a pull request. See the README for the required format.
- **New or corrected crop stages** — The `CROPS` object in `index.html` contains Kcb curves and phenological stage annotations. Corrections grounded in peer-reviewed sources are welcome.
- **Bug reports** — Open an issue with browser/OS version, a description of what happened, and what you expected.
- **UI improvements** — This is a mobile-first field tool. Any change that makes it faster or clearer to use with gloves on is worth discussing.

## What we are not looking for right now

- Feature additions that increase the number of taps required for the primary use case (checking today's ET).
- Dependencies on external APIs or third-party services that would break offline functionality.
- Frameworks or build toolchains — the single-file approach is intentional for simplicity of deployment.

## Data standards

All climate data must:
- Derive from GRIDMET or an equivalent peer-reviewed gridded dataset.
- Use the ASCE Penman-Monteith equation for short reference crop ET.
- Be stored in mm/week as 365-value daily arrays (Feb 29 omitted, week 53 omitted).

All Kcb values must cite a peer-reviewed source (FAO-56 or equivalent).

## Code style

- Vanilla HTML/CSS/JS — no build step, no framework.
- Keep the single-file structure for `index.html`.
- Variable and function names should be self-documenting; avoid abbreviations not already established in the codebase.
- Test locally with `python -m http.server` before submitting — service workers require HTTP.

## Pull request checklist

- [ ] Tested in Chrome and Safari on mobile viewport (375px wide)
- [ ] Tested offline after first load (disable network in DevTools)
- [ ] No new external dependencies added
- [ ] If adding crop data: source cited in PR description
- [ ] If adding state data: JSON structure validated against README schema
