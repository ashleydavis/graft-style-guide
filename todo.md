# Todo

The work to flesh out the Graft style guide, in the order of `process.md`. Each choice is made from options shown in the style explorer, in light and dark.

## Intent

- [x] Write the one-sentence intent for how Graft should feel.

## Raw palette

- [x] Grey ramp: the neutral greys for backgrounds, panels, borders and text.
- [x] Accent colour.
- [x] Status colours: success, warning, danger and info.
- [x] Git colours: diff added, diff removed, conflict and the branch lane colours of the commit graph.
- [x] Fonts: the UI font and the monospace font for code, hashes and diffs.
- [ ] Type scale, weights and line heights.
- [ ] Spacing scale and how dense the UI is.
- [ ] Corner radius.
- [ ] Shadows for raised panels and overlays.
- [ ] Animation durations and easing.
- [ ] Icon sizes.

## Role tokens

- [ ] Light and dark values for every role token: background, panel, raised, border, text, muted text, accent, focus, the status colours and the Git colours.
- [ ] Focus ring: colour, width and offset.
- [ ] Hover, selected and disabled colours for lists, rows and controls.
- [ ] Contrast check of every text and control colour against WCAG 2.2 AA, with the ratios recorded.

## Components

Each gets its own explorer page, built from MUI components where MUI has one.

- [ ] Button: review the kinds, sizes, icon buttons and the danger button.
- [ ] Text box: review the states, search box and multi-line box.
- [ ] Dialog: review the form and confirmation dialogs.
- [ ] Select and dropdown.
- [ ] Checkbox, radio button and switch.
- [ ] Tabs.
- [ ] Menu and context menu.
- [ ] Tooltip.
- [ ] List and tree, such as the file tree.
- [ ] Table, such as the commit list.
- [ ] Toolbar and status bar.
- [ ] Sidebar navigation.
- [ ] Notifications and banners.
- [ ] Progress and loading states.
- [ ] Badges and chips for branches, tags and remotes.
- [ ] Command palette.

## Git views

- [ ] Diff view: line colours, gutter, line numbers and word-level highlights.
- [ ] Commit graph: lanes, dots and the selected commit.
- [ ] Commit message box.
- [ ] Conflict view.

## Rules

- [ ] Write `style-guide.md`: the intent, which token to use when, the states every control has, accessibility checks, the tone of UI text, patterns to avoid and a review checklist.
- [ ] Write area rules under `areas/` for any area with its own rules, starting with the diff view.

## Review and apply

- [ ] Review the whole explorer together in both themes and adjust tokens.
- [ ] Wire `graft.css` into the Graft mockup.
- [ ] Wire `graft.css` into Graft.
