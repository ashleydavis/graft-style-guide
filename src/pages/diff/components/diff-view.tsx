//
// The diff view: a file's diff drawn in the code font, either unified (old and new lines in one
// column) or side by side (old on the left, new on the right), with line numbers, added and
// deleted lines on their colours, the words that changed within a line marked, and the unchanged
// lines between hunks collapsed behind a button that shows them.
//

import { createContext, Fragment, useContext, useEffect, useMemo, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import { Tip } from "../../../components/tip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsUpDown, faCompress, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
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
    hunkAction?: (hunkIndex: number) => ISidedActions;

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
    lineSelection?: Omit<ILineSelection, "idOf" | "neighbours">;

    //
    // True to leave out each hunk's buttons, as the line selection mode does, where the buttons
    // sit on the picked lines.
    //
    hideHunkActions?: boolean;

    //
    // The positions of the discarded hunks in the whole file's diff, which draw faded and struck
    // through.
    //
    discardedHunks?: ReadonlySet<number>;

    //
    // The ids of the lines discarded one by one, "hunk:line", which draw faded and struck through.
    //
    discardedLines?: ReadonlySet<string>;

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
// How a click picks lines: "only" picks just the clicked line, "toggle" adds it to the picked lines
// or takes it out, and "range" picks every line from the last one picked to the clicked one.
//
export type LinePick = "only" | "toggle" | "range";

//
// The line selection of a diff in its line selection mode, where lines are picked as hunks are:
// a line's id from the line, which lines are picked, and what a click on a line does. Absent
// outside the mode.
//
export interface ILineSelection {
    //
    // Returns a changed line's id, "hunk:line" with the hunk's and the line's positions in the
    // whole file's diff, or undefined for a line that cannot be picked.
    //
    idOf: (line: IDiffLine) => string | undefined;

    //
    // The ids of the picked lines.
    //
    selected: ReadonlySet<string>;

    //
    // Called with a line's id and how the click picks lines: Shift picks a run and Ctrl or Cmd
    // adds a line or takes it out.
    //
    onPick: (id: string, pick: LinePick) => void;

    //
    // Returns whether the line before and the line after `line` on the same side are picked too,
    // so a run of picked lines draws one border round it.
    //
    neighbours: (line: IDiffLine) => { before: boolean; after: boolean };

    //
    // The id of the line that carries the picked lines' buttons, the first picked line the diff
    // draws, and the buttons: the stage button at the left and Discard or Undo at the right.
    //
    actionsLine: string | undefined;
    actions: ISidedActions;
}

//
// The buttons of a hunk or of picked lines, split by the UX rule on placing actions: the
// non-destructive ones, such as the stage button, at the left, and the destructive ones, such as
// Discard, at the right.
//
export interface ISidedActions {
    left?: ReactNode;
    right?: ReactNode;
}

//
// Renders one floating panel of buttons at the top `side` of a hunk or a run of picked lines, on a
// small raised panel, so it adds nothing to their height. `top` and `transform` place it across
// or inside the top edge.
//
function FloatingPanel({ side, top, transform, children }: { side: "left" | "right"; top: string; transform: string | undefined; children: ReactNode }): ReactNode {
    return (
        <div
            data-floating-actions
            className="flex"
            onClick={event => event.stopPropagation()}
            style={{
                position: "absolute",
                top,
                [side]: "var(--space-4)",
                transform,
                zIndex: 2,
                gap: "var(--space-2)",
                padding: "var(--space-1)",
                background: "var(--color-panel)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-raised)",
                fontFamily: "var(--font-sans)",
            }}
        >
            {children}
        </div>
    );
}

//
// Returns true for a line discarded on its own, which draws faded and struck through. A line in a
// discarded hunk draws through its hunk instead.
//
export const DiscardedLineContext = createContext<(line: IDiffLine) => boolean>(() => false);

//
// Holds the diff view's line selection for the lines it draws.
//
export const LineSelectionContext = createContext<ILineSelection | undefined>(undefined);

//
// What a changed line takes from the line selection mode: its id, whether it is picked, the click
// that picks it and the border drawn round a run of picked lines, open where the run carries on.
// Returns undefined outside the mode and for a kept line.
//
function useLinePick(line: IDiffLine | undefined): { id: string; isPicked: boolean; onClick: (event: MouseEvent) => void; onMouseDown: (event: MouseEvent) => void; border: ReactNode; padding: CSSProperties; actions: ReactNode } | undefined {
    const selection = useContext(LineSelectionContext);
    const id = line && selection ? selection.idOf(line) : undefined;
    if (!line || !selection || id === undefined) {
        return undefined;
    }
    const isPicked = selection.selected.has(id);
    const { before, after } = selection.neighbours(line);
    const side = "2px solid var(--color-select-item)";
    return {
        id,
        isPicked,
        //
        // The picked lines' buttons float across the top border of the run, the stage button at the
        // left and Discard at the right, adding nothing to the lines' height.
        //
        actions:
            id === selection.actionsLine ? (
                <>
                    {selection.actions.left ? (
                        <FloatingPanel side="left" top="0px" transform="translateY(-50%)">
                            {selection.actions.left}
                        </FloatingPanel>
                    ) : undefined}
                    {selection.actions.right ? (
                        <FloatingPanel side="right" top="0px" transform="translateY(-50%)">
                            {selection.actions.right}
                        </FloatingPanel>
                    ) : undefined}
                </>
            ) : undefined,
        //
        // A run of picked lines has room inside its border above its first line and below its
        // last, as a hunk has inside the current hunk's border.
        //
        padding: isPicked ? { paddingTop: before ? undefined : "var(--space-2)", paddingBottom: after ? undefined : "var(--space-2)" } : {},
        //
        // Shift and Ctrl clicks pick lines, so they leave the page's text unselected.
        //
        onMouseDown: event => {
            if (event.shiftKey || event.ctrlKey || event.metaKey) {
                event.preventDefault();
            }
        },
        onClick: event => {
            event.stopPropagation();
            selection.onPick(id, event.shiftKey ? "range" : event.ctrlKey || event.metaKey ? "toggle" : "only");
        },
        border: isPicked ? (
            <span
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: `${before ? 0 : "calc(var(--space-1) / 2)"} var(--space-1) ${after ? 0 : "calc(var(--space-1) / 2)"}`,
                    borderLeft: side,
                    borderRight: side,
                    borderTop: before ? "none" : side,
                    borderBottom: after ? "none" : side,
                    borderRadius: `${before ? 0 : "var(--radius-sm)"} ${before ? 0 : "var(--radius-sm)"} ${after ? 0 : "var(--radius-sm)"} ${after ? 0 : "var(--radius-sm)"}`,
                    pointerEvents: "none",
                    zIndex: 1,
                }}
            />
        ) : undefined,
    };
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
// line's kind, and the rest plain. With no partner the text is plain.
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
    const pick = useLinePick(line);
    const isDiscarded = useContext(DiscardedLineContext)(line);
    return (
        <div
            role="row"
            data-line={line.kind}
            data-line-id={pick?.id}
            data-picked={pick?.isPicked}
            onClick={pick?.onClick}
            onMouseDown={pick?.onMouseDown}
            data-discarded={isDiscarded || undefined}
            className={["flex", isDiscarded ? "graft-discarded" : "", pick ? "graft-hoverable" : ""].join(" ").trim()}
            style={{ position: pick ? "relative" : undefined, cursor: pick ? "pointer" : undefined, background: lineStyles[line.kind].background, ...pick?.padding }}
        >
            {pick?.border}
            {pick?.actions}
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
    const pick = useLinePick(line);
    const isDiscardedLine = useContext(DiscardedLineContext);
    if (!line) {
        return <div className="min-w-0 flex-1" data-side={side} data-empty="true" style={{ background: EMPTY_SIDE }} />;
    }
    return (
        <div
            className={["flex min-w-0 flex-1", isDiscardedLine(line) ? "graft-discarded" : "", pick ? "graft-hoverable" : ""].join(" ").trim()}
            data-discarded={isDiscardedLine(line) || undefined}
            data-side={side}
            data-line={line.kind}
            data-line-id={pick?.id}
            data-picked={pick?.isPicked}
            onClick={pick?.onClick}
            onMouseDown={pick?.onMouseDown}
            style={{ position: pick ? "relative" : undefined, cursor: pick ? "pointer" : undefined, background: lineStyles[line.kind].background, ...pick?.padding }}
        >
            {pick?.border}
            {pick?.actions}
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
    reservesActions = false,
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
    reservesActions?: boolean;
}): ReactNode {
    if (gap.count === 0) {
        return undefined;
    }
    const count = `${gap.count} unchanged ${gap.count === 1 ? "line" : "lines"}`;
    return (
        <div role="rowgroup" data-gap-index={position} data-current={isCurrent} onClick={lines ? onSelect : undefined} style={{ position: "relative", cursor: lines && onSelect ? "pointer" : undefined }}>
            {isCurrent ? <CurrentBorder /> : undefined}
            <div
                role="row"
                data-line="gap"
                className={[lines && onSelect ? "graft-hoverable" : "", "flex items-center", reservesActions ? "justify-center" : ""].join(" ").trim()}
                style={{
                    gap: "var(--space-3)",
                    //
                    // A bar before a hunk with buttons keeps both ends clear for the hunk's floating
                    // buttons, with its count and its button in the middle.
                    //
                    minHeight: "calc(var(--space-6) + var(--space-1))",
                    paddingLeft: reservesActions ? "calc(var(--space-8) * 2)" : undefined,
                    paddingRight: reservesActions ? "calc(var(--space-8) * 2)" : undefined,
                    background: "var(--color-raised)",
                    color: "var(--color-text-muted)",
                }}
            >
                {lines ? (
                    isShown ? (
                        <GapButton layout={layout} label={`Hide ${count}`} detail="Folds these lines away again." icon={faCompress} onClick={onToggle} />
                    ) : (
                        <GapButton layout={layout} label={`Show ${count}`} detail="Lines the change left as they were." icon={faArrowsUpDown} onClick={onToggle} />
                    )
                ) : (
                    <span className="flex-none" style={{ width: `calc(${GUTTER_WIDTH} * ${layout === "unified" ? 2 : 1})` }} />
                )}
                <span className="min-w-0 truncate">{count}</span>
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
// Renders a hunk's buttons on two small raised panels that float at its top edge, the stage button
// at the left and Discard at the right, so they add nothing to the hunk's height. The panels sit
// across the hunk's top edge, over the ends of the bar of unchanged lines before it, which keeps
// both ends clear, or just inside the hunk for a hunk at the very top of the diff.
//
export function HunkActions({ isAtTop, actions }: { isAtTop: boolean; actions: ISidedActions }): ReactNode {
    const top = isAtTop ? "var(--space-2)" : "0px";
    const transform = isAtTop ? undefined : "translateY(-50%)";
    return (
        <div data-floating-actions style={{ position: "absolute", top: 0, left: 0, right: 0, height: 0 }}>
            {actions.left ? (
                <FloatingPanel side="left" top={top} transform={transform}>
                    {actions.left}
                </FloatingPanel>
            ) : undefined}
            {actions.right ? (
                <FloatingPanel side="right" top={top} transform={transform}>
                    {actions.right}
                </FloatingPanel>
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
    hideHunkActions = false,
    discardedHunks,
    discardedLines,
}: IDiffViewProps): ReactNode {
    const hunks = useMemo(() => parseHunks(diff), [diff]);
    const gapCount = hunks.length + 1;
    const gaps = useMemo(() => Array.from({ length: gapCount }, (_, position) => gapBefore(hunks, position, oldFileLines?.length)), [hunks, gapCount, oldFileLines]);
    const allGapLines = useMemo(() => gaps.map(gap => (oldFileLines && gap.count > 0 ? gapLines(gap, oldFileLines) : undefined)), [gaps, oldFileLines]);

    //
    // Each line's id for the lines mode: "hunk:line" for a hunk's line, with the hunk's and the
    // line's positions in the whole file's diff, and "u" with the run's position, a colon and the
    // line's position for a line of a run of unchanged lines. Also the runs of lines a picked
    // line's neighbours come from: each hunk's lines and each run's lines.
    //
    const { lineIds, lineRuns } = useMemo(() => {
        const ids = new Map<IDiffLine, string>();
        const runs = new Map<IDiffLine, IDiffLine[]>();
        hunks.forEach((hunk, position) => {
            hunk.lines.forEach((line, index) => {
                ids.set(line, `${hunkIndexes?.[position] ?? position}:${lineIndexes?.[position]?.[index] ?? index}`);
                runs.set(line, hunk.lines);
            });
        });
        allGapLines.forEach((lines, position) => {
            lines?.forEach((line, index) => {
                ids.set(line, `u${position}:${index}`);
                runs.set(line, lines);
            });
        });
        return { lineIds: ids, lineRuns: runs };
    }, [hunks, hunkIndexes, lineIndexes, allGapLines]);

    //
    // Returns whether the lines before and after `line` are picked too: the neighbouring lines of
    // its hunk or run in the unified layout, and the neighbouring lines of the same kind in the
    // side-by-side layout, where added and deleted lines sit on different sides.
    //
    function isLineOnlyDiscarded(line: IDiffLine): boolean {
        const id = lineIds.get(line);
        return id !== undefined && discardedLines?.has(id) === true && discardedHunks?.has(Number(id.split(":")[0])) !== true;
    }

    function pickedNeighbours(line: IDiffLine, shownLayout: DiffLayout): { before: boolean; after: boolean } {
        const run = lineRuns.get(line);
        if (!run || !lineSelection) {
            return { before: false, after: false };
        }
        const index = run.indexOf(line);
        const isPicked = (other: IDiffLine | undefined): boolean => {
            const id = other ? lineIds.get(other) : undefined;
            return id !== undefined && lineSelection.selected.has(id) && (shownLayout === "unified" || other?.kind === line.kind);
        };
        return { before: isPicked(run[index - 1]), after: isPicked(run[index + 1]) };
    }
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
                reservesActions={hunkAction !== undefined}
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
        <LineSelectionContext.Provider value={lineSelection ? { ...lineSelection, idOf: line => lineIds.get(line), neighbours: line => pickedNeighbours(line, layout) } : undefined}>
        <DiscardedLineContext.Provider value={isLineOnlyDiscarded}>
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
                            data-discarded={discardedHunks?.has(index) || undefined}
                            className={[discardedHunks?.has(index) ? "graft-discarded" : "", onSelectHunk && !lineSelection ? "graft-hoverable" : ""].join(" ").trim() || undefined}
                            onClick={onSelectHunk ? () => onSelectHunk(index) : undefined}
                            style={{
                                position: "relative",
                                cursor: onSelectHunk ? "pointer" : undefined,
                                //
                                // A hunk with floating buttons keeps room above its first line for
                                // their lower half, so they hide no line number or text, and the
                                // current hunk has room inside its border above and below.
                                //
                                paddingTop: !hideHunkActions && hunkAction ? "calc(var(--space-4) + var(--space-1))" : currentHunk === index ? "var(--space-2)" : undefined,
                                paddingBottom: currentHunk === index ? "var(--space-2)" : undefined,
                            }}
                        >
                            {currentHunk === index ? <CurrentBorder /> : undefined}
                            {!hideHunkActions && hunkAction ? <HunkActions isAtTop={position === 0 && gaps[0].count === 0} actions={hunkAction(index)} /> : undefined}
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
        </DiscardedLineContext.Provider>
        </LineSelectionContext.Provider>
        </DiffSearchContext.Provider>
    );
}
