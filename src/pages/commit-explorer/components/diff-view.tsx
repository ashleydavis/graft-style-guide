//
// The diff view: a file's diff as Git writes it, drawn line by line with the old and new line
// numbers, added lines on the added colour and deleted lines on the deleted colour.
//

import type { ReactNode } from "react";

//
// One line of a diff, ready to draw.
//
export interface IDiffLine {
    //
    // What the line is: a hunk header, a line the change kept, added or deleted.
    //
    kind: "hunk" | "context" | "added" | "deleted";

    //
    // The line's number in the old file, absent for an added line or a hunk header.
    //
    oldNumber?: number;

    //
    // The line's number in the new file, absent for a deleted line or a hunk header.
    //
    newNumber?: number;

    //
    // The line's text without its marker.
    //
    text: string;
}

//
// Splits a diff into lines and numbers them. Each hunk header ("@@ -40,5 +40,6 @@") gives the
// first old and new line numbers of the lines after it. A line starting "+" is added, "-" deleted
// and any other line kept.
//
export function parseDiff(diff: string): IDiffLine[] {
    const lines: IDiffLine[] = [];
    let oldNumber = 0;
    let newNumber = 0;
    for (const line of diff.split("\n")) {
        const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(line);
        if (hunk) {
            oldNumber = Number(hunk[1]);
            newNumber = Number(hunk[2]);
            lines.push({ kind: "hunk", text: line });
        }
        else if (line.startsWith("+")) {
            lines.push({ kind: "added", newNumber: newNumber, text: line.slice(1) });
            newNumber += 1;
        }
        else if (line.startsWith("-")) {
            lines.push({ kind: "deleted", oldNumber: oldNumber, text: line.slice(1) });
            oldNumber += 1;
        }
        else {
            lines.push({ kind: "context", oldNumber: oldNumber, newNumber: newNumber, text: line.slice(1) });
            oldNumber += 1;
            newNumber += 1;
        }
    }
    return lines;
}

//
// The background, marker and marker colour of each kind of line.
//
const lineStyles = {
    hunk: {
        background: "var(--color-raised)",
        marker: "",
        markerColour: "var(--color-text-muted)",
    },
    context: {
        background: "transparent",
        marker: " ",
        markerColour: "var(--color-text-muted)",
    },
    added: {
        background: "var(--color-diff-added)",
        marker: "+",
        markerColour: "var(--color-diff-added-line)",
    },
    deleted: {
        background: "var(--color-diff-removed)",
        marker: "−",
        markerColour: "var(--color-diff-removed-line)",
    },
};

//
// Renders the diff in the code font, one row per line: the old and new line numbers in muted
// gutters, the marker in the line colour and the text. A hunk header spans the row on the raised
// colour. Long lines run on to the right and the view scrolls sideways inside its pane.
//
export function DiffView({ diff }: { diff: string }): ReactNode {
    return (
        <div role="table" aria-label="Diff" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)", minWidth: "max-content", padding: "var(--space-1) 0" }}>
            {parseDiff(diff).map((line, index) => {
                const style = lineStyles[line.kind];
                if (line.kind === "hunk") {
                    return (
                        <div key={index} role="row" data-line={line.kind} style={{ padding: "var(--space-1) var(--space-3)", margin: "var(--space-1) 0", background: style.background, color: "var(--color-text-muted)" }}>
                            {line.text}
                        </div>
                    );
                }
                return (
                    <div key={index} role="row" data-line={line.kind} className="flex" style={{ background: style.background }}>
                        <span className="flex-none select-none text-right" style={{ width: "calc(var(--space-8) + var(--space-1))", paddingRight: "var(--space-2)", color: "var(--color-text-muted)" }}>
                            {line.oldNumber ?? ""}
                        </span>
                        <span className="flex-none select-none text-right" style={{ width: "calc(var(--space-8) + var(--space-1))", paddingRight: "var(--space-2)", color: "var(--color-text-muted)" }}>
                            {line.newNumber ?? ""}
                        </span>
                        <span className="flex-none select-none text-center" style={{ width: "var(--space-4)", color: style.markerColour, fontWeight: "var(--weight-bold)" }}>
                            {style.marker}
                        </span>
                        <span style={{ whiteSpace: "pre", paddingRight: "var(--space-4)" }}>{line.text}</span>
                    </div>
                );
            })}
        </div>
    );
}
