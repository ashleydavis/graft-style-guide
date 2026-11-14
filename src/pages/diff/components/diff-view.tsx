//
// The diff view: a file's diff drawn in the code font, either unified (old and new lines in one
// column) or side by side (old on the left, new on the right), with line numbers, added and
// deleted lines on their colours, the words that changed within a line marked, and the unchanged
// lines between hunks collapsed behind a button that shows them.
//

import { createContext, Fragment, useContext, useEffect, useMemo, type ReactNode } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import { Tip } from "../../../components/tip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsUpDown, faCheck, faCompress, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import Checkbox from "@mui/material/Checkbox";
import { changePartners, gapBefore, parseHunks, splitRows, wordPieces, type IDiffLine, type IGap, type IHunk } from "../model";

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
    // The position of the run of unchanged lines the keys are on, 0 before the first hunk and the
    // hunk count after the last, drawn with the same border. Absent when the keys are on no run.
    //
    currentGap?: number;

    //
    // The runs of unchanged lines shown or hidden by their own buttons or by Space, by position. A
    // run with no entry follows `showAllLines`.
    //
    gapStates?: ReadonlyMap<number, boolean>;

    //
    // Called with a run's position and whether it should show, when its button is clicked.
    //
    onGapStateChange?: (gapIndex: number, isShown: boolean) => void;

    //
    // Called with a run's position when its bar is clicked, so the click makes it the current stop.
    //
    onSelectGap?: (gapIndex: number) => void;

    //
    // The line selection, which turns on the line selection mode: a box before each changed line.
    // Absent outside the mode.
    //
    lineSelection?: Omit<ILineSelection, "idOf">;

    //
    // For each hunk of `diff`, the position each of its lines has in that hunk's lines in the
    // whole file's diff, for a diff that shows one side of a change staged in part. Absent when
    // the lines are the whole file's.
    //
    lineIndexes?: number[][];

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
    // order, counting the unchanged lines shown between hunks.
    //
    firstMatch: ReadonlyMap<IDiffLine, number>;
}

//
// Holds the diff view's search for the lines it draws.
//
export const DiffSearchContext = createContext<IDiffSearch>({ needle: "", current: undefined, firstMatch: new Map() });

//
// The line selection of a diff in its line selection mode: a line's id from the line, which lines
// are selected and staged, and what a click on a line's box does. Absent outside the mode.
//
export interface ILineSelection {
    //
    // Returns a changed line's id, "hunk:line" with the hunk's and the line's positions in the
    // whole file's diff, or undefined for a line that cannot be selected.
    //
    idOf: (line: IDiffLine) => string | undefined;

    //
    // The ids of the selected lines.
    //
    selected: ReadonlySet<string>;

    //
    // The ids of the staged lines, marked beside their boxes, or undefined where the card's own
    // section says it.
    //
    staged: ReadonlySet<string> | undefined;

    //
    // Called with a line's id when its box is clicked, and whether Shift was held, which selects
    // every line from the last one clicked.
    //
    onToggle: (id: string, isRange: boolean) => void;
}

//
// Holds the diff view's line selection for the lines it draws.
//
export const LineSelectionContext = createContext<ILineSelection | undefined>(undefined);

//
// Renders a line's selection box in the line selection mode: a checkbox for a changed line, with a
// mark for a staged line, and an empty cell of the same width for a kept line, so the columns line
// up. Renders nothing outside the mode.
//
export function LineSelectCell({ line }: { line: IDiffLine | undefined }): ReactNode {
    const selection = useContext(LineSelectionContext);
    if (!selection) {
        return undefined;
    }
    const id = line ? selection.idOf(line) : undefined;
    const isStaged = id !== undefined && selection.staged?.has(id) === true;
    return (
        <span className="flex flex-none select-none items-center" style={{ width: "calc(var(--space-8) + var(--space-2))", gap: "var(--space-1)", paddingLeft: "var(--space-1)" }}>
            {id !== undefined ? (
                <>
                    <Checkbox
                        size="small"
                        checked={selection.selected.has(id)}
                        onClick={event => {
                            event.stopPropagation();
                            selection.onToggle(id, event.shiftKey);
                        }}
                        slotProps={{ input: { "aria-label": `Select line ${line?.newNumber ?? line?.oldNumber}` } }}
                        sx={{ padding: 0, "& .MuiSvgIcon-root": { fontSize: "var(--icon-md)" } }}
                    />
                    {isStaged ? (
                        <Tooltip title="Staged">
                            <span aria-label="Staged" style={{ color: "var(--color-success)", fontSize: "var(--icon-sm)" }}>
                                <FontAwesomeIcon icon={faCheck} />
                            </span>
                        </Tooltip>
                    ) : undefined}
                </>
            ) : undefined}
        </span>
    );
}

//
// Returns the background of a selected line in the line selection mode: the selected wash laid
// over the line's own colour. Returns the line's own colour for a line that is not selected.
//
function useLineBackground(line: IDiffLine | undefined, background: string): string {
    const selection = useContext(LineSelectionContext);
    const id = line && selection ? selection.idOf(line) : undefined;
    if (id !== undefined && selection?.selected.has(id)) {
        return `linear-gradient(var(--color-selected), var(--color-selected)), ${background}`;
    }
    return background;
}

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
    const background = useLineBackground(line, lineStyles[line.kind].background);
    return (
        <div role="row" data-line={line.kind} className="flex" style={{ background }}>
            <LineSelectCell line={line} />
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
    const background = useLineBackground(line, line ? lineStyles[line.kind].background : EMPTY_SIDE);
    if (!line) {
        return <div className="min-w-0 flex-1" data-side={side} data-empty="true" style={{ background: EMPTY_SIDE }} />;
    }
    return (
        <div className="flex min-w-0 flex-1" data-side={side} data-line={line.kind} style={{ background }}>
            <LineSelectCell line={line.kind === "context" && side === "new" ? undefined : line} />
            <Gutter number={side === "old" ? line.oldNumber : line.newNumber} />
            <Marker line={line} />
            <LineText line={line} partner={partner} wrap={wrap} />
        </div>
    );
}
//
// Renders the button in a gap bar's line number gutter that shows or hides a run of unchanged
// lines, with a tooltip that says which.
//
function GapButton({ layout, label, detail, icon, onClick }: { layout: DiffLayout; label: string; detail: string; icon: IconDefinition; onClick: () => void }): ReactNode {
    return (
        <Tooltip title={<Tip title={label} detail={detail} />}>
            <ButtonBase
                aria-label={label}
                onClick={event => {
                    event.stopPropagation();
                    onClick();
                }}
                className="flex-none self-stretch"
                sx={{
                    width: `calc(${GUTTER_WIDTH} * ${layout === "unified" ? 2 : 1})`,
                    color: "var(--color-accent)",
                    fontSize: "var(--icon-sm)",
                    "&:hover": { backgroundColor: "var(--color-hover)" },
                    "&.Mui-focusVisible": { outline: "var(--focus-ring-width) solid var(--color-focus)", outlineOffset: "calc(var(--focus-ring-width) * -1)" },
                }}
            >
                <FontAwesomeIcon icon={icon} />
            </ButtonBase>
        </Tooltip>
    );
}

//
// Returns the unchanged lines of `gap` from the old file, numbered in both files.
//
export function gapLines(gap: IGap, oldFileLines: string[]): IDiffLine[] {
    return oldFileLines.slice(gap.oldStart - 1, gap.oldStart - 1 + gap.count).map((text, offset) => ({
        kind: "context",
        oldNumber: gap.oldStart + offset,
        newNumber: gap.oldStart + offset + gap.shift,
        text,
    }));
}

//
// Renders the border that marks the current hunk or run of unchanged lines, set a little inside it
// so it stays clear of the pane's own border.
//
function CurrentBorder(): ReactNode {
    return (
        <span
            aria-hidden="true"
            style={{
                position: "absolute",
                inset: "calc(var(--space-1) / 2) var(--space-1)",
                border: "2px solid var(--color-select-item)",
                borderRadius: "var(--radius-sm)",
                pointerEvents: "none",
                zIndex: 1,
            }}
        />
    );
}

//
// Renders a run of unchanged lines the diff leaves out, as its own group of rows that can be the
// current stop: a bar with how many lines there are and, when the old file is known, a button that
// shows them in place, or once they show, folds them away again. `isShown` says which. Clicking
// the bar makes the run the current stop. A run with no lines draws nothing.
//
export function GapRows({
    gap,
    position,
    layout,
    wrap,
    lines,
    isShown,
    onToggle,
    isCurrent,
    onSelect,
}: {
    gap: IGap;
    position: number;
    layout: DiffLayout;
    wrap: boolean;
    lines: IDiffLine[] | undefined;
    isShown: boolean;
    onToggle: () => void;
    isCurrent: boolean;
    onSelect?: () => void;
}): ReactNode {
    if (gap.count === 0) {
        return undefined;
    }
    const count = `${gap.count} unchanged ${gap.count === 1 ? "line" : "lines"}`;
    return (
        <div role="rowgroup" data-gap-index={position} data-current={isCurrent} onClick={lines ? onSelect : undefined} style={{ position: "relative", cursor: lines && onSelect ? "pointer" : undefined }}>
            {isCurrent ? <CurrentBorder /> : undefined}
            <div role="row" data-line="gap" className="flex items-center" style={{ gap: "var(--space-3)", minHeight: "calc(var(--space-6) + var(--space-1))", background: "var(--color-raised)", color: "var(--color-text-muted)" }}>
                <LineSelectCell line={undefined} />
                {lines ? (
                    isShown ? (
                        <GapButton layout={layout} label={`Hide ${count}`} detail="Folds these lines away again." icon={faCompress} onClick={onToggle} />
                    ) : (
                        <GapButton layout={layout} label={`Show ${count}`} detail="Lines the change left as they were." icon={faArrowsUpDown} onClick={onToggle} />
                    )
                ) : (
                    <span className="flex-none" style={{ width: `calc(${GUTTER_WIDTH} * ${layout === "unified" ? 2 : 1})` }} />
                )}
                <span style={{ whiteSpace: "pre" }}>{count}</span>
            </div>
            {lines && isShown
                ? lines.map(line =>
                      layout === "unified" ? (
                          <UnifiedRow key={line.oldNumber} line={line} partner={undefined} wrap={wrap} />
                      ) : (
                          <div key={line.oldNumber} role="row" className="flex">
                              <SplitSide line={line} side="old" partner={undefined} wrap={wrap} />
                              <SplitSide line={line} side="new" partner={undefined} wrap={wrap} />
                          </div>
                      ),
                  )
                : undefined}
        </div>
    );
}

//
// Renders a hunk's header row: the hunk's range and the function or section it is in, with
// `action` at the row's right edge, the hunk's top right, staying in view while the diff scrolls
// sideways.
//
export function HunkHeader({ hunk, layout, action }: { hunk: IHunk; layout: DiffLayout; action?: ReactNode }): ReactNode {
    const context = hunk.header.replace(/^@@[^@]*@@\s?/, "");
    const range = hunk.header.slice(0, hunk.header.length - context.length).trim();
    return (
        <div
            role="row"
            data-line="hunk"
            className="flex items-center"
            style={{ gap: "var(--space-3)", minHeight: "calc(var(--space-6) + var(--space-1))", background: "var(--color-raised)", color: "var(--color-text-muted)" }}
        >
            <LineSelectCell line={undefined} />
            <span className="flex-none" style={{ width: `calc(${GUTTER_WIDTH} * ${layout === "unified" ? 2 : 1})` }} />
            <span style={{ whiteSpace: "pre" }}>
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
                        //
                        // Room on the right and above and below, so the buttons stay clear of the
                        // current hunk's border.
                        //
                        padding: "var(--space-1) var(--space-3) var(--space-1) var(--space-2)",
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
// Renders the diff. Each hunk follows the run of unchanged lines before it, and a run after the
// last hunk counts the unchanged lines to the end of the file when the old file is known. Each run
// shows or hides as `gapStates` says, following `showAllLines` where it says nothing. Without
// wrapping, the view is as wide as its longest line and scrolls sideways inside its container.
//
export function DiffView({
    diff,
    layout,
    wrap,
    oldFileLines,
    hunkAction,
    currentHunk,
    currentGap,
    showAllLines = false,
    gapStates = new Map(),
    onGapStateChange,
    hunkIndexes,
    search = "",
    currentMatch,
    onMatchCount,
    onSelectHunk,
    onSelectGap,
    lineSelection,
    lineIndexes,
}: IDiffViewProps): ReactNode {
    const hunks = useMemo(() => parseHunks(diff), [diff]);
    const lineIds = useMemo(() => {
        const ids = new Map<IDiffLine, string>();
        hunks.forEach((hunk, position) => {
            hunk.lines.forEach((line, index) => {
                if (line.kind !== "context") {
                    ids.set(line, `${hunkIndexes?.[position] ?? position}:${lineIndexes?.[position]?.[index] ?? index}`);
                }
            });
        });
        return ids;
    }, [hunks, hunkIndexes, lineIndexes]);
    const gapCount = hunks.length + 1;
    const gaps = useMemo(() => Array.from({ length: gapCount }, (_, position) => gapBefore(hunks, position, oldFileLines?.length)), [hunks, gapCount, oldFileLines]);
    const allGapLines = useMemo(() => gaps.map(gap => (oldFileLines && gap.count > 0 ? gapLines(gap, oldFileLines) : undefined)), [gaps, oldFileLines]);
    const isGapShown = (position: number): boolean => allGapLines[position] !== undefined && (gapStates.get(position) ?? showAllLines);
    const shownGapLines = allGapLines.map((lines, position) => (isGapShown(position) ? lines : undefined));

    //
    // Numbers the search's matches in the order the lines show, shown unchanged lines included.
    //
    const needle = search.trim().toLowerCase();
    const firstMatch = new Map<IDiffLine, number>();
    let matchTotal = 0;
    function countLines(lines: IDiffLine[] | undefined): void {
        for (const line of lines ?? []) {
            firstMatch.set(line, matchTotal);
            matchTotal += countMatches(line.text, needle);
        }
    }
    hunks.forEach((hunk, position) => {
        countLines(shownGapLines[position]);
        countLines(hunk.lines);
    });
    countLines(shownGapLines[hunks.length]);

    useEffect(() => {
        onMatchCount?.(matchTotal);
    }, [matchTotal, onMatchCount]);

    function gapRows(position: number): ReactNode {
        return (
            <GapRows
                key={`gap-${position}`}
                gap={gaps[position]}
                position={position}
                layout={layout}
                wrap={wrap}
                lines={allGapLines[position]}
                isShown={isGapShown(position)}
                onToggle={() => onGapStateChange?.(position, !isGapShown(position))}
                isCurrent={currentGap === position}
                onSelect={onSelectGap ? () => onSelectGap(position) : undefined}
            />
        );
    }

    return (
        <DiffSearchContext.Provider value={{ needle: search.trim(), current: currentMatch, firstMatch }}>
        <LineSelectionContext.Provider value={lineSelection ? { ...lineSelection, idOf: line => lineIds.get(line) } : undefined}>
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
                    <Fragment key={hunk.header + index}>
                        {gapRows(position)}
                        <div
                            role="rowgroup"
                            data-hunk-index={index}
                            data-current={currentHunk === index}
                            onClick={onSelectHunk ? () => onSelectHunk(index) : undefined}
                            style={{ position: "relative", cursor: onSelectHunk ? "pointer" : undefined }}
                        >
                            {currentHunk === index ? <CurrentBorder /> : undefined}
                            <HunkHeader hunk={hunk} layout={layout} action={hunkAction?.(index)} />
                            {layout === "unified"
                                ? hunk.lines.map((line, lineIndex) => <UnifiedRow key={lineIndex} line={line} partner={partners.get(line)} wrap={wrap} />)
                                : splitRows(hunk.lines).map((row, rowIndex) => (
                                      <div key={rowIndex} role="row" className="flex" style={{ gap: "1px", background: "var(--color-border)" }}>
                                          <SplitSide line={row.old} side="old" partner={row.old ? partners.get(row.old) : undefined} wrap={wrap} />
                                          <SplitSide line={row.new} side="new" partner={row.new ? partners.get(row.new) : undefined} wrap={wrap} />
                                      </div>
                                  ))}
                        </div>
                    </Fragment>
                );
            })}
            {gapRows(hunks.length)}
        </div>
        </LineSelectionContext.Provider>
        </DiffSearchContext.Provider>
    );
}
