# How we built the Graft style guide

A plain account of how this style guide and its explorer came together, and how the styles get chosen, so the approach can be repeated later.

## The idea

A style guide has two parts:

- **Design tokens.** Every colour, size, font, corner radius, shadow and animation time gets a name, such as `--color-accent` or `--radius-md`. Code uses the name, never the raw value, so changing a value in one place changes it everywhere.
- **Rules.** Written guidance on which token to use when, how controls behave and what to avoid.

We keep the tokens in `graft.css` as CSS variables and the rules in `style-guide.md`. CSS was chosen over a JSON token file because any web page can use it straight away, with no build step and no extra tools.

Tokens come in two layers:

- **Raw palette tokens** hold the actual values, such as `--gray-500` or `--violet-600`.
- **Role tokens** say what a value is for, such as `--color-panel` or `--color-text-muted`, and point at a raw palette token. Components only ever use role tokens.

Every role token has a light and a dark value. A page or a single panel switches theme by setting `data-theme="light"` or `data-theme="dark"`.

## Setting up

1. Created this repo with a `README.md`, a `process.md` that lays out the steps and a `CLAUDE.md` holding the rules Claude follows here.
2. Created a private GitHub repo, `graft-style-guide`.
3. Agreed that the first choices of colour and style come only from your intent and your picks. Claude does not look at the Graft mockup or at Graft itself until you ask, so the new style is not shaped by the old one.

## The style explorer

To judge styles you have to see them, so we built a small web app, the style explorer, in `src/`.

- **Same tools as Graft.** A subagent read Graft's frontend setup without looking at any of its styling, you checked the list, and the explorer copies it: Bun, TypeScript, Vite, React, MUI, Tailwind, TanStack Router and Font Awesome, at the same versions.
- **One page per component.** A sidebar search finds a component and opens its page. The page is in the URL, as in `/page/button`.
- **An overview page** shows every token with a small example of its use.
- **Two switches.** "Components" shows examples in light, dark or dark next to light. "Explorer" sets the explorer's own frame to light or dark. Both go in the URL.
- **A sidebar that minimises.** A button at the top of the sidebar hides it and gives the examples the full width. A small button left floating in the top-left corner brings it back. The first version left an empty strip down the side, which was wasted space. This is in the URL too.
- **Live reload.** Editing `graft.css` updates the open page straight away.
- **An about popup**, opened from an info button in the top-right corner, links to Graft on GitHub and the YouTube channel. It is sized to its text and centred on the page.

How components are styled, in order of preference:

1. MUI components, styled the way MUI supports: the theme's `styleOverrides`, `variants` and `defaultProps`, all pointing at the CSS variables.
2. Tailwind classes, where MUI's way cannot do it.
3. Plain CSS, where Tailwind cannot do it.

A component MUI does not have is built in React and HTML with Tailwind, and a component made of other components follows the same order for each part.

## Testing

- **Playwright end-to-end tests** open the explorer in Chrome and check it like a person would: finding pages, the switches, the dialog, the choices page and that colours come from the right tokens.
- **what-changed** remembers which checks have passed against which files, so a run only repeats the checks a change affects.
- **A pre-commit hook** runs the type check and the tests before every commit and refuses the commit if they fail. Each clone installs it once with `./scripts/install-hooks.sh`.
- **A GitHub Actions workflow** runs the same checks on every push. When a run fails, it keeps the logs and Playwright's screenshots for reading.

## Publishing

`bun run build` writes the explorer as a static site into `docs/`, which is committed. GitHub Pages serves that folder from the `main` branch, so the site needs no server. Built files get a fingerprint in their names, so visitors always load the newest version after a deployment. The site also serves `graft.css` on its own for any web page to link.

## Problems we hit and how they were solved

- **MUI styles losing to Tailwind.** MUI put its styles at the top of the page, below Tailwind's base styles, so buttons showed with no colour. Declaring the order of the style layers through MUI fixed it. A test caught this one.
- **A flash from light to dark on refresh.** The page drew in light first, then switched once the app loaded. A tiny script in `index.html` now sets the theme before anything is drawn.
- **"This page isn't working" after config changes.** Vite restarted itself inside the same process and the open browser stayed connected to the old, closed server. The fix is to fully restart the dev server after any change to `vite.config.ts`.
- **A blank page after moving a file.** A shared component was moved to a new folder. The running dev server kept serving an old copy of the page that pointed at the old location, so the page came up blank however often it was refreshed. The tests passed because they start their own fresh server. Restarting the dev server fixed it, and Claude now restarts it and checks the open pages after moving or renaming a file.
- **Floating buttons jumping sideways.** The info button moved between pages and when the about popup opened, because the scrollbar came and went: short pages have none, and MUI removes it while a popup is open. Every page now keeps room for the scrollbar, and the about popup leaves the scrollbar in place. The tests missed it at first because Playwright hides scrollbars in headless Chrome, so they now run with scrollbars shown.
- **The page reloading for no reason.** Tailwind was scanning the whole repo, including the built site and the docs, so every build reloaded the page. It now scans only `src/`.
- **Node.js.** The tools start with Node.js by default. Since `bun --bun` is not used here, the scripts start each tool by handing its file to Bun, and the project needs only Bun.

## Choosing the styles

1. **Intent.** You described how Graft should feel, Claude offered five sentences and you combined three. The result is the intent in `style-guide.md`. Every later choice is checked against it.
2. **The choices page.** Each open choice gets a section with three options. Every option is drawn on the same small Graft screen (a header with the branch and a button, a commit list with graph lanes, a diff and a status bar), in light and dark, so you judge it in use and not as swatches.
3. **Contrast.** Before options are shown, Claude works out the contrast of each colour against its background and fixes any that fall short of the accessibility standard (4.5 to 1 for text and 3 to 1 for graphics).
4. **One at a time.** Claude walks through the choices one by one: what each option is, what to look at and how it fits the intent. You pick a letter. Claude writes the pick into `graft.css`, ticks it off in `todo.md` and removes that section from the choices page.
5. **When it is hard to tell.** If options look the same, say so. Claude explains what differs, and you can ask Claude to pick. That is how the grey ramp was settled.

Picks so far:

- **Grey ramp:** Neutral, plain greys with no tint. Claude picked it because the options looked alike and it fits "minimal" best.
- **Accent colour:** Violet.
- **Status colours:** Classic, clear saturated colours that are easy to tell apart. This added an `info` colour for states such as fetching.
- **Git colours:** Green and red for added and removed lines, amber for conflicts and a balanced set of six graph lane colours.
- **Fonts:** Mona Sans for the interface and Monaspace Neon for code. You asked for fonts close to GitHub so Graft feels familiar, so the options were GitHub's own system font list, GitHub's open-source Mona Sans and Monaspace Neon, and Noto Sans, the font GitHub shows on Linux. The chosen fonts ship with the explorer as packages (`@fontsource/mona-sans` and `@fontsource/monaspace-neon`), so they look the same on every computer. A Fonts page in the explorer shows both in use, with every size and weight and the characters that are easy to mix up in hashes.

With these picks made, the choices page is empty until the next set of choices is ready.

The rest of the work, in order, is in `todo.md`.

## Picking it up again

- Open this folder in Claude Code. Claude starts the dev server and opens the explorer in Chrome.
- Ask for "the next items on the todo list" to see where things stand.
- Ask Claude to walk you through the next choice, one at a time.
