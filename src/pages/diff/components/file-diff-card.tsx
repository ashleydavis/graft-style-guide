//
// A file's diff in a card: a header with the file's status, path, line counts and controls, over
// the diff or, for a change with no lines to show, a note of what changed.
//

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { transitionName } from "../../../lib/view-transition";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faChevronDown, faChevronRight, faFileImage, faFileShield, faTableColumns, faTextWidth, faBars, faTriangleExclamation, faPlus, faMinus, faXmark, faExpand, faCompress, faMagnifyingGlass, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FilePathMenu } from "../../../components/file-path-menu";
import { MaximiseButton } from "../../../components/maximise-button";
import { Tip } from "../../../components/tip";
import { FilePath } from "../../commit-explorer/components/file-path";
import { LineCounts } from "../../commit-explorer/components/line-counts";
import { StatusLetter } from "../../tree";
import { parseHunks, withoutHunks } from "../model";
import { initialStaging, isFileStaged, withFileToggled, withHunkToggled, type IStaging } from "../staging";
import { scrollSelectionIntoView } from "../../commit-explorer/scroll";
import { DiffView, type DiffLayout } from "./diff-view";
import { ImageDiff, type IImageVersion } from "./image-diff";

//
// One changed file as the diff card shows it.
//
export interface IFileDiff {
    //
    // The file's path after the change.
    //
    path: string;

    //
    // The file's path before the change, for a renamed file.
    //
    oldPath?: string;

    //
    // How the change touched the file, as Git's one-letter status.
    //
    status: "A" | "M" | "D" | "R";

    //
    // The file's diff from the first `@@` line, absent for a change with no lines to show.
    //
    diff?: string;

    //
    // The whole old file, so the unchanged lines between hunks can be shown.
    //
    oldFileLines?: string[];

    //
    // The file's size before and after, for a binary file, whose lines Git does not compare.
    //
    binary?: {
        oldSize: string;
        newSize: string;

        //
        // The image's old and new versions, for a binary file that is an image, which shows them
        // side by side.
        //
        images?: { before: IImageVersion; after: IImageVersion };
    };

    //
    // The file's mode before and after, when the change made it executable or not.
    //
    modeChange?: {
        from: string;
        to: string;
    };

    //
    // True for a diff that starts folded away, as a deleted file's does.
    //
    startsCollapsed?: boolean;

    //
    // The positions of the hunks already staged, from 0. For a file with no hunks, such as a
    // binary file, any entry means the whole file is staged. Absent when nothing is staged.
    //
    stagedHunks?: number[];
}

//
// The most changed lines a diff shows straight away. A larger diff waits behind a button, so a
// generated file such as a lock file does not fill the screen.
//
export const LARGE_DIFF_LINES = 200;

//
// Counts the lines a diff adds and deletes.
//
export function countLines(diff: string | undefined): { added: number; deleted: number } {
    const lines = (diff ?? "").split("\n").filter(line => !line.startsWith("@@"));
    return {
        added: lines.filter(line => line.startsWith("+")).length,
        deleted: lines.filter(line => line.startsWith("-")).length,
    };
}

//
// Renders a note in place of a diff: an icon and a line of muted text, centred.
//
export function DiffNote({ icon, children }: { icon: typeof faFileImage; children: ReactNode }): ReactNode {
    return (
        <div className="flex flex-wrap items-center justify-center" style={{ gap: "var(--space-2)", padding: "var(--space-6) var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
            <FontAwesomeIcon icon={icon} style={{ fontSize: "var(--icon-md)" }} />
            {children}
        </div>
    );
}

//
// Renders the switch between the unified and side-by-side layouts, the switch that wraps long lines
// and, when `onShowAllLines` is given, the switch between showing only the changes and showing the
// whole file, as a diff's header holds them.
//
export function DiffControls({
    layout,
    wrap,
    onLayout,
    onWrap,
    showAllLines = false,
    onShowAllLines,
}: {
    layout: DiffLayout;
    wrap: boolean;
    onLayout: (layout: DiffLayout) => void;
    onWrap: (wrap: boolean) => void;
    showAllLines?: boolean;
    onShowAllLines?: (showAllLines: boolean) => void;
}): ReactNode {
    return (
        <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
            {onShowAllLines ? (
                <Tooltip title={<Tip title={showAllLines ? "Show only the changes" : "Show the whole file"} detail={showAllLines ? "Folds the unchanged lines between the changes away." : "Opens every run of unchanged lines."} />}>
                    <IconButton
                        size="small"
                        aria-label="Show the whole file"
                        aria-pressed={showAllLines}
                        onClick={() => onShowAllLines(!showAllLines)}
                        sx={showAllLines ? { color: "var(--color-accent)", backgroundColor: "var(--color-selected)" } : undefined}
                    >
                        <FontAwesomeIcon icon={showAllLines ? faCompress : faExpand} />
                    </IconButton>
                </Tooltip>
            ) : undefined}
            <ToggleButtonGroup
                size="small"
                exclusive
                value={layout}
                onChange={(_event, value: DiffLayout | null) => {
                    if (value) {
                        onLayout(value);
                    }
                }}
                aria-label="Diff layout"
                sx={{ "& .MuiToggleButton-root": { padding: "var(--space-1) var(--space-2)", fontSize: "var(--icon-sm)" } }}
            >
                <Tooltip title="Unified">
                    <ToggleButton value="unified" aria-label="Unified">
                        <FontAwesomeIcon icon={faBars} />
                    </ToggleButton>
                </Tooltip>
                <Tooltip title="Side by side">
                    <ToggleButton value="split" aria-label="Side by side">
                        <FontAwesomeIcon icon={faTableColumns} />
                    </ToggleButton>
                </Tooltip>
            </ToggleButtonGroup>
            <Tooltip title={wrap ? "Stop wrapping long lines" : "Wrap long lines"}>
                <IconButton
                    size="small"
                    aria-label="Wrap long lines"
                    aria-pressed={wrap}
                    onClick={() => onWrap(!wrap)}
                    sx={wrap ? { color: "var(--color-accent)", backgroundColor: "var(--color-selected)" } : undefined}
                >
                    <FontAwesomeIcon icon={faTextWidth} />
                </IconButton>
            </Tooltip>
        </span>
    );
}

//
// Renders the button that stages or unstages a whole file or one hunk: "Stage" with a plus while
// it is unstaged and "Unstage" with a minus once it is staged.
//
export function StageButton({ isStaged, what, onClick }: { isStaged: boolean; what: string; onClick: () => void }): ReactNode {
    return (
        <Tooltip
            title={
                <Tip
                    title={isStaged ? `Unstage this ${what}` : `Stage this ${what}`}
                    detail={isStaged ? `Takes the ${what}'s changes out of the next commit. They stay in the working tree.` : `Adds the ${what}'s changes to the next commit.`}
                />
            }
        >
            <Button
                size="small"
                variant="outlined"
                startIcon={<FontAwesomeIcon icon={isStaged ? faMinus : faPlus} />}
                onClick={onClick}
                //
                // One width for both labels, wide enough for "Unstage", so the button keeps its
                // size and the header keeps its place when the label changes.
                //
                sx={{ width: "calc(var(--space-8) * 3)", justifyContent: "center", padding: "0 var(--space-2)", fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}
            >
                {isStaged ? "Unstage" : "Stage"}
            </Button>
        </Tooltip>
    );
}

//
// What a file diff card shows and how.
//
export interface IFileDiffCardProps {
    //
    // The changed file.
    //
    file: IFileDiff;

    //
    // The layout the diff starts in.
    //
    initialLayout?: DiffLayout;

    //
    // True for a diff that starts with long lines wrapped.
    //
    initialWrap?: boolean;

    //
    // True for a change in the working tree, which has Stage and Unstage buttons. False for a
    // change in a commit, which is already made.
    //
    stageable?: boolean;

    //
    // True while the file is the one the diff explorer's keys are on, drawn with an accent border.
    //
    isCurrent?: boolean;

    //
    // The position of the hunk the diff explorer's keys are on, from 0, or undefined.
    //
    currentHunk?: number;

    //
    // The card's name for assistive technology, the file's path by default.
    //
    label?: string;

    //
    // True to fill the height of the column the card sits in, with the diff scrolling inside it,
    // as in the commit explorer.
    //
    fillHeight?: boolean;

    //
    // Called by a close button at the header's far right, absent for a card that cannot close.
    //
    onClose?: () => void;

    //
    // True while the card fills its explorer, with the other panes put away.
    //
    isMaximised?: boolean;

    //
    // Called by a maximise button before the close button, absent for a card with none.
    //
    onToggleMaximise?: () => void;

    //
    // What is staged of the file, for a card whose staging an explorer around it keeps. Absent for
    // a card that keeps its own, starting from the file's staged hunks.
    //
    staging?: IStaging;

    //
    // Called with the new staging when a Stage or Unstage button is clicked, for a card whose
    // staging an explorer around it keeps.
    //
    onStagingChange?: (staging: IStaging) => void;

    //
    // Called with a hunk's position when it is clicked, for a card whose current hunk an explorer
    // around it keeps. A card that answers its own keys makes the clicked hunk its own current one.
    //
    onSelectHunk?: (hunkIndex: number) => void;

    //
    // The positions of the hunks to show, from 0, for a card that shows only part of a file's
    // change, such as its staged hunks. Absent to show every hunk.
    //
    onlyHunks?: number[];

    //
    // What the file's Stage or Unstage button does in a card that shows only part of a file:
    // "stage" stages every hunk and "unstage" unstages every hunk. Absent for a button that flips
    // between the two as the whole file's staging changes.
    //
    fileAction?: "stage" | "unstage";

    //
    // True for a card that answers its own keys: Up and Down step through its hunks and Space
    // stages or unstages the current hunk, or the file when no hunk is current. False for a card in
    // an explorer, which answers the keys for all its cards.
    //
    answersKeys?: boolean;
}

//
// Returns true when a key pressed with the focus on `target` belongs to the target itself: a text
// box, a button, which Space presses, or an open menu or dialog.
//
function isOwnKeyTarget(target: EventTarget): boolean {
    return target instanceof HTMLElement && target.closest('input, textarea, select, button, a, [role="menu"], [role="dialog"], [role="listbox"]') !== null;
}

//
// Renders the card. The header holds a button that folds the diff away and back, the status
// letter, the path (the old path, an arrow and the new path for a renamed file) with its menu of
// ways to copy the path or open the file, the line counts, a switch between the unified and
// side-by-side layouts, a switch that wraps long lines and, at the far right for a stageable
// change, a button that stages or unstages the whole file, then a close button when the card can
// close. Each hunk of a stageable change has its own Stage or Unstage button at its top right. A
// card that answers its own keys takes the focus: Up and Down step through its hunks, marking the
// current one, and Space stages or unstages the current hunk, or the file when none is current. The header wraps onto a second line on a narrow
// screen. A file with no lines to show says what changed in its place: a rename with no changes, a
// binary file's sizes or a mode change. A diff of more than LARGE_DIFF_LINES changed lines waits
// behind a button.
//
export function FileDiffCard({
    file,
    initialLayout = "unified",
    initialWrap = false,
    stageable = true,
    isCurrent = false,
    currentHunk,
    label,
    fillHeight = false,
    onClose,
    isMaximised = false,
    onToggleMaximise,
    onlyHunks,
    fileAction,
    onSelectHunk,
    staging: givenStaging,
    onStagingChange,
    answersKeys = true,
}: IFileDiffCardProps): ReactNode {
    const [isOpen, setIsOpen] = useState(file.startsCollapsed !== true);
    const [layout, setLayout] = useState<DiffLayout>(initialLayout);
    const [wrap, setWrap] = useState(initialWrap);
    const [isLargeShown, setIsLargeShown] = useState(false);
    const counts = countLines(file.diff);
    const changedLines = counts.added + counts.deleted;
    const isLarge = changedLines > LARGE_DIFF_LINES;
    const hasLines = file.diff !== undefined && (!isLarge || isLargeShown);
    const hunkCount = parseHunks(file.diff ?? "").length;
    const [ownStaging, setOwnStaging] = useState<IStaging>(initialStaging(file.stagedHunks));
    const staging = givenStaging ?? ownStaging;
    const setStaging = onStagingChange ?? setOwnStaging;
    const [showAllLines, setShowAllLines] = useState(false);
    const id = useId();
    const [search, setSearch] = useState("");
    const [currentMatch, setCurrentMatch] = useState(0);
    const [matchCount, setMatchCount] = useState(0);
    const bodyRef = useRef<HTMLDivElement>(null);
    const isSearching = search.trim() !== "";

    useEffect(() => {
        const match = bodyRef.current?.querySelector(`[data-search-match="${currentMatch}"]`);
        if (match instanceof HTMLElement) {
            if (match.closest("[data-pane-scroll]")) {
                scrollSelectionIntoView(match);
            }
            else {
                match.scrollIntoView({ block: "nearest" });
            }
        }
    }, [currentMatch, search]);

    //
    // Moves to the match `step` matches on from the current one, going round from the last match
    // to the first and back.
    //
    function moveMatch(step: number): void {
        if (matchCount > 0) {
            setCurrentMatch((currentMatch + step + matchCount) % matchCount);
        }
    }

    function onSearchKey(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === "Enter") {
            event.preventDefault();
            moveMatch(event.shiftKey ? -1 : 1);
        }
        else if (event.key === "Escape" && isSearching) {
            event.preventDefault();
            event.stopPropagation();
            setSearch("");
        }
    }
    const [ownHunk, setOwnHunk] = useState<number | undefined>(undefined);
    const shownHunk = answersKeys ? ownHunk : currentHunk;
    const fileStaged = isFileStaged(staging, hunkCount);

    function toggleHunk(index: number): void {
        setStaging(withHunkToggled(staging, index));
    }

    function toggleFile(): void {
        if (fileAction === "stage") {
            setStaging(withFileToggled({ hunks: new Set(), isWholeFile: false }, hunkCount));
        }
        else if (fileAction === "unstage") {
            setStaging({ hunks: new Set(), isWholeFile: false });
        }
        else {
            setStaging(withFileToggled(staging, hunkCount));
        }
    }

    const shownDiff = file.diff !== undefined && onlyHunks ? withoutHunks(file.diff, new Set(Array.from({ length: hunkCount }, (_unused, index) => index).filter(index => !onlyHunks.includes(index)))) : file.diff;
    const shownCounts = countLines(shownDiff);

    function onKeyDown(event: KeyboardEvent): void {
        if (!answersKeys || event.ctrlKey || event.altKey || event.metaKey || isOwnKeyTarget(event.target)) {
            return;
        }
        if ((event.key === "ArrowUp" || event.key === "ArrowDown") && hunkCount > 0) {
            event.preventDefault();
            const step = event.key === "ArrowUp" ? -1 : 1;
            setOwnHunk(ownHunk === undefined ? (step > 0 ? 0 : hunkCount - 1) : Math.min(Math.max(ownHunk + step, 0), hunkCount - 1));
        }
        else if (event.key === " " && stageable) {
            event.preventDefault();
            if (ownHunk === undefined) {
                toggleFile();
            }
            else {
                toggleHunk(ownHunk);
            }
        }
    }

    return (
        <Paper
            component="section"
            variant="outlined"
            aria-label={label ?? file.path}
            tabIndex={answersKeys ? 0 : undefined}
            onKeyDown={onKeyDown}
            data-current={isCurrent}
            data-active={isCurrent}
            className={fillHeight ? "flex flex-col" : undefined}
            sx={{
                height: fillHeight ? "100%" : undefined,
                viewTransitionName: fillHeight ? transitionName(id) : undefined,
                overflow: "hidden",
                borderRadius: "var(--radius-lg)",
                borderColor: isCurrent ? "var(--color-select-pane)" : undefined,
                boxShadow: isCurrent ? "0 0 0 1px var(--color-select-pane)" : undefined,
                "&:focus-visible": {
                    outline: "var(--focus-ring-width) solid var(--color-focus)",
                    outlineOffset: "var(--focus-ring-offset)",
                },
            }}
        >
            <div
                className="flex flex-none flex-wrap items-center"
                style={{
                    gap: "var(--space-1) var(--space-2)",
                    padding: "var(--space-2)",
                    background: "var(--color-panel)",
                    borderBottom: isOpen ? "1px solid var(--color-border)" : "none",
                }}
            >
                <Tooltip title={isOpen ? "Fold the diff away" : "Show the diff"}>
                    <IconButton size="small" aria-label={isOpen ? "Fold the diff away" : "Show the diff"} aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
                        <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} />
                    </IconButton>
                </Tooltip>
                <span
                    className="flex flex-1 items-center"
                    //
                    // The path keeps enough width to read, so on a narrow card the buttons after it
                    // wrap onto a second line instead of squeezing it away.
                    //
                    style={{ minWidth: "min(calc(var(--space-8) * 6), 100%)", gap: "var(--space-2)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}
                >
                    {file.oldPath ? (
                        <>
                            <span className="min-w-0" style={{ color: "var(--color-text-muted)" }}>
                                <FilePath path={file.oldPath} />
                            </span>
                            <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: "var(--icon-sm)", color: "var(--color-text-muted)", flex: "none" }} />
                        </>
                    ) : undefined}
                    <span className="min-w-0">
                        <FilePath path={file.path} />
                    </span>
                    <FilePathMenu path={file.path} />
                </span>
                <StatusLetter status={file.status} />
                {file.diff !== undefined ? <LineCounts added={shownCounts.added} deleted={shownCounts.deleted} /> : undefined}
                {file.diff !== undefined ? (
                    <DiffControls
                        layout={layout}
                        wrap={wrap}
                        onLayout={setLayout}
                        onWrap={setWrap}
                        showAllLines={showAllLines}
                        onShowAllLines={file.oldFileLines ? setShowAllLines : undefined}
                    />
                ) : undefined}
                {stageable ? <StageButton isStaged={fileAction === undefined ? fileStaged : fileAction === "unstage"} what="file" onClick={toggleFile} /> : undefined}
                {onToggleMaximise ? <MaximiseButton isMaximised={isMaximised} onClick={onToggleMaximise} /> : undefined}
                {onClose ? (
                    <Tooltip title="Close">
                        <IconButton size="small" aria-label="Close file diff" onClick={onClose}>
                            <FontAwesomeIcon icon={faXmark} />
                        </IconButton>
                    </Tooltip>
                ) : undefined}
            </div>
            {isOpen && hasLines ? (
                <div className="flex flex-none items-center" style={{ gap: "var(--space-1)", padding: "var(--space-2)", background: "var(--color-panel)", borderBottom: "1px solid var(--color-border)" }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Find in this diff"
                        value={search}
                        onChange={event => {
                            setSearch(event.target.value);
                            setCurrentMatch(0);
                        }}
                        onKeyDown={onSearchKey}
                        slotProps={{
                            htmlInput: {
                                "aria-label": "Find in this diff",
                            },
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-md)" }} />
                                    </InputAdornment>
                                ),
                                endAdornment: isSearching ? (
                                    <InputAdornment position="end">
                                        <span aria-live="polite" style={{ fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>
                                            {matchCount === 0 ? "No matches" : `${currentMatch + 1} of ${matchCount}`}
                                        </span>
                                    </InputAdornment>
                                ) : undefined,
                            },
                        }}
                    />
                    <Tooltip title={<Tip title="Previous match" detail="Keys: Shift+Enter" />}>
                        <span>
                            <IconButton size="small" aria-label="Previous match" disabled={matchCount === 0} onClick={() => moveMatch(-1)}>
                                <FontAwesomeIcon icon={faChevronUp} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={<Tip title="Next match" detail="Keys: Enter" />}>
                        <span>
                            <IconButton size="small" aria-label="Next match" disabled={matchCount === 0} onClick={() => moveMatch(1)}>
                                <FontAwesomeIcon icon={faChevronDown} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </div>
            ) : undefined}
            {isOpen ? (
                <div
                    ref={bodyRef}
                    data-pane-scroll={fillHeight ? true : undefined}
                    className={fillHeight ? "min-h-0 flex-1" : undefined}
                    style={{ overflowX: wrap ? "hidden" : "auto", overflowY: fillHeight ? "auto" : undefined, background: "var(--color-panel)" }}
                >
                    {file.modeChange ? (
                        <DiffNote icon={faFileShield}>
                            File mode changed from <code style={{ fontFamily: "var(--font-mono)" }}>{file.modeChange.from}</code> to{" "}
                            <code style={{ fontFamily: "var(--font-mono)" }}>{file.modeChange.to}</code>
                        </DiffNote>
                    ) : undefined}
                    {file.binary?.images ? <ImageDiff before={file.binary.images.before} after={file.binary.images.after} /> : undefined}
                    {file.binary && !file.binary.images ? (
                        <DiffNote icon={faFileImage}>
                            Binary file changed, {file.binary.oldSize} to {file.binary.newSize}. Git does not compare its lines.
                        </DiffNote>
                    ) : undefined}
                    {file.status === "R" && file.diff === undefined ? <DiffNote icon={faArrowRight}>Renamed without changes.</DiffNote> : undefined}
                    {isLarge && !isLargeShown ? (
                        <div className="flex flex-col items-center" style={{ gap: "var(--space-3)", padding: "var(--space-6) var(--space-4)" }}>
                            <span className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
                                <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: "var(--icon-md)", color: "var(--color-warning)" }} />
                                This diff is large, {changedLines.toLocaleString()} changed lines, so it is not shown.
                            </span>
                            <Button variant="outlined" size="small" onClick={() => setIsLargeShown(true)}>
                                Show the diff
                            </Button>
                        </div>
                    ) : undefined}
                    {hasLines && file.diff !== undefined ? (
                        <DiffView
                            diff={shownDiff ?? ""}
                            hunkIndexes={onlyHunks}
                            search={search}
                            currentMatch={isSearching ? currentMatch : undefined}
                            onMatchCount={setMatchCount}
                            onSelectHunk={answersKeys ? setOwnHunk : onSelectHunk}
                            layout={layout}
                            wrap={wrap}
                            oldFileLines={file.oldFileLines}
                            currentHunk={shownHunk}
                            showAllLines={showAllLines}
                            hunkAction={stageable ? index => <StageButton isStaged={staging.hunks.has(index)} what="hunk" onClick={() => toggleHunk(index)} /> : undefined}
                        />
                    ) : undefined}
                </div>
            ) : undefined}
        </Paper>
    );
}
