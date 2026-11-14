//
// The lines a change added and deleted, as "+9 −2" in the success and danger colours.
//

import type { ReactNode } from "react";

//
// Renders the counts in the code font. A count of nothing shows in muted text, so the eye goes to
// the side that changed.
//
export function LineCounts({ added, deleted }: { added: number; deleted: number }): ReactNode {
    return (
        <span
            aria-label={`${added} lines added, ${deleted} lines deleted`}
            className="flex flex-none"
            style={{ gap: "var(--space-2)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}
        >
            <span style={{ color: added > 0 ? "var(--color-success)" : "var(--color-text-muted)" }}>+{added}</span>
            <span style={{ color: deleted > 0 ? "var(--color-danger)" : "var(--color-text-muted)" }}>−{deleted}</span>
        </span>
    );
}
