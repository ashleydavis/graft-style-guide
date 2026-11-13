# Graft style guide

Follow [docs/process.md](docs/process.md), one step per message.

- Never read `../mockup/`, `../playbook/project/` or any other Graft UI, its code or screenshots, unless the developer asks in that message. Token values come from the intent and the developer's choices only.
- `graft.css` is the only source of token values. `style-guide.md` and `areas/*.md` refer to tokens by name and never repeat a value.
- Raw palette tokens hold values. Role tokens point at raw palette tokens. Components and rules use role tokens only.
- Every style has a light and a dark version: every role token (colours, shadows, borders, focus rings and every other value components use) has a light and a dark value, even when the two are the same. Every option, preview and rule covers both themes.
- At each choice, offer two or three options on the style explorer and let the developer pick. Never pick for them.
- Anchor every rule to a token or a number, never to an adjective alone.
- Check text and control contrast against WCAG 2.2 AA by computing the ratio, and report the figure.
- `graft.css` needs no build step. No JSON token files.
- Every component gets its own explorer page under `src/pages/`, listed in `src/explorer-pages.ts`, and every token appears on the overview page. Explorer code uses role tokens only, never a literal colour or size.
- Build components from MUI components wherever MUI has one, styled to this style guide through MUI's own customisation (theme `styleOverrides`, `variants`, `defaultProps`). Where that fails, use Tailwind classes. Where Tailwind fails, use raw CSS.
- A component outside MUI's set is built in React, HTML and TypeScript, styled with Tailwind first and raw CSS where Tailwind fails.
- A component made of other components follows the same order for each part: styled MUI components first, then Tailwind, then raw CSS.
- Run commands through mise. The explorer's dev server is `bun run dev` on port 5199.
- Never use `bun --bun`. This project uses Bun: scripts in `package.json` run a tool by passing its script file to `bun`, as in `bun node_modules/vite/bin/vite.js`.
- Comments and docs say exactly what a thing is and does, in positive statements. Vague, ambiguous or imprecise statements are banned, and so is listing what the code, a feature or the project does not do.
