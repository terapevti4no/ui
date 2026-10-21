# @terapevti4no/ui

Shared CSS for the [tool directory](https://github.com/terapevti4no/terapevti4no.github.io) and [EMDR Dot](https://github.com/terapevti4no/emdrdot). No framework or CSS build step is required.

## Shared components

Manrope font, light/dark tokens, base styles, header, language/theme controls, wordmarks, intro, responsive main layout (`ui-main`), card surface and padding (`ui-card`), notes (`ui-note`), footer and safe-area spacing. Tool-specific layouts, timer controls, content and behavior stay in the applications.

Load `styles/ui.css` before application CSS. Set `data-theme="light"` or `data-theme="dark"` on the document root. The EMDR wordmark uses `.brand`, a `.brand-mark` containing three `i` elements, followed by `emdr` and a `.brand-dot` containing `dot`.

## Update a project from GitHub

Each consumer includes `scripts/update-ui.mjs`. From that project's root, with Node 22 or newer:

```sh
node scripts/update-ui.mjs --version 0.1.1
node scripts/update-ui.mjs --check --version 0.1.1
```

No sibling UI checkout or npm install is needed. The updater resolves `terapevti4no/ui` tag `v0.1.1` to a commit and downloads the package metadata, CSS and declared SVG assets from that exact commit. It validates the package name/version before writing `vendor/terapevti4no-ui/ui.css` and `version.json`. The manifest records the repository, version, tag, commit and SHA-256 checksums for the CSS and SVG assets. `--check` verifies the copy against GitHub without modifying files. An unavailable release or mismatched package fails before writing files. GitHub's unauthenticated API rate limits apply.

Keep the vendor directory in Git; do not edit it directly. Sites serve this local copy, so they build and run without contacting the UI repository. Only the explicit updater needs GitHub access. Commit consumer updates after checking the result.

From this UI checkout, update both projects in one command:

```sh
node scripts/update-ui.mjs --version 0.1.1 ../terapevti4no.github.io ../emdrdot
```

## Develop and release

1. Edit `styles/ui.css`, bump `package.json` version and the stylesheet version comment.
2. Preview by copying the stylesheet into each local project's vendor directory. These are temporary development copies; the updater will restore release provenance after publication.
3. Run `npm test` in this repository. Check both sites in Russian/English, light/dark themes and desktop/mobile layouts; run `npm test` and `npm run build` in EMDR Dot.
4. Commit the UI changes, create tag `vX.Y.Z` and push the commit and tag. Published version tags must never be moved; corrections get a new version.
5. Run each consumer's updater with the new exact version, review the CSS and manifest changes, then commit and push the consumer updates.

To roll back, run the updater with an earlier published version, check both sites and commit the resulting vendor files. `0.x` releases are provisional: review the CSS diff before updating.

## Tests

```sh
npm test
```

Uses Node's built-in test runner; no dependencies or network requests. Covers pinned-commit downloads, vendor drift detection, invalid versions, unavailable tags, mismatched package metadata and destination validation.

## Brand artwork

Edit the source symbol only in `assets/terapevti4no.svg`. Both applications reference its `#mark` symbol through an external SVG `use`, so `currentColor` follows the selected theme. `assets/terapevti4no-favicon.svg` is generated from that source with the favicon background and colors; do not edit it by hand.

```sh
npm run build:assets
npm run check
```

`package.json` declares `uiAssets`; the updater downloads them alongside the stylesheet and checks their hashes. Logo consumers need UI 0.1.1 or newer. Example static header:

```html
<svg class="brand-mark" width="34" height="34" viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <use href="./vendor/terapevti4no-ui/assets/terapevti4no.svg#mark" />
</svg>
```

Vite consumers use an external asset URL with `?no-inline` so the SVG fragment remains addressable in production.
