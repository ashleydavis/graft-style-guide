# Process

How the Graft style guide is made: design tokens in CSS and the rules for using them in markdown.

## Light and dark

Every style has a light and a dark version. Every token, option, preview, rule and override covers both themes.

## Steps

The developer is walked through one step at a time. At each choice Claude offers two or three options, shows them on the style explorer and the developer picks one.

1. **Intent.** The developer writes one sentence on how Graft should feel. Every later choice is checked against it.
2. **Raw palette.** The base values go in `graft.css`: grey ramp, accent colours, spacing steps, type sizes, font families, radius, shadows and animation timing. The values come from the intent and the developer's choices only.
3. **Role tokens.** Tokens named for what they are used for: background, panel, text, muted text, border, focus, success, warning, danger, plus Git roles such as diff added, diff removed, conflict and branch colours. Each one points at a raw palette token and has a light and a dark value, even when the two are the same. Components use role tokens only, so every style has a light and a dark version.
4. **Style explorer.** The style explorer loads `graft.css`. Its overview page shows every token with small examples of its use, and each component has its own page. Every example is shown in the light theme, the dark theme or light next to dark, set apart from the explorer's own light or dark theme, and reloads when `graft.css` changes, so each choice is judged on screen.
5. **Rules.** `style-guide.md` holds the design intent, which token to use when, the states every control has (default, hover, focus-visible, active, disabled, loading, error), accessibility checks that can be tested, the tone of UI text, patterns to avoid and a review checklist. Each rule says how it applies in the light and the dark theme.
6. **Overrides.** An area that needs its own rules, such as the diff view, gets its own file under `areas/`. Its rules take priority over `style-guide.md` for that area.
7. **Review pass.** Claude and the developer go over the style explorer together and adjust tokens until it looks right.
8. **Apply.** When the developer asks, the tokens are wired into the Graft mockup and the real Graft: `graft.css` imported once, Tailwind's `@theme` pointed at the variables, the MUI theme reading the values at startup and hard-coded values replaced.

## Export

`graft.css` is the export. Any web page links it and uses the variables, for example `var(--color-accent)`. Pages load the file exactly as it is in this repo.
