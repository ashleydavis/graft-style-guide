# Process

How the Graft style guide is made: design tokens in CSS and the rules for using them in markdown.

## Sources of inspiration

The process borrows from three published agent skills, without depending on any of them:

- [ui-ux-pro-max](https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max): one master rules file with optional overrides for a single area, and a preview page that shows every token.
- [bergside "claude"](https://skills.sh/bergside/awesome-design-skills/claude): the layout of the rules file (do, don't, component states, accessibility, review checklist) and the standard that every rule points at a token or a number.
- [design-system-generator](https://skills.sh/onewave-ai/claude-skills/design-system-generator): a light `:root` block with a dark block, tokens wired into Tailwind and a usage note per base component.

## Steps

The developer is walked through one step at a time. At each choice Claude offers two or three options, shows them on the preview page and the developer picks one.

1. **Intent.** The developer writes one sentence on how Graft should feel. Every later choice is checked against it.
2. **Raw palette.** The base values go in `tokens.css`: grey ramp, accent colours, spacing steps, type sizes, font families, radius, shadows and animation timing. The values come from the intent and the developer's choices only.
3. **Role tokens.** Tokens named for what they are used for: background, panel, text, muted text, border, focus, success, warning, danger, plus Git roles such as diff added, diff removed, conflict and branch colours. Each one points at a raw palette token and has a light and a dark value. Components use role tokens only.
4. **Preview page.** `preview.html` loads `tokens.css` and shows every token and the base controls (buttons, inputs, lists, tabs, a diff sample) in both themes, so each choice is judged on screen.
5. **Rules.** `style-guide.md` holds the design intent, which token to use when, the states every control has (default, hover, focus-visible, active, disabled, loading, error), accessibility checks that can be tested, the tone of UI text, patterns to avoid and a review checklist.
6. **Overrides.** An area that needs its own rules, such as the diff view, gets its own file under `areas/`. Its rules take priority over `style-guide.md` for that area.
7. **Review pass.** Claude and the developer go over the preview together and adjust tokens until it looks right.
8. **Apply.** When the developer asks, the tokens are wired into the Graft mockup and the real Graft: `tokens.css` imported once, Tailwind's `@theme` pointed at the variables, the MUI theme reading the values at startup and hard-coded values replaced.

## Export

`tokens.css` is the export. Any web page links it and uses the variables, for example `var(--color-accent)`. It needs no build step.
