# Graft style guide

The visual style of Graft, the Git client: design tokens as CSS variables and the rules for using them.

- `tokens.css`: every colour, size, font, radius, shadow and timing value as a CSS variable, with light values on `:root` and dark values under `[data-theme="dark"]`.
- `style-guide.md`: the design intent and the rules for which token to use when.
- `areas/`: rules for one area of the app, such as the diff view, that take priority over `style-guide.md` there.
- `preview.html`: a page that shows every token and the base controls in both themes. Open it in a browser.
- [docs/process.md](docs/process.md): how the style guide is made.

## Using it in a web page

Link the stylesheet and use the variables:

```html
<link rel="stylesheet" href="tokens.css">
```

```css
.panel {
  background: var(--color-panel);
  color: var(--color-text);
}
```

Set `data-theme="dark"` on the `html` element for the dark theme.
