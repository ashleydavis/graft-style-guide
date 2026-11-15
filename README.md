# Graft style guide

The visual style of Graft, the Git client: design tokens as CSS variables and the rules for using them. Every style has a light and a dark version.

Live style explorer: https://ashleydavis.github.io/graft-style-guide/

- `graft.css`: every colour, size, font, radius, shadow and timing value as a CSS variable, with light values on `:root` and dark values under `[data-theme="dark"]`.
- `style-guide.md`: the design intent and the rules for which token to use when.
- `areas/`: rules for one area of the app, such as the diff view, that take priority over `style-guide.md` there.
- `src/`: the style explorer, a web app that shows every token on an overview page and each component on its own page, in both themes.
- [process.md](process.md): how the style guide is made.
- [how-we-built-it.md](how-we-built-it.md): a plain account of how the style guide and explorer were built and how the styles are chosen.

## Running the style explorer

```bash
bun install
bun run dev
```

Open http://localhost:5199/. Search for a component in the sidebar and choose it. The page shown is in the URL, as in `/page/button`. Two switches at the bottom of the sidebar set how the page looks, and both settings go in the URL:

- **Components** shows the examples in the light theme, the dark theme or dark next to light, as in `?components=dark`. A URL without it shows dark next to light.
- **Explorer** sets the theme of the explorer's own sidebar, headings and background to light or dark, as in `?explorer=dark`. A URL without it shows light. The page reloads its styles when `graft.css` changes.

The button at the top of the sidebar hides it and gives the page the full width, and the button left in the top-left corner restores it. This also goes in the URL, as in `?sidebar=minimised`.

On a screen narrower than 1024 pixels, such as a phone or an upright tablet, the sidebar starts closed. The menu button in the top-left corner opens it as a drawer over the page, and choosing a page closes it.

## Publishing on GitHub Pages

```bash
bun run build
```

Each build deletes `docs/` and writes the static site to it fresh, and the built files are committed. GitHub Pages publishes it from the `main` branch's `docs/` folder at https://ashleydavis.github.io/graft-style-guide/. The site also serves the tokens on their own at `graft.css`.

The built JavaScript and CSS files have a hash of their content in their names. A new deployment's `index.html` points at the new names, so browsers fetch the new files instead of using cached ones.

Setting up GitHub Pages, once:

1. On GitHub, open the repo's Settings, then Pages.
2. Under "Build and deployment", set Source to "Deploy from a branch".
3. Set the branch to `main` and the folder to `/docs`, then Save.

GitHub Pages for a private repo needs a paid GitHub plan.

Deploying a new version:

1. Run `bun run build`.
2. Commit the changes in `docs/` with the source changes and push to `main`. GitHub Pages publishes the push within a few minutes.

To check the built site before committing it:

```bash
bun node_modules/vite/bin/vite.js preview --outDir docs
```

## Testing

```bash
bun run test:e2e
```

The Playwright end-to-end tests start their own dev server on a free port and run in the Chrome installed on the machine. `src/test/e2e/explorer.test.ts` runs at desktop size. `src/test/e2e/mobile.test.ts` runs as a touch phone 390 by 844 pixels, once upright and once on its side, and checks that every page fits the screen width, the sidebar drawer, the floating buttons and the popups.

```bash
./scripts/test-everything.sh
```

Runs the type check and the end-to-end tests when their files changed since they last passed, using [what-changed](https://github.com/ashleydavis/what-changed). `what-changed.yaml` lists the checks and the files each one watches.

GitHub Actions runs the same script on every push and pull request (`.github/workflows/test.yml`). After a failed run, the logs and Playwright's screenshots and traces are attached to the run as the `test-output` artifact.

## Pre-commit hook

```bash
./scripts/install-hooks.sh
```

Run this once per clone. It installs `.githooks/pre-commit`, which runs `./scripts/test-everything.sh` before every commit and refuses the commit when a check fails.

## Using it in a web page

Link the stylesheet and use the variables:

```html
<link rel="stylesheet" href="graft.css">
```

```css
.panel {
  background: var(--color-panel);
  color: var(--color-text);
}
```

Set `data-theme="dark"` on the `html` element for the dark theme.

`graft.css` names the fonts Mona Sans and Monaspace Neon. A page loads them itself, for example from the `@fontsource/mona-sans` and `@fontsource/monaspace-neon` packages, as the explorer does in `src/main.tsx`.
