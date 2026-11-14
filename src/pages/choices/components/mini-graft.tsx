//
// A small Graft-like screen built from role tokens: a header with the current branch and a
// button, a commit list with graph lanes, a diff and a status bar. Every choice is judged on
// it, so each option is seen in use and not only as swatches.
//

import type { ReactNode } from "react";
import Button from "@mui/material/Button";

//
// Renders the screen. Tokens that are still open choices, such as --color-info and the lane
// colours, fall back to existing role tokens until the choice is made.
//
export function MiniGraft(): ReactNode {
    return (
        <div
            style={{
                background: "var(--color-bg)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-md)",
            }}
        >
            <div
                className="flex items-center"
                style={{
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-panel)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <span
                    style={{
                        fontWeight: "var(--weight-bold)",
                    }}
                >
                    graft
                </span>
                <span
                    style={{
                        padding: "0 var(--space-2)",
                        borderRadius: "var(--radius-full)",
                        background: "var(--color-accent)",
                        color: "var(--color-on-accent)",
                        fontSize: "var(--text-sm)",
                        fontFamily: "var(--font-mono)",
                    }}
                >
                    main
                </span>
                <span className="flex-1" />
                <Button variant="contained" size="small">
                    Fetch
                </Button>
            </div>

            <div
                style={{
                    background: "var(--color-panel)",
                }}
            >
                {[
                    {
                        message: "Added the commit graph",
                        hash: "a1b2c3d",
                        lane: 1,
                        isSelected: false,
                    },
                    {
                        message: "Fixed the merge base lookup",
                        hash: "e4f5a6b",
                        lane: 2,
                        isSelected: true,
                    },
                    {
                        message: "Merged feature/diffs",
                        hash: "c7d8e9f",
                        lane: 3,
                        isSelected: false,
                    },
                ].map(commit => (
                    <div
                        key={commit.hash}
                        className="flex items-center"
                        style={{
                            gap: "var(--space-2)",
                            padding: "var(--space-1) var(--space-3)",
                            background: commit.isSelected ? "var(--color-raised)" : "transparent",
                            borderLeft: commit.isSelected ? "2px solid var(--color-accent)" : "2px solid transparent",
                        }}
                    >
                        <LaneMarks activeLane={commit.lane} />
                        <span className="flex-1 truncate">{commit.message}</span>
                        <span
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "var(--text-sm)",
                                color: "var(--color-text-muted)",
                            }}
                        >
                            {commit.hash}
                        </span>
                    </div>
                ))}
            </div>

            <div
                style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    borderTop: "1px solid var(--color-border)",
                }}
            >
                <div
                    style={{
                        padding: "var(--space-1) var(--space-3)",
                        color: "var(--color-text-muted)",
                    }}
                >
                    src/graph.ts
                </div>
                <DiffLine marker="-" background="var(--color-diff-removed)" markerColour="var(--color-diff-removed-line, var(--color-danger))">
                    const laneCount = 3;
                </DiffLine>
                <DiffLine marker="+" background="var(--color-diff-added)" markerColour="var(--color-diff-added-line, var(--color-success))">
                    const laneCount = lanes.length;
                </DiffLine>
                <DiffLine marker="!" background="transparent" markerColour="var(--color-conflict, var(--color-warning))">
                    {"<<<<<<< conflict in drawLanes"}
                </DiffLine>
            </div>

            <div
                className="flex flex-wrap items-center"
                style={{
                    gap: "var(--space-3)",
                    padding: "var(--space-1) var(--space-3)",
                    background: "var(--color-panel)",
                    borderTop: "1px solid var(--color-border)",
                    fontSize: "var(--text-sm)",
                }}
            >
                <StatusItem colour="var(--color-success)" label="Pushed" />
                <StatusItem colour="var(--color-warning)" label="2 behind" />
                <StatusItem colour="var(--color-danger)" label="1 conflict" />
                <StatusItem colour="var(--color-info, var(--color-accent))" label="Fetching" />
            </div>
        </div>
    );
}

//
// Renders three graph lanes with a dot on `activeLane`, coloured by the lane tokens.
//
export function LaneMarks({ activeLane }: { activeLane: number }): ReactNode {
    return (
        <svg width="36" height="18" viewBox="0 0 36 18" aria-hidden="true">
            {[1, 2, 3].map(lane => (
                <g key={lane}>
                    <line
                        x1={lane * 10}
                        y1="0"
                        x2={lane * 10}
                        y2="18"
                        strokeWidth="2"
                        style={{
                            stroke: `var(--color-lane-${lane}, var(--color-accent))`,
                        }}
                    />
                    {lane === activeLane ? (
                        <circle
                            cx={lane * 10}
                            cy="9"
                            r="4"
                            style={{
                                fill: `var(--color-lane-${lane}, var(--color-accent))`,
                                stroke: "var(--color-panel)",
                                strokeWidth: 2,
                            }}
                        />
                    ) : undefined}
                </g>
            ))}
        </svg>
    );
}

//
// Renders one diff line: a marker in `markerColour` and the code on `background`.
//
export function DiffLine({
    marker,
    background,
    markerColour,
    children,
}: {
    marker: string;
    background: string;
    markerColour: string;
    children: ReactNode;
}): ReactNode {
    return (
        <div
            className="flex"
            style={{
                background,
                borderLeft: `3px solid ${markerColour}`,
                padding: "0 var(--space-3)",
                gap: "var(--space-2)",
            }}
        >
            <span
                style={{
                    color: markerColour,
                }}
            >
                {marker}
            </span>
            <span>{children}</span>
        </div>
    );
}

//
// Renders a coloured dot and a label, as in the status bar.
//
export function StatusItem({ colour, label }: { colour: string; label: string }): ReactNode {
    return (
        <span
            className="flex items-center"
            style={{
                gap: "var(--space-1)",
            }}
        >
            <span
                className="inline-block h-2 w-2"
                style={{
                    background: colour,
                    borderRadius: "var(--radius-full)",
                }}
            />
            <span
                style={{
                    color: colour,
                }}
            >
                {label}
            </span>
        </span>
    );
}
