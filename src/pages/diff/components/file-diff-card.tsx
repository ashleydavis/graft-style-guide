//
// A file's diff in a card: a header with the file's status, path, line counts and controls, over
// the diff or, for a change with no lines to show, a note of what changed.
//

import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { diffStops, stopAfterMove, type DiffStop } from "../stops";
import { transitionName } from "../../../lib/view-transition";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faChevronDown, faChevronRight, faFileImage, faFileShield, faTableColumns, faSliders, faBars, faCircleInfo, faObjectGroup, faListCheck, faTriangleExclamation, faPlus, faMinus, faXmark, faExpand, faCompress, faMagnifyingGlass, faChevronUp, faTrashCan, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FilePathMenu } from "../../../components/file-path-menu";
import { MaximiseButton } from "../../../components/maximise-button";
import { Tip } from "../../../components/tip";
import { KeyCaps } from "../../../components/shortcut";
import { CollapseButton } from "../../../components/collapse";
import { FilePath } from "../../commit-explorer/components/file-path";
import { statusColour } from "../../tree";
import { gapBefore, parseHunks, sectionDiff } from "../model";
import { emptyStaging, hunkStagedState, initialStaging, isFileStaged, stagedLinesOf, withFileToggled, withHunkStaged, withLinesStaged, type IStaging } from "../staging";
import { scrollSelectionIntoView } from "../../commit-explorer/scroll";
import { DiffView, type DiffLayout, type ISidedActions, type LinePick } from "./diff-view";
import { isHunkDiscarded, isLineDiscarded, withFileDiscarded, withHunkMarked, withLinesMarked, type IDiscards } from "../discards";
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
    // The whole old file, so the unchanged lines between hunks can be shown. Absent for a diff
    // that holds the whole file, as an added or deleted file's does, which turns the switch that
    // shows the whole file off.
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
// The name of each kind of change, as the info dialog writes it.
//
const STATUS_NAMES = { M: "Modified", A: "Added", D: "Deleted", R: "Renamed" };

//
// Renders one labelled fact in the info dialog.
//
function InfoFact({ label, children }: { label: string; children: ReactNode }): ReactNode {
    return (
        <>
            <dt style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{label}</dt>
            <dd className="min-w-0" style={{ fontSize: "var(--text-sm)", overflowWrap: "anywhere" }}>
                {children}
            </dd>
        </>
    );
}

//
// Renders the info button, which opens a dialog under it with the file's change in labelled
// facts: what kind of change it is, the old path of a renamed file, the lines added and deleted,
// how many changes the diff has, how much of it is staged when `staging` is given, which side the
// card shows when `section` is given, a binary file's sizes and a mode change.
//
export function DiffInfo({
    file,
    counts,
    hunkCount,
    staging,
    section,
}: {
    file: IFileDiff;
    counts: { added: number; deleted: number };
    hunkCount: number;
    staging: IStaging | undefined;
    section: "staged" | "unstaged" | undefined;
}): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    const wholeHunks = staging ? staging.hunks.size : 0;
    const partHunks = staging ? staging.lines.size : 0;
    return (
        <>
            <Tooltip title="Change details">
                <IconButton size="small" aria-label="Change details" aria-haspopup="dialog" aria-expanded={anchor !== undefined} onClick={event => setAnchor(event.currentTarget)}>
                    <FontAwesomeIcon icon={faCircleInfo} />
                </IconButton>
            </Tooltip>
            <Popover
                open={anchor !== undefined}
                anchorEl={anchor}
                onClose={() => setAnchor(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { role: "dialog", "aria-label": "Change details" } }}
            >
                <dl className="grid items-baseline" style={{ gridTemplateColumns: "auto minmax(0, 1fr)", gap: "var(--space-2) var(--space-4)", padding: "var(--space-4)", width: "min(calc(var(--space-8) * 10), calc(100vw - var(--space-8)))" }}>
                    <InfoFact label="Change">
                        <span style={{ color: statusColour(file.status), fontWeight: "var(--weight-bold)" }}>{STATUS_NAMES[file.status]}</span>
                    </InfoFact>
                    {file.oldPath ? <InfoFact label="Renamed from">{file.oldPath}</InfoFact> : undefined}
                    {section ? <InfoFact label="Shows">{section === "staged" ? "The staged part" : "The unstaged part"}</InfoFact> : undefined}
                    {file.diff !== undefined ? (
                        <>
                            <InfoFact label="Lines added">
                                <span style={{ color: "var(--color-diff-added-line)", fontWeight: "var(--weight-bold)" }}>{counts.added}</span>
                            </InfoFact>
                            <InfoFact label="Lines deleted">
                                <span style={{ color: "var(--color-diff-removed-line)", fontWeight: "var(--weight-bold)" }}>{counts.deleted}</span>
                            </InfoFact>
                            <InfoFact label="Changes">
                                {hunkCount} {hunkCount === 1 ? "hunk" : "hunks"}
                            </InfoFact>
                        </>
                    ) : undefined}
                    {staging && file.diff !== undefined ? (
                        <InfoFact label="Staged">
                            {wholeHunks} of {hunkCount} {hunkCount === 1 ? "hunk" : "hunks"}
                            {partHunks > 0 ? `, and ${partHunks} in part` : ""}
                        </InfoFact>
                    ) : undefined}
                    {file.binary ? (
                        <InfoFact label="Size">
                            {file.binary.oldSize} before, {file.binary.newSize} after
                        </InfoFact>
                    ) : undefined}
                    {file.modeChange ? (
                        <InfoFact label="Mode">
                            {file.modeChange.from} to {file.modeChange.to}
                        </InfoFact>
                    ) : undefined}
                </dl>
            </Popover>
        </>
    );
}

//
// The keys of the diff options, as KeyboardEvent.key names them in lower case, and as the options
// dialog shows them.
//
export const DIFF_OPTION_KEYS = { wholeFile: "f", layout: "l", wrap: "w", selectLines: "v" };

//
// What the diff options dialog shows and changes.
//
export interface IDiffOptionsProps {
    layout: DiffLayout;
    onLayout: (layout: DiffLayout) => void;
    wrap: boolean;
    onWrap: (wrap: boolean) => void;
    showAllLines: boolean;
    onShowAllLines: (showAllLines: boolean) => void;

    //
    // True when the diff already holds the whole file, which turns the whole-file choice off.
    //
    isWholeFile: boolean;

    //
    // True while lines are picked one by one, and the setter, absent for a diff whose changes
    // cannot be staged or discarded.
    //
    isSelectingLines?: boolean;
    onSelectingLines?: (isSelectingLines: boolean) => void;
}

//
// Renders the switch between staging and discarding whole changes and picking lines one by one,
// in the options dialog.
//
function PickModeSwitch({ isSelectingLines, onSelectingLines }: { isSelectingLines: boolean; onSelectingLines: (isSelectingLines: boolean) => void }): ReactNode {
    return (
        <ToggleButtonGroup
            size="small"
            exclusive
            value={isSelectingLines ? "lines" : "hunks"}
            onChange={(_event, value: "hunks" | "lines" | null) => {
                if (value) {
                    onSelectingLines(value === "lines");
                }
            }}
            aria-label="Pick changes by"
            sx={{ "& .MuiToggleButton-root": { padding: "var(--space-1) var(--space-2)", fontSize: "var(--icon-sm)" } }}
        >
            <Tooltip title={<Tip title="Whole changes" detail={`Stage, unstage and discard a hunk at a time. Key: ${DIFF_OPTION_KEYS.selectLines.toUpperCase()}`} />}>
                <ToggleButton value="hunks" aria-label="Pick whole changes">
                    <FontAwesomeIcon icon={faObjectGroup} />
                </ToggleButton>
            </Tooltip>
            <Tooltip title={<Tip title="Lines" detail={`Pick lines to stage, unstage or discard just those. Key: ${DIFF_OPTION_KEYS.selectLines.toUpperCase()}`} />}>
                <ToggleButton value="lines" aria-label="Pick lines">
                    <FontAwesomeIcon icon={faListCheck} />
                </ToggleButton>
            </Tooltip>
        </ToggleButtonGroup>
    );
}

//
// Renders one row of the options dialog: what the option does, its control and its key.
//
export function OptionRow({ label, detail, control, keyName }: { label: string; detail: string; control: ReactNode; keyName: string }): ReactNode {
    return (
        <div className="grid items-center" style={{ gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: "var(--space-3)" }}>
            <div className="flex min-w-0 flex-col">
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}>{label}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{detail}</span>
            </div>
            {control}
            <KeyCaps keys={keyName.toUpperCase()} />
        </div>
    );
}

//
// Renders the diff options button, which opens a dialog under it with every way of showing the
// diff, each labelled with what it does and the key that does the same: only the changes or the
// whole file, the unified or side-by-side layout, wrapping long lines and, for a diff whose changes
// can be staged or discarded, picking whole changes or lines.
//
export function DiffOptions({ layout, onLayout, wrap, onWrap, showAllLines, onShowAllLines, isWholeFile, isSelectingLines, onSelectingLines }: IDiffOptionsProps): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    const groupStyle = { "& .MuiToggleButton-root": { padding: "var(--space-1) var(--space-2)", fontSize: "var(--icon-sm)" } };
    return (
        <>
            <Tooltip title={<Tip title="Diff options" detail="How the diff shows, with a key for each." />}>
                <IconButton size="small" aria-label="Diff options" aria-haspopup="dialog" aria-expanded={anchor !== undefined} onClick={event => setAnchor(event.currentTarget)}>
                    <FontAwesomeIcon icon={faSliders} />
                </IconButton>
            </Tooltip>
            <Popover
                open={anchor !== undefined}
                anchorEl={anchor}
                onClose={() => setAnchor(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { role: "dialog", "aria-label": "Diff options" } }}
            >
                <div className="flex flex-col" style={{ gap: "var(--space-3)", padding: "var(--space-4)", width: "min(calc(var(--space-8) * 13), calc(100vw - var(--space-8)))" }}>
                    <OptionRow
                        label="Lines shown"
                        detail={isWholeFile ? "The diff already holds the whole file." : "Only the changes, or every line of the file."}
                        keyName={DIFF_OPTION_KEYS.wholeFile}
                        control={
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={showAllLines ? "all" : "changes"}
                                disabled={isWholeFile}
                                onChange={(_event, value: "all" | "changes" | null) => {
                                    if (value) {
                                        onShowAllLines(value === "all");
                                    }
                                }}
                                aria-label="Lines shown"
                                sx={groupStyle}
                            >
                                <Tooltip title="Only the changes">
                                    <ToggleButton value="changes" aria-label="Show only the changes">
                                        <FontAwesomeIcon icon={faCompress} />
                                    </ToggleButton>
                                </Tooltip>
                                <Tooltip title="The whole file">
                                    <ToggleButton value="all" aria-label="Show the whole file">
                                        <FontAwesomeIcon icon={faExpand} />
                                    </ToggleButton>
                                </Tooltip>
                            </ToggleButtonGroup>
                        }
                    />
                    <OptionRow
                        label="Layout"
                        detail="Old and new lines in one column, or side by side."
                        keyName={DIFF_OPTION_KEYS.layout}
                        control={
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
                                sx={groupStyle}
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
                        }
                    />
                    <OptionRow
                        label="Wrap long lines"
                        detail="Breaks long lines to fit, instead of scrolling sideways."
                        keyName={DIFF_OPTION_KEYS.wrap}
                        control={<Switch size="small" checked={wrap} onChange={event => onWrap(event.target.checked)} slotProps={{ input: { "aria-label": "Wrap long lines" } }} />}
                    />
                    {onSelectingLines ? (
                        <OptionRow
                            label="Stage and discard"
                            detail="Whole changes, or lines picked one by one."
                            keyName={DIFF_OPTION_KEYS.selectLines}
                            control={<PickModeSwitch isSelectingLines={isSelectingLines === true} onSelectingLines={onSelectingLines} />}
                        />
                    ) : undefined}
                </div>
            </Popover>
        </>
    );
}
//
// The size of the stage, Discard and Undo buttons where they sit on a hunk, on picked lines or in a
// file row: 0.65 of a small icon button, its icon and its padding both scaled down. In a toolbar,
// such as the diff's header, they take the size of the toolbar's other icon buttons.
//
//
// The side of the square stage button: in a toolbar, a small icon button's; on a hunk, picked
// lines or a file row, the smaller action buttons'.
//
const STAGE_SIZE = "calc(var(--icon-md) + var(--space-3))";
const COMPACT_STAGE_SIZE = "calc(var(--icon-md) * 0.65 + var(--space-2))";

//
// The stage button on a hunk, picked lines or a file or folder row: larger than the Discard button
// on the same row, so it is the easier of the two to hit.
//
const DIFF_STAGE_SIZE = "calc(var(--icon-md) * 0.85 + var(--space-2))";

const ACTION_BUTTON_SIZE = {
    fontSize: "calc(var(--icon-md) * 0.65)",
    width: COMPACT_STAGE_SIZE,
    height: COMPACT_STAGE_SIZE,
    padding: 0,
};

//
// Renders the button that stages or unstages a whole file, a hunk or picked lines: a square icon
// button, in the stage button colours while it is unstaged and a minus on a slight green tinge
// once it is staged, its tooltip naming what it does.
//
export function StageButton({
    isStaged,
    what,
    onClick,
    isCompact = true,
    isProminent = false,
}: {
    isStaged: boolean;
    what: string;
    onClick: () => void;
    isCompact?: boolean;
    isProminent?: boolean;
}): ReactNode {
    const label = isStaged ? `Unstage this ${what}` : `Stage this ${what}`;
    return (
        <Tooltip
            title={
                <Tip
                    title={label}
                    detail={isStaged ? `Takes the ${what}'s changes out of the next commit. They stay in the working tree.` : `Adds the ${what}'s changes for the next commit.`}
                />
            }
        >
            <IconButton
                size="small"
                aria-label={label}
                //
                // A square button. Staged, it has a slight green tinge on its background, a little
                // stronger under the pointer; unstaged, it takes the stage button colours, a pale grey square in light and a black one in dark, with the control border.
                //
                sx={{
                    ...(isCompact ? ACTION_BUTTON_SIZE : {}),
                    ...(isProminent ? { fontSize: "calc(var(--icon-md) * 0.85)" } : {}),
                    width: isProminent ? DIFF_STAGE_SIZE : isCompact ? COMPACT_STAGE_SIZE : STAGE_SIZE,
                    height: isProminent ? DIFF_STAGE_SIZE : isCompact ? COMPACT_STAGE_SIZE : STAGE_SIZE,
                    padding: 0,
                    ...(isStaged
                        ? {
                              backgroundColor: "color-mix(in srgb, var(--color-success) 12%, transparent)",
                              "&:hover": { backgroundColor: "color-mix(in srgb, var(--color-success) 22%, transparent)" },
                          }
                        : {
                              backgroundColor: "var(--color-stage-button)",
                              color: "var(--color-on-stage-button)",
                              boxShadow: "inset 0 0 0 1px var(--color-border-control)",
                              "&:hover": {
                                  backgroundColor: "color-mix(in srgb, var(--color-stage-button) 85%, var(--color-on-stage-button))",
                                  color: "var(--color-on-stage-button)",
                              },
                          }),
                }}
                onClick={event => {
                    event.stopPropagation();
                    onClick();
                }}
            >
                <FontAwesomeIcon icon={isStaged ? faMinus : faPlus} />
            </IconButton>
        </Tooltip>
    );
}
//
// The key that discards the file, hunk or picked lines the keys are on, or brings back a
// discarded one, as KeyboardEvent.key names it. Backspace does the same, as the Delete key on a
// Mac sends it.
//
export const DISCARD_KEYS = ["Delete", "Backspace"];

//
// Renders the Discard button for a file, a hunk or picked lines: a small danger icon button, a
// trash can in the danger colour. The part stays in view, faded and struck through, until Undo
// brings it back.
//
export function DiscardButton({ what, onClick, isCompact = true }: { what: string; onClick: () => void; isCompact?: boolean }): ReactNode {
    return (
        <Tooltip title={<Tip title={`Discard this ${what}`} detail={`Puts the ${what} back as it was in the last commit. Undo brings it back. Key: Delete`} />}>
            <IconButton
                size="small"
                color="error"
                aria-label={`Discard this ${what}`}
                sx={isCompact ? ACTION_BUTTON_SIZE : undefined}
                onClick={event => {
                    event.stopPropagation();
                    onClick();
                }}
            >
                <FontAwesomeIcon icon={faTrashCan} />
            </IconButton>
        </Tooltip>
    );
}

//
// Renders the Undo button that takes the place of a discarded part's Discard button and brings the
// part back.
//
export function UndoButton({ what, onClick, isCompact = true }: { what: string; onClick: () => void; isCompact?: boolean }): ReactNode {
    return (
        <Tooltip title={<Tip title={`Undo the discard of this ${what}`} detail="Brings the changes back. Key: Delete" />}>
            <IconButton
                size="small"
                aria-label={`Undo the discard of this ${what}`}
                sx={isCompact ? ACTION_BUTTON_SIZE : undefined}
                onClick={event => {
                    event.stopPropagation();
                    onClick();
                }}
            >
                <FontAwesomeIcon icon={faRotateLeft} />
            </IconButton>
        </Tooltip>
    );
}

//
// What an explorer around a file diff card can ask of it.
//
export interface IFileDiffCardHandle {
    //
    // Shows the run of unchanged lines at `gapIndex` when it is folded, and folds it when it shows.
    //
    toggleGap: (gapIndex: number) => void;

    //
    // Acts on one of the diff options' keys, `key` as KeyboardEvent.key names it, and returns true,
    // or returns false for any other key.
    //
    handleOptionKey: (key: string) => boolean;

    //
    // Acts on a key in the line selection mode, `key` as KeyboardEvent.key names it and `isShift`
    // true while Shift is held, and returns true, or returns false outside the mode and for any
    // other key.
    //
    handleLineKey: (key: string, isShift: boolean) => boolean;

    //
    // Discards the picked changed lines in the lines mode, or brings them back when they are all
    // discarded, and returns true. Returns false when no changed line is picked.
    //
    discardPicked: () => boolean;
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
    // The position of the run of unchanged lines the keys are on, when an explorer around the card
    // keeps the current stop. Absent when the keys are on no run.
    //
    currentGap?: number;

    //
    // Called with a run of unchanged lines' position when its bar is clicked, for a card whose
    // current stop an explorer around it keeps.
    //
    onSelectGap?: (gapIndex: number) => void;

    //
    // Holds what an explorer around the card can ask of it: showing or folding a run of unchanged
    // lines, as Space on the current run does.
    //
    ref?: Ref<IFileDiffCardHandle>;

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
    // Called by a collapse button before the maximise button, for a card in an explorer whose
    // panes collapse to the left. Absent for a card with none.
    //
    onCollapse?: () => void;

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
    // The side of the change the card shows, for a card that shows only the staged part or only
    // the unstaged part of a file's change. Absent to show the whole change.
    //
    section?: "staged" | "unstaged";

    //
    // What is discarded of the file, for a card with Discard buttons. Absent for a card with none.
    //
    discards?: IDiscards;

    //
    // Called with the new discards when a Discard or Undo button is clicked.
    //
    onDiscardsChange?: (discards: IDiscards) => void;


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
// Renders the card. The header holds a button that folds the diff away and back, then for a
// stageable change the button that stages or unstages the whole file, the path (the old path, an
// arrow and the new path for a renamed file) with its menu of ways to copy the path or open the
// file, the change details and diff options buttons, and the collapse, maximise and close buttons
// where the card has them. The options keys work while the keys are on the card. In the
// line selection mode lines are picked as hunks are: a click picks a line, Shift a run and Ctrl or
// Cmd adds a line, Up and Down move the pick, and a bar above the diff stages, unstages or discards
// the picked lines. Each hunk of a stageable change has its own Stage or Unstage button at its top right. A
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
    currentGap,
    onSelectGap,
    ref,
    label,
    fillHeight = false,
    onClose,
    isMaximised = false,
    onToggleMaximise,
    onCollapse,
    section,
    discards,
    onDiscardsChange,
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

    //
    // The runs of unchanged lines shown or folded one at a time, by position. Turning the whole
    // file on or off starts every run again from the switch.
    //
    const [gapStates, setGapStates] = useState<ReadonlyMap<number, boolean>>(new Map());

    function changeShowAllLines(isShown: boolean): void {
        setShowAllLines(isShown);
        setGapStates(new Map());
    }

    function setGapState(gapIndex: number, isShown: boolean): void {
        setGapStates(current => new Map(current).set(gapIndex, isShown));
    }

    function toggleGap(gapIndex: number): void {
        setGapState(gapIndex, !(gapStates.get(gapIndex) ?? showAllLines));
    }

    const [isSelectingLines, setIsSelectingLines] = useState(false);
    const [selectedLines, setSelectedLines] = useState<ReadonlySet<string>>(new Set());
    const [rangeStart, setRangeStart] = useState<string | undefined>(undefined);
    const [focusLine, setFocusLine] = useState<string | undefined>(undefined);
    const [lineGap, setLineGap] = useState<number | undefined>(undefined);
    const canDiscard = discards !== undefined && onDiscardsChange !== undefined;
    const canSelectLines = stageable || canDiscard;

    function changeSelectingLines(isOn: boolean): void {
        setIsSelectingLines(isOn);
        setSelectedLines(new Set());
        setRangeStart(undefined);
        setFocusLine(undefined);
        setLineGap(undefined);
    }

    function handleOptionKey(key: string): boolean {
        const lower = key.toLowerCase();
        if (lower === DIFF_OPTION_KEYS.wholeFile && file.oldFileLines !== undefined) {
            changeShowAllLines(!showAllLines);
        }
        else if (lower === DIFF_OPTION_KEYS.layout) {
            setLayout(layout === "unified" ? "split" : "unified");
        }
        else if (lower === DIFF_OPTION_KEYS.wrap) {
            setWrap(!wrap);
        }
        else if (lower === DIFF_OPTION_KEYS.selectLines && canSelectLines) {
            changeSelectingLines(!isSelectingLines);
        }
        else {
            return false;
        }
        return true;
    }

    useImperativeHandle(ref, () => ({ toggleGap, handleOptionKey, handleLineKey, discardPicked }));
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
    const [ownStop, setOwnStop] = useState<DiffStop | undefined>(undefined);
    const shownHunk = answersKeys ? (ownStop?.kind === "hunk" ? ownStop.hunk : undefined) : currentHunk;
    const shownGap = answersKeys ? (ownStop?.kind === "gap" ? ownStop.gap : undefined) : currentGap;

    //
    // Brings the current hunk or run of unchanged lines into view when the keys move to it.
    //
    useEffect(() => {
        const selector = shownGap !== undefined ? `[data-gap-index="${shownGap}"]` : shownHunk !== undefined ? `[data-hunk-index="${shownHunk}"]` : undefined;
        const element = selector ? bodyRef.current?.querySelector(selector) : undefined;
        if (element instanceof HTMLElement) {
            if (element.closest("[data-pane-scroll]")) {
                scrollSelectionIntoView(element);
            }
            else {
                element.scrollIntoView({ block: "nearest" });
            }
        }
    }, [shownGap, shownHunk]);
    const fileStaged = isFileStaged(staging, hunkCount);

    //
    // Returns true when the hunk's stage button unstages: on the staged side of
    // the split, and in the whole change for a hunk staged whole.
    //
    function isHunkButtonStaged(index: number): boolean {
        return section !== undefined ? section === "staged" : hunkStagedState(staging, index) === "all";
    }

    function toggleHunk(index: number): void {
        setStaging(withHunkStaged(staging, index, !isHunkButtonStaged(index)));
    }

    function toggleFile(): void {
        if (section === "unstaged") {
            setStaging(withFileToggled(emptyStaging(), hunkCount));
        }
        else if (section === "staged") {
            setStaging(emptyStaging());
        }
        else {
            setStaging(withFileToggled(staging, hunkCount));
        }
    }

    const hunks = useMemo(() => parseHunks(file.diff ?? ""), [file.diff]);
    const shown = useMemo(
        () => (file.diff !== undefined && section !== undefined ? sectionDiff(file.diff, (hunk, index) => stagedLinesOf(staging, hunk, index), section) : undefined),
        [file.diff, section, staging],
    );
    const shownDiff = shown ? shown.diff : file.diff;
    const shownHunkIndexes = shown?.hunkIndexes;
    const shownCounts = countLines(shownDiff);

    //
    // The ids of the lines the line selection mode can pick, "hunk:line" in the whole file's
    // numbering, in the order the diff draws them, and the ids of the staged ones.
    //
    const { selectableIds, changedIds, shownGapIds } = useMemo(() => {
        const ids: string[] = [];
        const changed = new Set<string>();
        const gapIds = new Map<number, string[]>();
        const shownHunks = parseHunks(shownDiff ?? "");
        function addGap(position: number): void {
            const gap = gapBefore(shownHunks, position, file.oldFileLines?.length);
            if (file.oldFileLines && gap.count > 0 && (gapStates.get(position) ?? showAllLines)) {
                const lines = Array.from({ length: gap.count }, (_unused, index) => `u${position}:${index}`);
                gapIds.set(position, lines);
                ids.push(...lines);
            }
        }
        shownHunks.forEach((hunk, position) => {
            addGap(position);
            hunk.lines.forEach((line, index) => {
                const id = `${shownHunkIndexes?.[position] ?? position}:${shown?.lineIndexes[position]?.[index] ?? index}`;
                ids.push(id);
                if (line.kind !== "context") {
                    changed.add(id);
                }
            });
        });
        addGap(shownHunks.length);
        return { selectableIds: ids, changedIds: changed, shownGapIds: gapIds };
    }, [shownDiff, shownHunkIndexes, shown, file.oldFileLines, gapStates, showAllLines]);
    const stagedIds = useMemo(() => {
        const ids = new Set<string>();
        hunks.forEach((hunk, index) => {
            for (const line of stagedLinesOf(staging, hunk, index)) {
                ids.add(`${index}:${line}`);
            }
        });
        return ids;
    }, [hunks, staging]);

    //
    // The stops Up and Down move through in the lines mode, in the order the diff draws them: each
    // changed line by its id and each run of unchanged lines as "gap:" and its position.
    //
    const lineStops = useMemo(() => {
        if (shownDiff === undefined) {
            return [];
        }
        return diffStops(shownDiff, file.oldFileLines, shownHunkIndexes).flatMap(stop =>
            stop.kind === "gap" ? [`gap:${stop.gap}`, ...(shownGapIds.get(stop.gap) ?? [])] : selectableIds.filter(id => id.startsWith(`${stop.hunk}:`)),
        );
    }, [shownDiff, file.oldFileLines, shownHunkIndexes, selectableIds, shownGapIds]);

    //
    // Makes the run of unchanged lines at `gapIndex` the current stop in the lines mode, in place
    // of any picked lines, as a click on its bar does.
    //
    function pickGap(gapIndex: number): void {
        setSelectedLines(new Set());
        setFocusLine(undefined);
        setLineGap(gapIndex);
    }

    //
    // Returns the ids from `from` to `to` in the order the diff draws them, both included.
    //
    function idsBetween(from: string, to: string): string[] {
        const start = selectableIds.indexOf(from);
        const end = selectableIds.indexOf(to);
        if (start < 0 || end < 0) {
            return [to];
        }
        return selectableIds.slice(Math.min(start, end), Math.max(start, end) + 1);
    }

    //
    // Picks lines as a click does: just the line, the line added or taken out, or the run from the
    // line picked first to this one. The line becomes the one the keys move from.
    //
    function pickLine(id: string, pick: LinePick): void {
        setLineGap(undefined);
        if (pick === "range") {
            setSelectedLines(new Set(idsBetween(rangeStart ?? id, id)));
        }
        else if (pick === "toggle") {
            const next = new Set(selectedLines);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            setSelectedLines(next);
            setRangeStart(id);
        }
        else {
            setSelectedLines(new Set([id]));
            setRangeStart(id);
        }
        setFocusLine(id);
    }

    //
    // Acts on a key in the line selection mode and returns true, or returns false outside the mode
    // and for any other key. Up and Down pick the line above or below, Shift with them stretches
    // the run, and Space stages the picked lines, or unstages them when they are all staged.
    //
    function handleLineKey(key: string, isShift: boolean): boolean {
        if (!isSelectingLines) {
            return false;
        }
        if (key === "ArrowUp" || key === "ArrowDown") {
            const step = key === "ArrowDown" ? 1 : -1;
            if (isShift) {
                if (selectableIds.length > 0) {
                    const index = focusLine === undefined ? -1 : selectableIds.indexOf(focusLine);
                    const nextIndex = index < 0 ? (step > 0 ? 0 : selectableIds.length - 1) : Math.min(Math.max(index + step, 0), selectableIds.length - 1);
                    pickLine(selectableIds[nextIndex], "range");
                }
                return true;
            }
            if (lineStops.length === 0) {
                return true;
            }
            const current = lineGap !== undefined ? `gap:${lineGap}` : focusLine;
            const index = current === undefined ? -1 : lineStops.indexOf(current);
            const next = lineStops[index < 0 ? (step > 0 ? 0 : lineStops.length - 1) : Math.min(Math.max(index + step, 0), lineStops.length - 1)];
            if (next.startsWith("gap:")) {
                pickGap(Number(next.slice(4)));
            }
            else {
                pickLine(next, "only");
            }
            return true;
        }
        if (key === " " && lineGap !== undefined) {
            toggleGap(lineGap);
            return true;
        }
        if (key === " " && stageable) {
            if (selectedChangedCount > 0) {
                stageSelectedLines(selectedUnstagedCount > 0);
            }
            return true;
        }
        return false;
    }

    useEffect(() => {
        const selector = lineGap !== undefined ? `[data-gap-index="${lineGap}"]` : focusLine ? `[data-line-id="${focusLine}"]` : undefined;
        const element = selector ? bodyRef.current?.querySelector(selector) : undefined;
        if (element instanceof HTMLElement) {
            if (element.closest("[data-pane-scroll]")) {
                scrollSelectionIntoView(element);
            }
            else {
                element.scrollIntoView({ block: "nearest" });
            }
        }
    }, [focusLine, lineGap]);

    //
    // Returns the picked changed lines grouped by hunk position, each with its line positions. Kept
    // lines in the pick have nothing to stage or discard and are left out.
    //
    function selectedByHunk(): Map<number, Set<number>> {
        const byHunk = new Map<number, Set<number>>();
        for (const id of selectedLines) {
            if (!changedIds.has(id)) {
                continue;
            }
            const [hunk, line] = id.split(":").map(Number);
            byHunk.set(hunk, (byHunk.get(hunk) ?? new Set()).add(line));
        }
        return byHunk;
    }

    function stageSelectedLines(isStaged: boolean): void {
        let next = staging;
        for (const [hunk, lines] of selectedByHunk()) {
            next = withLinesStaged(next, hunks[hunk], hunk, lines, isStaged);
        }
        setStaging(next);
        setSelectedLines(new Set());
    }

    const selectedChangedCount = [...selectedLines].filter(id => changedIds.has(id)).length;
    const selectedStagedCount = [...selectedLines].filter(id => stagedIds.has(id)).length;
    const selectedUnstagedCount = selectedChangedCount - selectedStagedCount;
    const pickedName = selectedLines.size === 1 ? "line" : "selection";

    //
    // The picked lines' buttons: the stage button at the left, a minus when every picked line is
    // staged, and Discard, or Undo once they are discarded, at the right.
    //
    const pickedChangedIds = [...selectedLines].filter(id => changedIds.has(id));
    const arePickedDiscarded = discards !== undefined && pickedChangedIds.length > 0 && pickedChangedIds.every(id => isLineDiscarded(discards, id));

    //
    // Discards the picked changed lines, or brings them back when they are all discarded, and
    // returns true. Returns false when no changed line is picked.
    //
    function discardPicked(): boolean {
        if (!canDiscard || pickedChangedIds.length === 0) {
            return false;
        }
        onDiscardsChange(withLinesMarked(discards, pickedChangedIds, !arePickedDiscarded));
        return true;
    }

    const lineActions: ISidedActions =
        selectedChangedCount > 0
            ? {
                  left: stageable && !arePickedDiscarded ? <StageButton isStaged={selectedUnstagedCount === 0} what={pickedName} onClick={() => stageSelectedLines(selectedUnstagedCount > 0)} isProminent /> : undefined,
                  right: canDiscard ? arePickedDiscarded ? <UndoButton what={pickedName} onClick={discardPicked} /> : <DiscardButton what={pickedName} onClick={discardPicked} /> : undefined,
              }
            : {};

    function onKeyDown(event: KeyboardEvent): void {
        if (!answersKeys || event.ctrlKey || event.altKey || event.metaKey || isOwnKeyTarget(event.target)) {
            return;
        }
        if (!event.shiftKey && handleOptionKey(event.key)) {
            event.preventDefault();
            return;
        }
        if (handleLineKey(event.key, event.shiftKey)) {
            event.preventDefault();
            return;
        }
        const stops = shownDiff !== undefined ? diffStops(shownDiff, file.oldFileLines, shownHunkIndexes) : [];
        if ((event.key === "ArrowUp" || event.key === "ArrowDown") && stops.length > 0) {
            event.preventDefault();
            setOwnStop(stopAfterMove(stops, ownStop, event.key === "ArrowUp" ? -1 : 1));
        }
        else if (event.key === " " && ownStop?.kind === "gap") {
            event.preventDefault();
            toggleGap(ownStop.gap);
        }
        else if (event.key === " " && stageable) {
            event.preventDefault();
            if (ownStop === undefined) {
                toggleFile();
            }
            else if (ownStop.kind === "hunk") {
                toggleHunk(ownStop.hunk);
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
                {stageable && discards?.isFile !== true ? <StageButton isStaged={section === undefined ? fileStaged : section === "staged"} what="file" onClick={toggleFile} isCompact={false} /> : undefined}
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
                <DiffInfo file={file} counts={shownCounts} hunkCount={parseHunks(shownDiff ?? "").length} staging={stageable && section === undefined ? staging : undefined} section={section} />
                {file.diff !== undefined ? (
                    <DiffOptions
                        layout={layout}
                        wrap={wrap}
                        onLayout={setLayout}
                        onWrap={setWrap}
                        showAllLines={showAllLines}
                        onShowAllLines={changeShowAllLines}
                        isWholeFile={file.oldFileLines === undefined}
                        isSelectingLines={isSelectingLines}
                        onSelectingLines={canSelectLines ? changeSelectingLines : undefined}
                    />
                ) : undefined}
                {onCollapse && !isMaximised ? <CollapseButton side="left" onClick={onCollapse} /> : undefined}
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
                <div className="flex flex-none items-center" style={{ gap: "var(--space-2)", padding: "var(--space-2)", background: "var(--color-panel)", borderBottom: "1px solid var(--color-border)" }}>
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
            {isOpen && hasLines && isSelectingLines ? (
                <div
                    role="toolbar"
                    aria-label="Selected lines"
                    className="flex flex-none flex-wrap items-center"
                    style={{ gap: "var(--space-2)", padding: "var(--space-2)", background: "var(--color-raised)", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-sm)" }}
                >
                    <span aria-live="polite" className="flex-1" style={{ color: "var(--color-text-muted)", minWidth: "calc(var(--space-8) * 4)" }}>
                        {selectedLines.size === 0 ? "Click a line to pick it. Shift picks a run, Ctrl adds a line." : `${selectedLines.size} ${selectedLines.size === 1 ? "line" : "lines"} picked`}
                    </span>
                    <Tooltip title={<Tip title="Stop selecting lines" detail={`Key: ${DIFF_OPTION_KEYS.selectLines.toUpperCase()}`} />}>
                        <IconButton size="small" aria-label="Stop selecting lines" onClick={() => changeSelectingLines(false)}>
                            <FontAwesomeIcon icon={faXmark} />
                        </IconButton>
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
                            hunkIndexes={shownHunkIndexes}
                            lineIndexes={shown?.lineIndexes}
                            lineSelection={isSelectingLines ? { selected: selectedLines, onPick: pickLine, actionsLine: selectableIds.find(id => selectedLines.has(id)), actions: lineActions } : undefined}
                            hideHunkActions={isSelectingLines}
                            isStagedLine={stageable ? id => section === "staged" || (section === undefined && stagedIds.has(id)) : undefined}
                            discardedHunks={discards ? (discards.isFile ? new Set(hunks.map((_hunk, index) => index)) : discards.hunks) : undefined}
                            discardedLines={discards?.lines}
                            search={search}
                            currentMatch={isSearching ? currentMatch : undefined}
                            onMatchCount={setMatchCount}
                            onSelectHunk={answersKeys ? hunk => setOwnStop({ kind: "hunk", hunk }) : onSelectHunk}
                            onSelectGap={isSelectingLines ? pickGap : answersKeys ? gap => setOwnStop({ kind: "gap", gap }) : onSelectGap}
                            currentGap={isSelectingLines ? lineGap : shownGap}
                            gapStates={gapStates}
                            onGapStateChange={setGapState}
                            layout={layout}
                            wrap={wrap}
                            oldFileLines={file.oldFileLines}
                            currentHunk={isSelectingLines ? undefined : shownHunk}
                            showAllLines={showAllLines}
                            hunkAction={
                                stageable || canDiscard
                                    ? (index: number): ISidedActions => {
                                          const isDiscarded = discards !== undefined && isHunkDiscarded(discards, index);
                                          return {
                                              left: stageable && !isDiscarded ? <StageButton isStaged={isHunkButtonStaged(index)} what="hunk" onClick={() => toggleHunk(index)} isProminent /> : undefined,
                                              right: canDiscard ? (
                                                  isDiscarded ? (
                                                      <UndoButton what={discards.isFile ? "file" : "hunk"} onClick={() => onDiscardsChange(discards.isFile ? withFileDiscarded(discards, false) : withHunkMarked(discards, index, false))} />
                                                  ) : index === shownHunk ? (
                                                      <DiscardButton what="hunk" onClick={() => onDiscardsChange(withHunkMarked(discards, index, true))} />
                                                  ) : undefined
                                              ) : undefined,
                                          };
                                      }
                                    : undefined
                            }
                        />
                    ) : undefined}
                </div>
            ) : undefined}
        </Paper>
    );
}
