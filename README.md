# Graft style guide

The visual style of Graft, the Git client: design tokens as CSS variables and the rules for using them. Every style has a light and a dark version.

- `graft.css`: every colour, size, font, radius, shadow and timing value as a CSS variable, with light values on `:root` and dark values under `[data-theme="dark"]`.
- `style-guide.md`: the design intent and the rules for which token to use when.
- `areas/`: rules for one area of the app, such as the diff view, that take priority over `style-guide.md` there.
- `src/`: the style explorer, a web app that shows every token on an overview page and each component on its own page, in both themes.
- [docs/process.md](docs/process.md): how the style guide is made.

## Running the style explorer

```bash
bun install
bun run dev
```

Open http://localhost:5199/. Search for a component in the sidebar and choose it. The page shown is in the URL, as in `/page/button`. Two switches at the bottom of the sidebar set how the page looks, and both settings go in the URL:

- **Components** shows the examples in the light theme, the dark theme or light next to dark, as in `?components=dark`. A URL without it shows light next to dark.
- **Explorer** sets the theme of the explorer's own sidebar, headings and background to light or dark, as in `?explorer=dark`. A URL without it shows light. The page reloads its styles when `graft.css` changes.

## Testing

```bash
bun run test:e2e
```

The Playwright end-to-end tests start their own dev server on a free port and run in the Chrome installed on the machine.

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
