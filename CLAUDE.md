# Graft style guide

Follow [process.md](process.md), one step per message.

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
- `docs/` holds the built site for GitHub Pages, written by `bun run build`. Rebuild it after every change to `graft.css` or `src/`, so the committed site matches the source.
- While working with the developer, keep the dev server running (`bun run dev`, port 5199) and the explorer open in Chrome at http://localhost:5199/. At the start of a session, start the server if it is down and open the page with `google-chrome --new-window`. After any change to `vite.config.ts`, stop the dev server process and start a new one: Vite's restart inside the same process leaves open browser connections on the closed server, which answers "The server is being restarted or closed". After moving or renaming a file under `src/`, do the same, then load the pages that import it on port 5199 and check they render.
- The pre-commit hook runs `scripts/test-everything.sh`. Install it in every new clone or worktree with `./scripts/install-hooks.sh`, and never commit with `--no-verify`. When the hook refuses a commit, fix the cause and commit again.
- Keep updating `how-we-built-it.md` as the style guide work continues: after every pick, setup change, new tool or problem solved, add it there in simple terms, in the same reply as the change.
- Run commands through mise. The explorer's dev server is `bun run dev` on port 5199.
- Never use `bun --bun`. This project uses Bun: scripts in `package.json` run a tool by passing its script file to `bun`, as in `bun node_modules/vite/bin/vite.js`.
- Comments and docs say exactly what a thing is and does, in positive statements. Vague, ambiguous or imprecise statements are banned, and so is listing what the code, a feature or the project does not do.
