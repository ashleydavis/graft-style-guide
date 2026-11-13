# Graft style guide

Follow [docs/process.md](docs/process.md), one step per message.

- Never read `../mockup/`, `../playbook/project/` or any other Graft UI, its code or screenshots, unless the developer asks in that message. Token values come from the intent and the developer's choices only.
- `tokens.css` is the only source of token values. `style-guide.md` and `areas/*.md` refer to tokens by name and never repeat a value.
- Raw palette tokens hold values. Role tokens point at raw palette tokens. Components and rules use role tokens only.
- Every role token has a light and a dark value.
- At each choice, offer two or three options on `preview.html` and let the developer pick. Never pick for them.
- Anchor every rule to a token or a number, never to an adjective alone.
- Check text and control contrast against WCAG 2.2 AA by computing the ratio, and report the figure.
- No build step and no JSON token files.
