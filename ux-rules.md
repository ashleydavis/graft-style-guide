# Graft UX rules

How Graft's interface behaves and is laid out. The look of each part comes from the tokens in `graft.css` and the rules in `style-guide.md`; these rules say how the parts are used. Every rule refers to tokens by name and applies to both the light and the dark theme.

The human can choose to override these rules at their discretion.

## Dangerous operations

An operation is dangerous when it loses work that Git cannot bring back: discarding changes, deleting a branch, resetting, force pushing.

- A dangerous action's button is outlined, never filled: its text, its icon and its border are `--color-danger` on a see-through background. On hover the border thickens to 2px and the background stays see-through.
- An icon-only dangerous button, such as the trash can that discards a file, a hunk or lines, follows the same rule: icon and border in `--color-danger`.
- A disabled dangerous button takes the disabled colours, `--color-text-disabled` and `--color-border`, like any disabled button.
- A dangerous button's tooltip says what it does, how to undo it and its key.
- Discarding takes effect straight away and asks nothing. The discarded file, hunk or lines play a short animation, stay in view faded and struck through, and their Discard button turns into an Undo button that brings them back.
- Discard has a key, Delete, that acts on what is selected: the file in the file list, and in the diff the selected lines, else the current hunk, else the file. Pressing it on a discarded part brings it back.

## Placing actions

- Stage/unstage and non-destructive tools stick to the left. Destructive tools stick to the right.
- In a row, a header or over a hunk or picked lines, the stage button sits at the left end and Discard, or Undo once discarded, at the right end, so the width of the row lies between them.

## Spacing around controls

- Buttons and other UI components should have sufficient margin around them to separate them from surrounding or adjacent UX elements.
- Every button and control has room around it, so it never touches a neighbouring control, a border or the edge of its container. The gap is `--space-2` or more between a control and anything beside it, and `--space-2` or more between a control and a border round it, such as the current hunk's border.
- A control inside a bordered or highlighted area keeps that room on every side the area's border runs along.

## Screens

- All UI pages and components need to work in desktop, mobile, portrait and landscape.
