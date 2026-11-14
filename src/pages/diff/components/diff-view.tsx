//
// The diff view: a file's diff drawn in the code font, either unified (old and new lines in one
// column) or side by side (old on the left, new on the right), with line numbers, added and
// deleted lines on their colours, the words that changed within a line marked, and the unchanged
// lines between hunks collapsed behind a button that shows them.
//

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import { Tip } from "../../../components/tip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsUpDown } from "@fortawesome/free-solid-svg-icons";
import { changePartners, parseHunks, splitRows, wordPieces, type IDiffLine, type IHunk } from "../model";

//
// How a diff is laid out.
//
export type DiffLayout = "unified" | "split";

//
// What the diff view shows and how.
//
export interface IDiffViewProps {
    //
    // The file's diff as `git diff` writes it from the first `@@` line.
    //
    diff: string;

    //
    // Unified or side by side.
    //
    layout: DiffLayout;

    //
    // True to wrap long lines inside the view, false to keep each line on one row and scroll
    // sideways.
    //
    wrap: boolean;

    //
    // The whole of the old file, one entry per line, so the collapsed unchanged lines can be shown.
    // Absent when only the diff is known, and then the collapsed lines show only their count.
    //
    oldFileLines?: string[];

    //
    // Returns what a hunk's bar shows at its right edge, such as a button that stages the hunk,
    // given the hunk's position from 0. Absent for a diff with nothing to do to a hunk.
    //
    hunkAction?: (hunkIndex: number) => ReactNode;

    //
    // The position of the hunk the keys are on, from 0, drawn with a border all the way round it in
    // the colour of a selection inside the active pane. Absent when the keys are on no hunk.
    //
    currentHunk?: number;

    //
    // True to show every unchanged line of the file, false to fold the runs between hunks away
    // until each is asked for. Takes effect only when the old file is known.
    //
    showAllLines?: boolean;

    //
    // Called with a hunk's position when it is clicked, so the click makes it the current hunk.
    //
    onSelectHunk?: (hunkIndex: number) => void;

    //
    // The text to find in the diff, matched ignoring case. Absent or empty for no search.
    //
    search?: string;

    //
    // The number of the search match to fill with the accent, from 0.
    //
    currentMatch?: number;

    //
    // Called with how many matches of the search the view draws, each time it draws.
    //
    onMatchCount?: (count: number) => void;

    //
    // The position each hunk of `diff` has in the whole file's diff, for a diff that shows only
    // some of a file's hunks. Hunk actions, the current hunk and each hunk's data-hunk-index use
    // these positions. Absent when `diff` is the whole file's diff.
    //
    hunkIndexes?: number[];
}

//
// The colours of each kind of line: its background, the marker before it and its marker's colour,
// and the colour of the words that changed within it.
//
const lineStyles = {
    context: {
        background: "var(--color-panel)",
        marker: " ",
        markerColour: "var(--color-text-muted)",
        wordBackground: "transparent",
    },
    added: {
        background: "var(--color-diff-added)",
        marker: "+",
        markerColour: "var(--color-diff-added-line)",
        wordBackground: "var(--color-diff-added-word)",
    },
    deleted: {
        background: "var(--color-diff-removed)",
        marker: "−",
        markerColour: "var(--color-diff-removed-line)",
        wordBackground: "var(--color-diff-removed-word)",
    },
};

//
// The width of a line number gutter.
//
const GUTTER_WIDTH = "calc(var(--space-8) + var(--space-2))";

//
// The striped fill of an empty side in the side-by-side view, where the other side added or
// deleted a line with no partner.
//
const EMPTY_SIDE = "repeating-linear-gradient(135deg, var(--color-raised) 0 4px, transparent 4px 8px)";

//
// What a search of the diff looks for and which match is current, shared with every line the
// view draws, with the number of each hunk line's first match.
//
export interface IDiffSearch {
    //
    // The text searched for, matched ignoring case. Empty for no search.
    //
    needle: string;

    //
    // The number of the current match, from 0, or undefined for none.
    //
    current: number | undefined;

    //
    // The number of each hunk line's first match, numbering the matches through the hunks in
    // order. Lines with no number, such as unchanged lines shown between hunks, are not searched.
    //
    firstMatch: ReadonlyMap<IDiffLine, number>;
}

//
// Holds the diff view's search for the lines it draws.
//
export const DiffSearchContext = createContext<IDiffSearch>({ needle: "", current: undefined, firstMatch: new Map() });

//
// Counts the matches of `needle`, already in lower case, in `text`, ignoring case.
//
export function countMatches(text: string, needle: string): number {
    if (needle === "") {
        return 0;
    }
    let count = 0;
    const lower = text.toLowerCase();
    for (let found = lower.indexOf(needle); found >= 0; found = lower.indexOf(needle, found + needle.length)) {
        count += 1;
    }
    return count;
}

//
// Renders `text` with every match of the search marked: an accent outline on each match and the
// accent filling the current one. `first` is the number of the first match in `text`, or
// undefined for text that is not searched. Each match carries its number, so the view can scroll
// to it.
//
export function SearchMatches({ text, search, first }: { text: string; search: IDiffSearch; first: number | undefined }): ReactNode {
    const needle = search.needle.toLowerCase();
    if (needle === "" || first === undefined) {
        return text;
    }
    const parts: ReactNode[] = [];
    const lower = text.toLowerCase();
    let start = 0;
    let next = first;
    for (let found = lower.indexOf(needle); found >= 0; found = lower.indexOf(needle, start)) {
        if (found > start) {
            parts.push(text.slice(start, found));
        }
        const number = next;
        next += 1;
        const isCurrent = number === search.current;
        parts.push(
            <mark
                key={found}
                data-search-match={number}
                data-current-match={isCurrent}
                style={{
                    background: isCurrent ? "var(--color-accent)" : "transparent",
                    color: isCurrent ? "var(--color-on-accent)" : "inherit",
                    boxShadow: "0 0 0 1px var(--color-accent)",
                    borderRadius: "var(--radius-sm)",
                }}
            >
                {text.slice(found, found + needle.length)}
            </mark>,
        );
        start = found + needle.length;
    }
    if (start < text.length) {
        parts.push(text.slice(start));
    }
    return parts;
}

//
// Renders a line's text: the words that changed against `partner` on the stronger colour of the
// line's kind, and the rest plain. With no partner the text is plain. A line that ends with no
// line break is marked so at its end.
//
export function LineText({ line, partner, wrap }: { line: IDiffLine; partner: IDiffLine | undefined; wrap: boolean }): ReactNode {
    const style = lineStyles[line.kind];
    const search = useContext(DiffSearchContext);
    const pieces = partner ? wordPieces(line.text, partner.text) : [{ text: line.text, isChanged: false }];
    const lineFirst = search.firstMatch.get(line);
    const needle = search.needle.toLowerCase();
    const pieceFirsts: (number | undefined)[] = [];
    let running = lineFirst;
    for (const piece of pieces) {
        pieceFirsts.push(running);
        running = running === undefined ? undefined : running + countMatches(piece.text, needle);
    }
    return (
        <span
            className="min-w-0 flex-1"
            style={{
                whiteSpace: wrap ? "pre-wrap" : "pre",
                overflowWrap: wrap ? "anywhere" : "normal",
                paddingRight: "var(--space-4)",
            }}
        >
            {pieces.map((piece, index) =>
                piece.isChanged ? (
                    <mark
                        key={index}
                        data-word-change={line.kind}
                        style={{ background: style.wordBackground, color: "inherit", borderRadius: "var(--radius-sm)" }}
                    >
                        <SearchMatches text={piece.text} search={search} first={pieceFirsts[index]} />
                    </mark>
                ) : (
                    <span key={index}>
                        <SearchMatches text={piece.text} search={search} first={pieceFirsts[index]} />
                    </span>
                ),
            )}
            {line.hasNoNewline ? (
                <span
                    title="No newline at end of file"
                    style={{
                        marginLeft: "var(--space-2)",
                        padding: "0 var(--space-1)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-muted)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        whiteSpace: "nowrap",
                    }}
                >
                    No newline at end
                </span>
            ) : undefined}
        </span>
    );
}

//
// Renders a line number in its gutter, or an empty gutter.
//
export function Gutter({ number }: { number: number | undefined }): ReactNode {
    return (
        <span className="flex-none select-none text-right" style={{ width: GUTTER_WIDTH, paddingRight: "var(--space-2)", color: "var(--color-text-muted)" }}>
            {number ?? ""}
        </span>
    );
}

//
// Renders a line's marker, "+" or "−", in its colour.
//
export function Marker({ line }: { line: IDiffLine }): ReactNode {
    const style = lineStyles[line.kind];
    return (
        <span className="flex-none select-none text-center" style={{ width: "var(--space-4)", color: style.markerColour, fontWeight: "var(--weight-bold)" }}>
            {style.marker}
        </span>
    );
}

//
// Renders one row of the unified view: both line numbers, the marker and the text.
//
export function UnifiedRow({ line, partner, wrap }: { line: IDiffLine; partner: IDiffLine | undefined; wrap: boolean }): ReactNode {
    return (
        <div role="row" data-line={line.kind} className="flex" style={{ background: lineStyles[line.kind].background }}>
            <Gutter number={line.oldNumber} />
            <Gutter number={line.newNumber} />
            <Marker line={line} />
            <LineText line={line} partner={partner} wrap={wrap} />
        </div>
    );
}

//
// Renders one side of a row of the side-by-side view: the line's number on that side, its marker
// and its text, or the striped fill where the side has no line.
//
export function SplitSide({ line, side, partner, wrap }: { line: IDiffLine | undefined; side: "old" | "new"; partner: IDiffLine | undefined; wrap: boolean }): ReactNode {
    if (!line) {
        return <div className="min-w-0 flex-1" data-side={side} data-empty="true" style={{ background: EMPTY_SIDE }} />;
    }
    return (
        <div className="flex min-w-0 flex-1" data-side={side} data-line={line.kind} style={{ background: lineStyles[line.kind].background }}>
            <Gutter number={side === "old" ? line.oldNumber : line.newNumber} />
            <Marker line={line} />
            <LineText line={line} partner={partner} wrap={wrap} />
        </div>
    );
}

//
// The unchanged lines between two hunks, before the first or after the last: where they start in
// the old file, how many there are and how far the new file's numbers run ahead of the old file's
// there.
//
interface IGap {
    //
    // The first unchanged line, numbered in the old file.
    //
    oldStart: number;

    //
    // How many unchanged lines there are.
    //
    count: number;

    //
    // The new file's line number minus the old file's for these lines.
    //
    shift: number;
}

//
// Returns the unchanged lines before `hunk`, after the hunk before it, or after the last hunk when
// `hunk` is undefined and the whole old file is known.
//
export function gapBefore(hunks: IHunk[], index: number, oldFileLength: number | undefined): IGap {
    const previous = hunks[index - 1];
    const oldStart = previous ? previous.oldStart + previous.oldCount : 1;
    const previousShift = previous ? previous.newStart + previous.lines.filter(line => line.kind !== "deleted").length - (previous.oldStart + previous.oldCount) : 0;
    const hunk = hunks[index];
    if (hunk) {
        return { oldStart, count: Math.max(hunk.oldStart - oldStart, 0), shift: hunk.newStart - hunk.oldStart };
    }
    return { oldStart, count: oldFileLength === undefined ? 0 : Math.max(oldFileLength - oldStart + 1, 0), shift: previousShift };
}

//
// Renders a run of unchanged lines that the diff leaves out, then the header of the hunk after it:
// a bar with how many lines are left out and, when the old file is known, a button that shows them
// in place, then the hunk's range and the function or section it is in. Once shown, the lines sit
// above the hunk's bar. `action` shows at the bar's right edge, the hunk's top right, and stays in
// view while the diff scrolls sideways. With `startsOpen` the lines show from the start.
//
export function GapBar({
    gap,
    hunk,
    layout,
    wrap,
    oldFileLines,
    action,
    startsOpen = false,
}: {
    gap: IGap;
    hunk: IHunk | undefined;
    layout: DiffLayout;
    wrap: boolean;
    oldFileLines: string[] | undefined;
    action?: ReactNode;
    startsOpen?: boolean;
}): ReactNode {
    const [isOpen, setIsOpen] = useState(startsOpen);
    const context = hunk ? hunk.header.replace(/^@@[^@]*@@\s?/, "") : "";
    const range = hunk ? hunk.header.slice(0, hunk.header.length - context.length).trim() : "";
    if (isOpen && oldFileLines) {
        const lines: IDiffLine[] = oldFileLines.slice(gap.oldStart - 1, gap.oldStart - 1 + gap.count).map((text, offset) => ({
            kind: "context",
            oldNumber: gap.oldStart + offset,
            newNumber: gap.oldStart + offset + gap.shift,
            text,
        }));
        return (
            <>
                {lines.map(line =>
                    layout === "unified" ? (
                        <UnifiedRow key={line.oldNumber} line={line} partner={undefined} wrap={wrap} />
                    ) : (
                        <div key={line.oldNumber} role="row" className="flex">
                            <SplitSide line={line} side="old" partner={undefined} wrap={wrap} />
                            <SplitSide line={line} side="new" partner={undefined} wrap={wrap} />
                        </div>
                    ),
                )}
                {hunk ? <GapBar gap={{ ...gap, count: 0 }} hunk={hunk} layout={layout} wrap={wrap} oldFileLines={undefined} action={action} /> : undefined}
            </>
        );
    }
    if (gap.count === 0 && !hunk) {
        return undefined;
    }
    return (
        <div
            role="row"
            data-line="hunk"
            className="flex items-center"
            style={{ gap: "var(--space-3)", minHeight: "calc(var(--space-6) + var(--space-1))", background: "var(--color-raised)", color: "var(--color-text-muted)" }}
        >
            {gap.count > 0 && oldFileLines ? (
                <Tooltip title={<Tip title={`Show ${gap.count} unchanged ${gap.count === 1 ? "line" : "lines"}`} detail="Lines the change left as they were." />}>
                    <ButtonBase
                        aria-label={`Show ${gap.count} unchanged lines`}
                        onClick={() => setIsOpen(true)}
                        className="flex-none self-stretch"
                        sx={{
                            width: `calc(${GUTTER_WIDTH} * ${layout === "unified" ? 2 : 1})`,
                            color: "var(--color-accent)",
                            fontSize: "var(--icon-sm)",
                            "&:hover": { backgroundColor: "var(--color-hover)" },
                            "&.Mui-focusVisible": { outline: "var(--focus-ring-width) solid var(--color-focus)", outlineOffset: "calc(var(--focus-ring-width) * -1)" },
                        }}
                    >
                        <FontAwesomeIcon icon={faArrowsUpDown} />
                    </ButtonBase>
                </Tooltip>
            ) : (
                <span className="flex-none" style={{ width: `calc(${GUTTER_WIDTH} * ${layout === "unified" ? 2 : 1})` }} />
            )}
            <span style={{ whiteSpace: "pre" }}>
                {gap.count > 0 ? `${gap.count} unchanged ${gap.count === 1 ? "line" : "lines"}` : ""}
                {gap.count > 0 && range ? "   " : ""}
                {range}
                {context ? <span style={{ fontFamily: "var(--font-sans)" }}>{`  ${context}`}</span> : undefined}
            </span>
            <span className="flex-1" />
            {action ? (
                <span
                    className="flex flex-none items-center"
                    style={{
                        position: "sticky",
                        right: 0,
                        gap: "var(--space-2)",
                        padding: "0 var(--space-2)",
                        background: "var(--color-raised)",
                        fontFamily: "var(--font-sans)",
                    }}
                >
                    {action}
                </span>
            ) : undefined}
        </div>
    );
}

//
// Renders the diff. Each hunk follows a bar with the unchanged lines before it, and a bar after
// the last hunk counts the unchanged lines to the end of the file when the old file is known.
// Without wrapping, the view is as wide as its longest line and scrolls sideways inside its
// container.
//
export function DiffView({ diff, layout, wrap, oldFileLines, hunkAction, currentHunk, showAllLines = false, hunkIndexes, search = "", currentMatch, onMatchCount, onSelectHunk }: IDiffViewProps): ReactNode {
    const hunks = parseHunks(diff);
    const needle = search.trim().toLowerCase();
    const firstMatch = new Map<IDiffLine, number>();
    let matchTotal = 0;
    for (const hunk of hunks) {
        for (const line of hunk.lines) {
            firstMatch.set(line, matchTotal);
            matchTotal += countMatches(line.text, needle);
        }
    }

    useEffect(() => {
        onMatchCount?.(matchTotal);
    }, [matchTotal, onMatchCount]);

    return (
        <DiffSearchContext.Provider value={{ needle: search.trim(), current: currentMatch, firstMatch }}>
        <div
            role="table"
            aria-label={layout === "unified" ? "Unified diff" : "Side-by-side diff"}
            style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                lineHeight: "var(--leading-normal)",
                minWidth: wrap ? undefined : "max-content",
            }}
        >
            {hunks.map((hunk, position) => {
                const index = hunkIndexes?.[position] ?? position;
                const partners = changePartners(hunk.lines);
                return (
                    <div
                        key={hunk.header + index}
                        role="rowgroup"
                        data-hunk-index={index}
                        data-current={currentHunk === index}
                        onClick={onSelectHunk ? () => onSelectHunk(index) : undefined}
                        style={{ position: "relative", cursor: onSelectHunk ? "pointer" : undefined }}
                    >
                        {currentHunk === index ? (
                            <span
                                aria-hidden="true"
                                style={{
                                    position: "absolute",
                                    inset: "calc(var(--space-1) / 2)",
                                    border: "2px solid var(--color-select-item)",
                                    borderRadius: "var(--radius-sm)",
                                    pointerEvents: "none",
                                    zIndex: 1,
                                }}
                            />
                        ) : undefined}
                        <GapBar
                            key={`gap-${showAllLines}`}
                            startsOpen={showAllLines}
                            gap={gapBefore(hunks, position, oldFileLines?.length)}
                            hunk={hunk}
                            layout={layout}
                            wrap={wrap}
                            oldFileLines={oldFileLines}
                            action={hunkAction?.(index)}
                        />
                        {layout === "unified"
                            ? hunk.lines.map((line, lineIndex) => <UnifiedRow key={lineIndex} line={line} partner={partners.get(line)} wrap={wrap} />)
                            : splitRows(hunk.lines).map((row, rowIndex) => (
                                  <div key={rowIndex} role="row" className="flex" style={{ gap: "1px", background: "var(--color-border)" }}>
                                      <SplitSide line={row.old} side="old" partner={row.old ? partners.get(row.old) : undefined} wrap={wrap} />
                                      <SplitSide line={row.new} side="new" partner={row.new ? partners.get(row.new) : undefined} wrap={wrap} />
                                  </div>
                              ))}
                    </div>
                );
            })}
            <GapBar key={`gap-end-${showAllLines}`} startsOpen={showAllLines} gap={gapBefore(hunks, hunks.length, oldFileLines?.length)} hunk={undefined} layout={layout} wrap={wrap} oldFileLines={oldFileLines} />
        </div>
        </DiffSearchContext.Provider>
    );
}
