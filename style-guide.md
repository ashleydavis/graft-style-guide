# Graft style guide

The rules for using the design tokens in `graft.css`. Every rule refers to tokens by name and applies to both the light and the dark theme.

## Intent

Graft is a minimal, modern Git client: a sleek workbench that shows your repository clearly and simply, with calm surfaces and sharp detail where it matters, so you see what changed and act on it without the interface slowing you down.

Every choice of colour, type, spacing and component style is checked against this sentence.

## Contrast

Every text and control colour meets WCAG 2.2 AA in both themes: 4.5 to 1 for text and 3 to 1 for control edges, focus rings, graph lines and markers. A colour pair that is not in this table gets its ratio computed before it is used.

| Colour | On | Needs | Light | Dark |
| :--- | :--- | :--- | :--- | :--- |
| `--color-text` | `--color-bg`, `--color-panel`, `--color-raised`, `--color-hover` | 4.5 | 16.1 or more | 14.3 or more |
| `--color-text` | `--color-selected` | 4.5 | 14.5 | 12.5 |
| `--color-text` | `--color-diff-added`, `--color-diff-removed` | 4.5 | 14.5 or more | 14.1 or more |
| `--color-text-muted` | `--color-bg`, `--color-panel` | 4.5 | 6.1 or more | 6.9 or more |
| `--color-text-muted` | `--color-raised`, `--color-hover` | 4.5 | 5.7 | 5.8 or more |
| `--color-text-muted` | `--color-selected` | 4.5 | 5.2 | 5.1 |
| `--color-accent` as text | `--color-bg`, `--color-panel` | 4.5 | 5.5 or more | 6.5 or more |
| `--color-success` as text | `--color-bg`, `--color-panel` | 4.5 | 4.8 or more | 10.2 or more |
| `--color-warning` as text | `--color-bg`, `--color-panel` | 4.5 | 4.8 or more | 10.6 or more |
| `--color-danger` as text | `--color-bg`, `--color-panel` | 4.5 | 4.6 or more | 6.4 or more |
| `--color-info` as text | `--color-bg`, `--color-panel` | 4.5 | 5.0 or more | 7.0 or more |
| `--color-on-accent` | `--color-accent` | 4.5 | 5.7 | 6.9 |
| `--color-on-accent` | `--color-accent-hover` | 4.5 | 7.1 | 10.1 |
| `--color-on-danger` | `--color-danger` | 4.5 | 4.8 | 7.1 |
| `--color-border-control` | `--color-bg`, `--color-panel` | 3 | 3.1 or more | 3.7 or more |
| `--color-focus` | `--color-bg`, `--color-panel` | 3 | 10.5 or more | 14.9 or more |
| `--color-select-pane` | `--color-bg`, `--color-panel` | 3 | 4.1 or more | 4.2 or more |
| `--color-select-item` | `--color-bg`, `--color-panel`, `--color-diff-added` | 3 | 6.5 or more | 8.0 or more |
| `--color-accent` as a button fill | `--color-panel` | 3 | 5.7 | 6.5 |
| `--color-conflict` as a marker | `--color-bg`, `--color-panel` | 3 | 3.1 or more | 10.6 or more |
| `--color-diff-added-line` | `--color-diff-added` | 3 | 3.0 | 8.5 |
| `--color-diff-removed-line` | `--color-diff-removed` | 3 | 4.0 | 5.9 |
| `--color-lane-1` to `--color-lane-6` | `--color-panel` | 3 | 3.9 or more | 6.4 or more |
| `--color-lane-1` to `--color-lane-6` | `--color-selected` | 3 | 3.2 or more | 4.7 or more |
| `--color-text-disabled` | `--color-disabled` | none | 4.4 | 3.1 |

- `--color-conflict` is for markers and lines only. In light it is under 4.5 to 1, so it is never the colour of words.
- `--color-diff-added-line` on `--color-diff-added` in light is 3.0009 to 1, just over 3 to 1.
- `--color-hover` and `--color-selected` are see-through, so the figures for them are taken over `--color-panel`, where rows sit.
- WCAG sets no contrast for disabled controls. The figure for `--color-text-disabled` is for reference.
