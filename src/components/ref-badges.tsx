//
// The column of a commit's ref badges in the commit list. It shows the badges that fit its width,
// then a "..." button whose dropdown lists every badge, so a commit with many refs keeps its row
// on one line and its other columns in line with the rows around it.
//

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { RefBadge, type RefKind } from "../pages/badges";

//
// One ref the column shows: its kind and the name its badge shows.
//
export interface IBadgeRef {
    //
    // The kind of ref, which picks the badge's look.
    //
    kind: RefKind;

    //
    // The ref's name, as in "origin/main".
    //
    name: string;
}

//
// The width of the badge column, in pixels: room for a branch name such as origin/main, or two
// short ones side by side.
//
export const BADGES_COLUMN_WIDTH = 160;

//
// The room the "..." button takes, in pixels, with the gap before it.
//
const MORE_BUTTON_WIDTH = 32;

//
// The gap between badges, in pixels, the same as --space-1.
//
const BADGE_GAP = 4;

//
// Returns how many of the badges, `widths` in pixels in order, fit in `available` pixels with a
// gap between each, leaving room for the "..." button when they do not all fit.
//
export function fittingBadgeCount(widths: number[], available: number): number {
    const total = widths.reduce((sum, width) => sum + width, 0) + BADGE_GAP * Math.max(widths.length - 1, 0);
    if (total <= available) {
        return widths.length;
    }
    let used = MORE_BUTTON_WIDTH;
    let count = 0;
    for (const width of widths) {
        const next = used + width + (count > 0 ? BADGE_GAP : 0);
        if (next > available) {
            break;
        }
        used = next;
        count += 1;
    }
    return count;
}

//
// Renders the column: the badges that fit, then the "..." button when some are left out. The
// badges are measured once in a hidden copy of the row. The first badge always shows, cut short
// with an ellipsis when it alone is wider than the column.
//
export function RefBadges({ refs }: { refs: IBadgeRef[] }): ReactNode {
    const measureRef = useRef<HTMLSpanElement>(null);
    const [shownCount, setShownCount] = useState(refs.length);
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);

    useLayoutEffect(() => {
        const measure = measureRef.current;
        if (!measure) {
            return;
        }
        const widths = [...measure.children].map(child => (child instanceof HTMLElement ? child.offsetWidth : 0));
        setShownCount(Math.max(fittingBadgeCount(widths, BADGES_COLUMN_WIDTH), Math.min(refs.length, 1)));
    }, [refs]);

    const hidden = refs.length - shownCount;
    return (
        <span className="relative flex flex-none items-center overflow-hidden" style={{ width: `${BADGES_COLUMN_WIDTH}px`, gap: `${BADGE_GAP}px` }}>
            <span ref={measureRef} aria-hidden="true" className="pointer-events-none absolute flex" style={{ visibility: "hidden", whiteSpace: "nowrap", gap: `${BADGE_GAP}px` }}>
                {refs.map(gitRef => (
                    <span key={`${gitRef.kind}-${gitRef.name}`} className="flex-none">
                        <RefBadge kind={gitRef.kind} name={gitRef.name} />
                    </span>
                ))}
            </span>
            {refs.slice(0, shownCount).map(gitRef => (
                <span key={`${gitRef.kind}-${gitRef.name}`} className="flex min-w-0 flex-none [&_.MuiChip-root]:max-w-full" style={{ maxWidth: refs.length > shownCount ? `${BADGES_COLUMN_WIDTH - MORE_BUTTON_WIDTH}px` : "100%" }}>
                    <RefBadge kind={gitRef.kind} name={gitRef.name} />
                </span>
            ))}
            {hidden > 0 ? (
                <>
                    <Tooltip title={`${hidden} more`}>
                        <IconButton
                            size="small"
                            aria-label={`Show all ${refs.length} refs`}
                            aria-haspopup="dialog"
                            aria-expanded={anchor !== undefined}
                            onClick={event => {
                                event.stopPropagation();
                                setAnchor(event.currentTarget);
                            }}
                        >
                            <FontAwesomeIcon icon={faEllipsis} />
                        </IconButton>
                    </Tooltip>
                    <Popover
                        open={anchor !== undefined}
                        anchorEl={anchor}
                        onClose={() => setAnchor(undefined)}
                        onClick={event => event.stopPropagation()}
                        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                        transformOrigin={{ vertical: "top", horizontal: "left" }}
                        slotProps={{ paper: { role: "dialog", "aria-label": "Refs" } }}
                    >
                        <div className="flex flex-col items-start" style={{ gap: "var(--space-2)", padding: "var(--space-3)" }}>
                            {refs.map(gitRef => (
                                <RefBadge key={`${gitRef.kind}-${gitRef.name}`} kind={gitRef.kind} name={gitRef.name} />
                            ))}
                        </div>
                    </Popover>
                </>
            ) : undefined}
        </span>
    );
}
