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

More additions you asked for:

- **Messages and toasts in every kind.** Banners and toasts now come in plain, info, success, warning and error. A plain message is a new `plain` variant of MUI's Alert with no icon and no status colour. MUI's Snackbar shows one toast at a time, so toasts sit in a MUI Stack at the bottom left of the screen instead: each slides up, several stack with the newest at the bottom, and each closes after 4 seconds or on Dismiss.
- **Shortcuts in line with their words.** The keyboard shortcuts in tooltips, menus and the command palette sat about 2px high, because the code font draws its letters higher in the line than the interface font. A shared `Shortcut` component now puts them on the same baseline as the words.
- **A shortcuts overlay.** Pressing "?" anywhere outside a text box opens a searchable list of Graft's keyboard shortcuts over the page, in groups, with each key drawn as a key cap. It has its own page in the explorer. A faint dotted line in the border colour runs from each action to its keys, so the eye follows the row across.
- **Room above "Start point".** The fields in the Create branch dialog are a full spacing step apart, so each label has room above it.

## The commit explorer and the Git commands panel

You asked for Graft's commit explorer and its help panel to be rebuilt here in the style guide's own styling, and for Claude to read them in `playbook/project` for what they do but not copy their look.

- **The commit explorer** has its own page. Three columns open left to right, as in a file browser's column view: the commit list, the open commit's details and an open file's diff. Up and Down move the selection, Left and Right move between columns, Enter opens and Escape closes the rightmost column, the same keys as in Graft. The column the keys act on has an accent border, and the open commit and file have an accent bar. Commit rows use the ref badges, changed files use the status letters, and the diff is a new view with old and new line numbers on the diff colours. The examples use a small made-up history of Graft itself.
- **The commit graph in the explorer.** You pointed out that the first build left out the graph lanes. Each commit row now starts with its lanes, drawn by the same code as the Commit graph page, which was split so both use it. The example history has a feature branch that leaves main and merges back. Each commit's dot is ringed in its row's own background, so it stays clear of the lines on a plain, hovered or selected row. A test checks the main lane runs unbroken from the newest commit to the first.
- **The Git commands panel** has its own page, after you asked for it to come out of the commit explorer. It shows the one or two Git commands the current page ran, with the folder they run in and a copy button on each, and examples of none, one and two commands. It never shows earlier commands: the first build labelled the commands "Most recent" and "Before that", which you pointed out the panel has no use for.
- **A copy button** joined the Button page: it copies a command, hash or path and shows a tick in the success colour for a moment.
- **Scrolling.** The first build used the browser's scroll-into-view to keep the selection and the newest column in sight, which also scrolled the whole page down to the last example as it loaded. The explorer now scrolls only inside its own columns, and a test checks the page stays at the top.
- **A check on the example data.** A test that counts a diff's added lines found one file whose stated count was one short. A check now compares every file's counts with its diff.

More on the commit explorer and diffs:

- **Busier histories.** You asked for lanes with more crossings and one much more complicated branch. The explorer now shows three histories. The busiest, thirty commits on up to five lanes, is too much to lay out by hand, so its graph is worked out from each commit's parents, the way Git clients do: each column waits for one commit, merges curve out to a free column and branches that meet curve into it.
- **Dotted lanes for unmerged branches.** You pointed out that a branch not merged yet, such as an open pull request, should draw a dotted lane. Lanes now take a dotted style, the examples on the Commit graph page and in the explorer mark their open branches, and the layout routine dots every line down from a commit the newest commit cannot reach.
- **A long commit message.** One commit has a long title and a description of several paragraphs. After you found you had to scroll past it to reach the files, a long description now shows its first three lines with a "Show more" link.
- **Files open as they are selected.** Moving through the files with the arrow keys opens each file's diff straight away, while the keys stay on the file list, instead of needing Enter.
- **Three file views.** A switch over the changed files lists them by full path, as file name and folder in two columns, or as a tree of folders, with a run of single folders folded into one row. The arrow keys follow the order on screen.
- **Search boxes.** The commit list has a search box at its top, after you found one in the title bar too far out of the way. It narrows the list by message, author, hash or ref and counts the matches, and hides the graph while it does, since the lines would no longer join. The repository sidebar has one too, which narrows every group and opens the groups with a match.
- **Keys after a click.** After you click a button inside the explorer, such as the file view switch, the arrow keys and Escape still move through the explorer; only Enter goes to the button.
- **Focus ring in the accent.** You asked for focus rings to match the active pane's border, so the focus token now uses the accent's violet: 5.5 to 1 or more against the background in light and 6.5 to 1 in dark.
- **Tooltips in capitals.** Tooltips mount next to the control they label, and one under a small-capitals heading took on its capitals. Tooltips now set their own text style.

## The Diff page

You asked for a page of the ways a file's diff is presented, since diffs will matter a great deal in Graft. It shows a file card with the unified view, with old and new line numbers, and the side-by-side view, with a striped side where one file has no line to match. Where a changed line differs by a word or two, those words are marked in a stronger colour, from two new tokens, `--color-diff-added-word` and `--color-diff-removed-word`. Text on them is 8.7 to 1 or more. The marking is a gentle step from the line's own colour, as on GitHub, and it is an extra cue on top of that colour. The bars between hunks count the unchanged lines left out and show them when clicked. Long lines scroll sideways or wrap, at the flick of a switch. One commit's worth of files shows every kind of change: added, deleted and folded, renamed, renamed with no changes, binary, a mode change, a file with no line break at its end and a lock file too large to show until asked. The commit explorer's file pane uses the same diff view, so it marks changed words too.

The renamed status letter uses the info colour, which falls to 4.1 to 1 on the selected row in light. Rather than add a choice, it joined the open "Status colours as text" choice, whose options now darken the info colour as well.

Then, from your notes on the diffs:

- **A menu on every file path.** You liked copying a path from the diff and asked for it on every file path, as a drop-down: copy the full path, copy the path from the repository root, copy the file name, show the file in the file manager and open it in the editor. The file manager item is named for the platform: Reveal in Finder on macOS, Show in Explorer on Windows and Open in file manager on Linux. In Graft the backend does the opening; here those two items close the menu. The menu sits beside the path in diff cards, the commit explorer's file pane, the commit's file rows (shown on the row under the pointer, the selected row and a row with the keyboard in it) and the List and tree page.
- **Staging.** The first build added a "Staged" label, a green bar on staged hunks, a count of staged hunks and a separate Staging section, which you asked to have taken back out. What is left is one plain button per file, at the far right of its header, and one per hunk, at the hunk's top right. Each says Stage or Unstage and flips on a click, keeping one width so nothing shifts, and some example changes start staged. Every diff card on the Diff page has them; the commit explorer shows history, where there is nothing to stage.
- **One diff component.** You pointed out that the commit explorer's diff should be the Diff page's diff, as Graft will have one diff component. The explorer's file pane is now the Diff page's file diff card itself, filling the column, with its header, path menu, switches and a close button.
- **Moving through diffs.** On the Diff page the list of files is a diff explorer with a toolbar that says where you are: Up and Down step from change to change across the files, and Shift with Up or Down steps from file to file. In the commit explorer the file pane answers the same keys, with Shift moving to the commit's previous or next file. The current file and change are marked with the accent.
- **The whole file at once.** A switch in the diff's header shows every unchanged line of the file and folds them back, beside the per-gap arrows you liked.
- **Room in the header.** The diff's header and the diff explorer's toolbar have more space above and below their buttons.
- **Keys for staging.** Space stages or unstages the current change, or the current file when no change is picked, in the diff explorer and in a diff card on its own. A card on its own takes the keyboard when clicked or reached with Tab, and Up and Down step through its changes. The diff explorer keeps the staging of all its cards, so its keys and the buttons agree. The commit explorer uses the same card with staging off, since a commit's changes are already made.
- **Tooltips everywhere they help.** Every icon button has a tooltip, and so do things that need explaining: the line counts, the status letters, the ref badges, a commit's author, date and hash, the staging buttons and the unchanged lines. Tooltips now point at their control with an arrow, carry the overlay shadow, wait a moment before showing and can hold a bold line with a quieter explanation under it.

## The Changes page

You asked for the staging area, since that is where staging belongs: a commit in the history is already made and cannot be staged. The Changes page shows the working tree's changed files beside the selected file's diff, with the commit box under the files.

- **Files.** Each changed file has a checkbox that stages the whole file, ticked when all of it is staged and half-ticked when part is. A search box narrows the list. The status letter and the line counts sit together at the right of each row, each in a small box.
- **Diff.** The selected file's diff is the shared diff card, with Stage and Unstage for the file and for each change. The checkboxes and the buttons share one staging, so they always agree.
- **Two ways to look.** A switch, with icons, shows either one diff or the file's staged changes and unstaged changes in separate sections. In the second, the file list splits into Staged and Unstaged lists too, a file staged in part shows in both, each row counts only its own part, and the area grows taller.
- **Committing.** A summary, a description, Amend (which brings in the last commit's message) and No verify (`--no-verify`) sit above the Commit button, which needs a summary and something staged. A commit takes the staged files and changes out of the list and says what it committed.
- **Keys.** Up and Down move through the files and open each diff, Right moves into the diff, where Up and Down step through its changes, Space stages or unstages, and M maximises the pane the keys are on.
- **Images.** A changed image shows its old and new versions side by side, Before and After, on a checkerboard.

More across the explorers:

- **Find in a diff.** A search box above every diff's content marks each match with an accent outline, fills the current one and counts them; Enter and Shift+Enter step through them. The first build counted matches as lines were drawn, which React's development mode does twice, so every match counted twice; the matches are now counted up front.
- **Clicking a hunk** makes it the current hunk and its pane the active one.
- **Resizing.** The gaps after the commit list and the commit details are drag handles, also moved with Left and Right and reset with a double-click. The commit list sizes itself until it is dragged. The diff takes the width that is left and wraps long lines, so it rarely needs to scroll sideways.
- **Maximising.** Every pane has a maximise button, and M maximises the pane the keys are on; the same button or key puts it back. The change animates with the browser's view transitions, using the normal duration and the standard easing, and skips the animation when the computer asks for reduced motion.
- **Nested selections.** Three steps of violet show which layer is selected: `--color-select-pane` for the active pane, `--color-select-item` for a selection inside it, such as the current hunk, and `--color-focus` for the keyboard focus inside that, such as a focused text box. Each step inward stands further from the background, from 3.5 to 1 up to 16.8 to 1.
- **A file with several changes.** The commit explorer has an example of a file with three hunks.
- **Violet hover and selection.** You asked for hover and selected rows to take the pane's selection colour, washed out. Both are now see-through washes of violet-500, lighter for hover than for selected, and stronger in dark, where violet shows less. Main and muted text stay at 5 to 1 or more on them. A commit's dot is ringed in its row's colour laid over the panel, so a see-through row still hides the lane lines under the ring.
- **The current hunk's border** sits a little inside the hunk, so it never runs into the pane's border.
- **A diff header on a narrow pane** keeps room for the file's path, and its buttons wrap onto a second line.

The rest of the work, in order, is in `todo.md`.

## Picking it up again

- Open this folder in Claude Code. Claude starts the dev server and opens the explorer in Chrome.
- Ask for "the next items on the todo list" to see where things stand.
- Ask Claude to walk you through the next choice, one at a time.
