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
- **Phones.** On a screen narrower than 1024 pixels the sidebar becomes a drawer that slides over the page from a menu button and closes when you choose a page. The panels stack, and the page title moves over to clear the menu button while the rest of the page uses the full width.
- **Live reload.** Editing `graft.css` updates the open page straight away.
- **An about popup**, opened from an info button in the top-right corner, links to Graft on GitHub and the YouTube channel. It is sized to its text and centred on the page.

How components are styled, in order of preference:

1. MUI components, styled the way MUI supports: the theme's `styleOverrides`, `variants` and `defaultProps`, all pointing at the CSS variables.
2. Tailwind classes, where MUI's way cannot do it.
3. Plain CSS, where Tailwind cannot do it.

A component MUI does not have is built in React and HTML with Tailwind, and a component made of other components follows the same order for each part.

## Testing

- **Playwright end-to-end tests** open the explorer in Chrome and check it like a person would: finding pages, the switches, the dialog, the choices page and that colours come from the right tokens. A second set runs as a phone held upright and on its side, and checks that every page fits the screen with no sideways scrolling and that the drawer, buttons and popups work by touch.
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
- **Enter reopening the drawer on a phone.** Pressing Enter in the drawer's search box opened the page and closed the drawer. The browser then moved focus back to the menu button, and the rest of the same key press pressed that button and opened the drawer again. The search box now ends the key press once it has used it.
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

- **Type scale:** Familiar, GitHub's sizes with 14px body text, weights of 400, 500 and 600, and line heights of 1.25 for headings and single lines and 1.5 for running text.
- **Spacing:** Standard, steps of 4px (4, 8, 12, 16, 24 and 32).
- **Corner radius:** Crisp, 2px, 4px and 6px, nearly square and tool-like.
- **Shadows:** Lifted, a clear shadow under raised things and a deep one under menus, much darker in the dark theme so it still shows.
- **Animation:** Smooth, 150ms, 250ms and 400ms, easing in and out.

That round was the first to choose sizes and timing instead of colours. Those values are the same in both themes, apart from shadows. To judge them, the small Graft screen gained a commit menu that opens and closes (showing the shadow and the timing), a highlight on commit rows under the pointer and a description under the selected commit (showing the line height). The type choice added two tokens, `--leading-tight` and `--leading-normal`, and the MUI buttons now take their padding and line height from the tokens, so the options changed them too.

With the spacing pick you pointed out breaks in the graph lines between commit rows. Each row drew its lanes at a fixed height shorter than the row. The lanes now run the full height of every row, so the lines join up.

To see the lanes outside the Choices page, a Commit graph page shows them in the shapes a history takes: a straight history, a feature branch merged back, a branch not merged yet, two branches at once and all six lane colours side by side. Each lane is drawn on a canvas that stretches to the row's height, so lines always meet the rows above and below, with curves where a branch starts or merges. A test checks that every lane runs without a gap.

With every open choice made, the Choices page leaves the sidebar. It returns as soon as the next set of choices is added.

The next round covers icon sizes, the focus ring and the hover, selected and disabled colours. New tokens for them went into `graft.css` with values matching what the explorer already drew, and the MUI theme now uses them, so a pick changes every button, text box and row at once. The small Graft screen gained what each choice needs to be judged: a branch icon and a Fetch icon, a Filter commits box, a disabled menu item, and a focus ring drawn on the Fetch button for the focus choice.

Running the contrast check on graft.css before showing these options found two failures already in place: muted text, such as commit hashes, at 4.4 to 1 on hover and selected rows in light (text needs 4.5 to 1), and the borders of text boxes and outlined buttons at 1.2 to 1 (a control's edge needs 3 to 1). Rather than change your earlier picks quietly, each became a choice of its own: three darker muted greys for light, and a new `--color-border-control` token in three strengths, which keeps the soft border for dividers. Every option in the round passes. Once these are picked, the contrast ratios of every text and control colour get recorded.

A test now checks that every role token has a light and a dark value, which ticks off that todo item.

From that round:

- **Icon sizes:** Matched, 12px, 14px and 18px, each icon the size of the text beside it.
- **Focus ring:** Ink, a 2px ring in the text colour, 2px out from the control. It has the most contrast of the options: 17.7 to 1 in light and 17 to 1 in dark.
- **Muted text:** Darker, a new grey between two steps of the ramp for the light theme, at 6.3 to 1 on the panel.

The hover, selected and disabled choice was hard to read, because one option changed three things at once and hover only showed under the pointer. It is now three choices, one per colour. The hover choice draws the first commit row and menu item as hovered, and the small Graft screen gained a disabled Push button in the status bar. Every choice now also ends with a "Spot it" option that paints its tokens bright red, so you can find what it changes before judging the real options.

From the split choices:

- **Hover:** Grey, a light grey in light and a lifted grey in dark.
- **Selected:** Grey, a darker grey than hover, with the violet bar marking the row. Dark needed a new grey between two steps of the ramp.
- **Disabled:** Readable, faded text you can still read on a light grey block.
- **Control borders:** Light touch, a new mid grey in light at 3.3 to 1 on the panel, just past the 3 to 1 a control's edge needs.

With those in place, a contrast check ran over every text and control colour against every background it sits on, in both themes. Everything passed except three graph lanes in light: green, amber and cyan were too faint on the new selected grey. That became one last colour choice, with a preview that runs those three lanes through the selected row.

You could not see a difference between the options and asked Claude to choose. Claude took Just past, the smallest change that meets 3 to 1, as three new in-between shades used by the light lanes only. Every ratio is now recorded in the Contrast section of `style-guide.md`, which finishes the colours and other values in `graft.css`.

## Building the components

Every component on the todo list now has its own explorer page: select, checkbox, radio and switch, tabs, menu and context menu, tooltip, list and tree, table, toolbar and status bar, sidebar navigation, notifications and banners, progress and loading, badges and chips, and the command palette. The button page gained icon buttons, the danger button and, at your request, two drop-down buttons: one that opens a menu and one that opens a small dialog of settings anchored below the button.

You asked for MUI to be used the right way, so each part is a real MUI component styled in one place, the MUI theme in `src/lib/mui-theme.ts`. Surfaces are MUI `Paper` with an outlined and an overlay variant, the ref badges are `Chip` variants, the banner icons are set once as the `Alert` default and the toolbar is MUI's `Toolbar`. Pages pass `sx` only for one-off layout such as a width.

Popups such as menus, the select list and tooltips normally mount at the end of the page, outside the light or dark panel that opened them, so they came out in the wrong theme. The theme now mounts them next to the control that opens them, and a test checks that a menu opened in the dark panel and one opened in the light panel differ.

Problems along the way:

- **The command palette's search box lost focus** when the palette opened as a dialog, because MUI's dialog moves focus inside itself after it appears. The search box now takes focus once the dialog has finished opening.
- **Popups measured too early.** The drop-down tests measured the menu while it was still growing in, and on a short window MUI slides a tall panel up so it stays on screen. The tests now wait for the popup to settle and use a tall window.
- **A long title under the info button on a phone.** "Notifications and banners" ran under the floating info button at the top right, which the phone tests caught. Page titles on narrow screens now leave room on the right as well as the left.

Running the contrast check over the new components found one failure: status colours used as words, such as a file's M, A or D letter and the danger item in a menu, fall under 4.5 to 1 in light on hover and selected rows. That is a choice on the Choices page, alongside the looks the components leave open: tabs, switch, tooltip, banners, ref badges, table rows, the sidebar's current item and tree guides. The Choices page can now draw a choice on its own preview, such as a row of tabs, instead of the small Graft screen.

You found the red-filled danger buttons too bright and asked for red text, a red icon or a red border instead. Every danger button now has all three on no fill, and under the pointer its border thickens instead of filling grey, so the red words keep 4.8 to 1 in light and 6.4 to 1 in dark. Claude first offered this as a choice; you asked for fixes to be made, not offered, and that is now a rule in `CLAUDE.md`. You also asked for a little more room above the text in the ref badges such as main, so the badges gained half a spacing step at the top.

You asked for every button to have a border. Contained buttons now have a line in the darker accent, outlined buttons keep their control border, and text buttons, icon buttons and disabled buttons have the soft border. Each is drawn as a 1px line inside the button, so it adds no size and every kind of button stays the same height. You also spotted that large buttons were no bigger than medium ones: the theme gave every size the medium padding. Large buttons now have more padding and the next text size up.

You asked for more room above and below the items of the Merge button's menu. Every menu now has a full spacing step above its first item and below its last.

The rest of the work, in order, is in `todo.md`.

## Picking it up again

- Open this folder in Claude Code. Claude starts the dev server and opens the explorer in Chrome.
- Ask for "the next items on the todo list" to see where things stand.
- Ask Claude to walk you through the next choice, one at a time.
