//
// The lines a change added and deleted, as "+9 −2" in the success and danger colours.
//

import type { ReactNode } from "react";
import Tooltip from "@mui/material/Tooltip";
import { Tip } from "../../../components/tip";

//
// Renders the counts in the code font inside a thin border, which marks the area a pointer rests
// on to show the tooltip that spells the counts out. A count of nothing shows in muted text, so the
// eye goes to the side that changed.
//
export function LineCounts({ added, deleted }: { added: number; deleted: number }): ReactNode {
    return (
        <Tooltip
            title={
                <Tip
                    title={`${added} ${added === 1 ? "line" : "lines"} added, ${deleted} ${deleted === 1 ? "line" : "lines"} deleted`}
                    detail="A changed line counts once as deleted, in its old form, and once as added, in its new form."
                />
            }
        >
            <span
                aria-label={`${added} lines added, ${deleted} lines deleted`}
                className="flex flex-none items-center"
                style={{
                    gap: "var(--space-2)",
                    //
                    // Three quarters of a spacing step above the numbers, so the code font's high-set digits
                    // sit in the middle of the box.
                    //
                    padding: "calc(var(--space-1) * 0.75) var(--space-2) 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    lineHeight: "var(--leading-normal)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "default",
                }}
            >
                <span style={{ color: added > 0 ? "var(--color-success)" : "var(--color-text-muted)" }}>+{added}</span>
                <span style={{ color: deleted > 0 ? "var(--color-danger)" : "var(--color-text-muted)" }}>−{deleted}</span>
            </span>
        </Tooltip>
    );
}
