# @terapevti4no/ui

Shared React components, CSS and brand assets for [terapevti4no](https://github.com/terapevti4no/terapevti4no.github.io) and [EMDR Dot](https://github.com/terapevti4no/emdrdot).

## Install

The package is distributed as a normal npm archive in GitHub Releases; an npm registry account or npm authentication is not required:

```sh
npm install --save-exact @terapevti4no/ui@https://github.com/terapevti4no/ui/releases/download/v0.2.1/terapevti4no-ui-0.2.1.tgz
```

React is a peer dependency, so the package shares the application's React instance. Commit both `package.json` and `package-lock.json`. There is no vendor directory and no runtime request to GitHub: Vite bundles the installed package into the site.

## Components

- `BrandLogo`: localized parent brand linked to the home page.
- `ToolLogo`: EMDR Dot and Breaze wordmarks; only EMDR Dot uses the three dots.
- `Header`, `ThemeToggle`, `LanguageSwitch`: shared controls and optional parent/tool branding.
- `PageIntro`: eyebrow, title, description; no decorative divider or dots.
- `Container`: responsive, narrow or wide content width.
- `PageLayout`: header, main content container and optional footer.
- `InfoNote`, `Footer`, `Icon`: common informational text, footer and icons.

```tsx
import { PageLayout, PageIntro, InfoNote, Footer, usePreferences } from '@terapevti4no/ui';
import '@terapevti4no/ui/styles.css';

function Page() {
  const { lang, setLang, theme, setTheme } = usePreferences({
    storageKey: 'my-tool:v1', fallbackKeys: ['terapevti4no:v1'],
  });
  return <PageLayout lang={lang} theme={theme}
    onLanguageChange={setLang} onThemeChange={setTheme}
    homeHref="https://terapevti4no.github.io/"
    footer={<Footer brand="MY TOOL">Footer text</Footer>}>
    <PageIntro eyebrow="AT YOUR OWN PACE" title="Practice" description="Choose your settings." />
    <InfoNote>Information about this tool.</InfoNote>
  </PageLayout>;
}
```

Pass `tool="emdrdot"` or `tool="breaze"` to `PageLayout`. App-specific catalog cards, timer controls, translations and practice behavior belong to their applications.

## Vite integration

Use `resolve: { dedupe: ['react', 'react-dom'] }` and `optimizeDeps: { exclude: ['@terapevti4no/ui'] }`. Excluding the library from dependency prebundling preserves its asset-relative SVG URLs during development; production builds emit the shared logo as a normal asset.

Import `preferenceBootstrap` from `@terapevti4no/ui/preferences` in `vite.config.ts` and inject its return value as a head script through `transformIndexHtml`. Both existing sites demonstrate this setup. It applies saved theme/language before first paint. `usePreferences` reads the same legacy storage records and merges its fields when saving, preserving tool-specific settings. Storage failures do not block the UI. The package also exports `faviconUrl` for the application's icon link.

## Develop and release

Requires Node 22+ (CI uses Node 24):

```sh
npm ci
npm run check
npm pack
```

`check` compiles JavaScript and TypeScript declarations, generates/checks the favicon, and runs component, preferences and updater tests. For a local preview, install the resulting `.tgz` in a consumer; replace that temporary file dependency with the published URL before committing the consumer.

1. Change components, styles or assets. A normal push automatically increments the patch version if the current version is already released. For an intentional larger version, use `npm version minor --no-git-tag-version`; the version hook aligns the stylesheet comment.
2. Run `npm run check` and check both sites in both languages/themes and on mobile.
3. Commit and push to `main`. The workflow builds/tests the package and automatically creates tag/release `vX.Y.Z` with `terapevti4no-ui-X.Y.Z.tgz`. An existing release is never overwritten. The workflow records any automatic version bump in a bot commit before publishing the new release. Bot commits do not trigger an endless release loop.
4. Consumer workflows check for stable releases four times an hour, install a newer package, run their checks/build, commit the verified lockfile update, then deploy in the same workflow. GitHub may delay scheduled runs. No cross-repository secret or personal token is required.

For an immediate update, run the consumer's **Build and deploy** workflow manually. To stop scheduled updates, set the consumer repository variable `UI_AUTO_UPDATE=false`. Pushes and manual runs still build/deploy normally. To hold a rollback, disable scheduled updates and use an explicit earlier compatible version.

## Consumer commands

The package installs the `terapevti4no-ui` CLI. Consumers expose it through `ui:update` and `ui:check`:

```sh
npm run ui:check
npm run ui:update -- --latest
npm run ui:update -- --version 0.2.1
```

The updater accepts only stable releases from this repository and the expected npm asset URL. npm records archive integrity in `package-lock.json`. Automatic updates do not downgrade a pinned newer version. Local updates are not committed automatically; CI commits only after successful validation.

## Brand source

Edit `assets/terapevti4no.svg`. `npm run build:assets` derives the favicon from that same source. Do not duplicate the SVG paths in applications or edit the generated favicon by hand. Releases before 0.2.0 were CSS-only and cannot replace the React package.
