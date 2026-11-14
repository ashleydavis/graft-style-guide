# Graft UX rules

How Graft's interface behaves and is laid out. The look of each part comes from the tokens in `graft.css` and the rules in `style-guide.md`; these rules say how the parts are used. Every rule refers to tokens by name and applies to both the light and the dark theme.

The human can choose to override these rules at their discretion.

## Dangerous operations

An operation is dangerous when it loses work that Git cannot bring back: discarding changes, deleting a branch, resetting, force pushing.

- A dangerous action's button is outlined, never filled: its text, its icon and its border are `--color-danger` on a see-through background. On hover the border thickens to 2px and the background stays see-through.
- An icon-only dangerous button, such as the trash can that discards a file, a hunk or lines, follows the same rule: icon and border in `--color-danger`.
- A disabled dangerous button takes the disabled colours, `--color-text-disabled` and `--color-border`, like any disabled button.
- A dangerous button's tooltip says what it does and what is lost, and that Graft asks first.
- A dangerous action always asks first in a dialog. The title is a question that names what goes, such as "Discard 3 lines?". The body says what happens and that the change is gone for good. The safe way out comes first as a text button that names what stays, such as "Keep changes", and the dangerous button comes after it, outlined in `--color-danger`, naming the action, such as "Discard". Escape and a click outside the dialog keep the work.
- A dangerous button sits before the safe action beside it, such as Discard before Stage, so the safe action keeps the end of the row.

## Spacing around controls

- Buttons and other UI components should have sufficient margin around them to separate them from surrounding or adjacent UX elements.
- Every button and control has room around it, so it never touches a neighbouring control, a border or the edge of its container. The gap is `--space-2` or more between a control and anything beside it, and `--space-2` or more between a control and a border round it, such as the current hunk's border.
- A control inside a bordered or highlighted area keeps that room on every side the area's border runs along.

## Screens

- All UI pages and components need to work in desktop, mobile, portrait and landscape.
