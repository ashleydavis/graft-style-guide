//
// Animates a change to the page with the browser's view transitions, so an element that changes
// size or place, such as a pane being maximised, moves smoothly from its old box to its new one.
//

import { flushSync } from "react-dom";

//
// Runs `update`, a React state change, inside a view transition: the browser takes a picture of
// the page, React draws the change at once, and the browser animates every named element from its
// old box to its new one. Runs `update` with no animation where the browser has no view
// transitions or the computer asks for reduced motion.
//
export function withViewTransition(update: () => void): void {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof document.startViewTransition !== "function" || reducedMotion) {
        update();
        return;
    }
    document.startViewTransition(() => {
        flushSync(update);
    });
}

//
// Returns a view transition name made from a React id, which may hold characters a CSS name may
// not, so each pane on the page has a name of its own.
//
export function transitionName(id: string): string {
    return `pane-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
