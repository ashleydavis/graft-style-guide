//
// A small Graft-like screen built from role tokens: a header with the current branch and a
// button, a commit list with graph lanes, a diff and a status bar. Every choice is judged on
// it, so each option is seen in use and not only as swatches.
//

import { useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsRotate, faCodeBranch, faEllipsis } from "@fortawesome/free-solid-svg-icons";

//
// Renders the screen. The commit menu starts open when `menuStartsOpen` is true, so its overlay
// shadow shows straight away, and the "More actions" button closes and opens it with the motion
// tokens. Commit rows
// highlight on hover with the fast duration. The Push button in the status bar is disabled.
// With `showFocus` the Fetch button is drawn with the focus ring, as it looks when reached with
// the keyboard. With `showHover` the first commit row and the first menu item are drawn with the
// hover background, as they look under the pointer. `lanes` names the three lane colours the
// commit graph draws, from left to right.
//
export function MiniGraft({
    showFocus = false,
    showHover = false,
    menuStartsOpen = true,
    lanes = [1, 2, 3],
}: {
    showFocus?: boolean;
    showHover?: boolean;
    menuStartsOpen?: boolean;
    lanes?: number[];
}): ReactNode {
    const [isMenuOpen, setIsMenuOpen] = useState(menuStartsOpen);

    return (
        <div
            className="relative"
            style={{
                lineHeight: "var(--leading-normal)",
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
                style={{
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-panel)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <span
                    style={{
                        fontWeight: "var(--weight-bold)",
                        fontSize: "var(--text-lg)",
                        lineHeight: "var(--leading-tight)",
                    }}
                >
                    graft
                </span>
                <span
                    className="inline-flex items-center"
                    style={{
                        gap: "var(--space-1)",
                        padding: "calc(var(--space-1) / 2) var(--space-2) 0",
                        borderRadius: "var(--radius-full)",
                        background: "var(--color-accent)",
                        color: "var(--color-on-accent)",
                        fontSize: "var(--text-sm)",
                        fontFamily: "var(--font-mono)",
                    }}
                >
                    <FontAwesomeIcon
                        icon={faCodeBranch}
                        style={{
                            fontSize: "var(--icon-sm)",
                        }}
                    />
                    main
                </span>
                <span className="flex-1" />
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<FontAwesomeIcon icon={faArrowsRotate} />}
                    style={
                        showFocus
                            ? {
                                  outline: "var(--focus-ring-width) solid var(--color-focus)",
                                  outlineOffset: "var(--focus-ring-offset)",
                              }
                            : undefined
                    }
                >
                    Fetch
                </Button>
                <Tooltip title="More actions">
                    <IconButton size="small" aria-label="More actions" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <FontAwesomeIcon icon={faEllipsis} />
                    </IconButton>
                </Tooltip>
            </div>
            <CommitMenu isOpen={isMenuOpen} showHover={showHover} />

            <div
                className="flex items-center"
                style={{
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-panel)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <TextField size="small" fullWidth placeholder="Filter commits" />
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
                ].map((commit, commitIndex) => (
                    <div
                        key={commit.hash}
                        className={commit.isSelected ? "flex" : "flex hover:bg-(color:--color-hover)"}
                        style={{
                            gap: "var(--space-2)",
                            padding: "0 var(--space-3)",
                            background: commit.isSelected ? "var(--color-selected)" : showHover && commitIndex === 0 ? "var(--color-hover)" : undefined,
                            borderLeft: commit.isSelected ? "2px solid var(--color-accent)" : "2px solid transparent",
                            boxShadow: commit.isSelected ? "var(--shadow-raised)" : "none",
                            transition: "background-color var(--duration-fast) var(--ease-standard)",
                        }}
                    >
                        <LaneMarks lanes={lanes} activeLane={commit.lane} ringColour={commit.isSelected ? "var(--color-selected)" : "var(--color-panel)"} />
                        <div
                            className="min-w-0 flex-1"
                            style={{
                                padding: "var(--space-1) 0",
                            }}
                        >
                            <div
                                className="flex items-center"
                                style={{
                                    gap: "var(--space-2)",
                                }}
                            >
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
                            {commit.isSelected ? (
                                <div
                                    style={{
                                        fontSize: "var(--text-sm)",
                                        color: "var(--color-text-muted)",
                                    }}
                                >
                                    Walks both parents to find the nearest common ancestor instead of stopping at the first match.
                                </div>
                            ) : undefined}
                        </div>
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
                <span className="flex-1" />
                <Button variant="contained" size="small" disabled>
                    Push
                </Button>
            </div>
        </div>
    );
}

//
// Renders the commit menu below the "More actions" button, on the overlay shadow. Opening and
// closing fade and slide it with the normal duration and the standard easing. With `showHover`
// the first item is drawn with the hover background.
//
export function CommitMenu({ isOpen, showHover }: { isOpen: boolean; showHover: boolean }): ReactNode {
    return (
        <div
            role="menu"
            aria-hidden={!isOpen}
            className="absolute flex flex-col"
            style={{
                top: "calc(var(--space-2) * 2 + 28px)",
                right: "var(--space-2)",
                zIndex: 1,
                padding: "var(--space-1)",
                background: "var(--color-panel)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-overlay)",
                fontSize: "var(--text-sm)",
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "none" : "translateY(calc(var(--space-2) * -1)) scale(0.96)",
                transformOrigin: "top right",
                pointerEvents: isOpen ? "auto" : "none",
                transition: "opacity var(--duration-normal) var(--ease-standard), transform var(--duration-normal) var(--ease-standard)",
            }}
        >
            {["Check out", "Cherry-pick", "Copy hash"].map((item, itemIndex) => (
                <div
                    key={item}
                    role="menuitem"
                    className="hover:bg-(color:--color-hover)"
                    style={{
                        background: showHover && itemIndex === 0 ? "var(--color-hover)" : undefined,
                        padding: "var(--space-1) var(--space-3)",
                        borderRadius: "var(--radius-sm)",
                        transition: "background-color var(--duration-fast) var(--ease-standard)",
                    }}
                >
                    {item}
                </div>
            ))}
            <div
                role="menuitem"
                aria-disabled="true"
                style={{
                    padding: "var(--space-1) var(--space-3)",
                    color: "var(--color-text-disabled)",
                }}
            >
                Revert (uncommitted changes)
            </div>
        </div>
    );
}

//
// Renders a graph lane for each lane colour in `lanes`, with a dot on the lane at position
// `activeLane`, from 1, coloured by the lane tokens. The lanes
// run the full height of the row, so they join the lanes of the rows above and below without a
// break. The dot sits on the middle of the commit message line, with a ring in `ringColour`,
// the row's background, so it stands clear of the lane line.
//
export function LaneMarks({ lanes, activeLane, ringColour }: { lanes: number[]; activeLane: number; ringColour: string }): ReactNode {
    return (
        <div
            aria-hidden="true"
            className="relative shrink-0"
            style={{
                width: "36px",
            }}
        >
            {lanes.map((lane, laneIndex) => (
                <div
                    key={lane}
                    data-lane={lane}
                    className="absolute top-0 bottom-0"
                    style={{
                        left: `${(laneIndex + 1) * 10 - 1}px`,
                        width: "2px",
                        background: `var(--color-lane-${lane}, var(--color-accent))`,
                    }}
                />
            ))}
            <div
                className="absolute"
                style={{
                    left: `${activeLane * 10 - 5}px`,
                    top: "calc(var(--space-1) + var(--text-md) * var(--leading-normal) / 2 - 5px)",
                    width: "10px",
                    height: "10px",
                    borderRadius: "var(--radius-full)",
                    background: `var(--color-lane-${lanes[activeLane - 1]}, var(--color-accent))`,
                    boxShadow: `0 0 0 2px ${ringColour}, 0 0 0 2px var(--color-panel)`,
                }}
            />
        </div>
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
