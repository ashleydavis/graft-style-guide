//
// The changes area: the working tree's changed files beside the selected file's diff, with the
// commit box below the files. Staging happens here, a file or a hunk at a time, and the commit
// box commits what is staged.
//

import { useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { diffStops, stopAfterMove, type DiffStop } from "../../diff/stops";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronDown, faChevronUp, faDownLeftAndUpRightToCenter, faFileLines, faLayerGroup, faMagnifyingGlass, faUpRightAndDownLeftFromCenter, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FilePathMenu } from "../../../components/file-path-menu";
import { KeyCaps } from "../../../components/shortcut";
import { Tip } from "../../../components/tip";
import { FilePath } from "../../commit-explorer/components/file-path";
import { Pane } from "../../commit-explorer/components/pane";
import { DISCARD_KEYS, DiscardButton, FileDiffCard, StageButton, UndoButton, type IFileDiff, type IFileDiffCardHandle } from "../../diff/components/file-diff-card";
import { noDiscards, withFileDiscarded, withHunkMarked, type IDiscards } from "../../diff/discards";
import { parseHunks, sectionDiff, type ISectionDiff } from "../../diff/model";
import { emptyStaging, hunkStagedState, initialStaging, isAnythingStaged, isFileStaged, stagedLinesOf, withFileToggled, withHunkToggled, type IStaging } from "../../diff/staging";
import { withViewTransition } from "../../../lib/view-transition";
import { LiveToast, ToastStack } from "../../notifications";
import { COLLAPSE_KEY } from "../../../components/collapse";

//
// The message of the last commit, which ticking "Amend the last commit" brings into an empty
// message box.
//
const lastCommit = {
    summary: "Show the Git commands each page runs",
    description: "The help panel in the right sidebar lists the commands, each with a button that copies it.",
};

//
// The keys the area answers to, with what each does, for the hints along its foot.
//
const keyHints = [
    { keys: ["↑", "↓"], action: "File to file, or change to change in the diff" },
    { keys: ["←", "→"], action: "Files, diff or commit" },
    { keys: ["Enter"], action: "Write the commit message" },
    { keys: ["Esc"], action: "Leave the message" },
    { keys: ["Space"], action: "Stage or unstage" },
    { keys: ["Shift", "↑", "↓"], action: "File to file from the diff" },
    { keys: ["M"], action: "Maximise or restore" },
    { keys: [COLLAPSE_KEY], action: "Collapse or restore the files or the commit pane" },
];

//
// Which list a row of the file list sits in: the one list of one diff, or the Staged or Unstaged
// list of the split.
//
export type ListSection = "all" | "staged" | "unstaged";

//
// One row of the file list: a file and the list it sits in.
//
export interface IListEntry {
    //
    // The changed file.
    //
    file: IFileDiff;

    //
    // The list the row sits in.
    //
    section: ListSection;
}

//
// Returns how much of a file is staged: all of it, some of its hunks or lines, or none.
//
export function stagedState(staging: IStaging, hunkCount: number): "all" | "some" | "none" {
    if (isFileStaged(staging, hunkCount)) {
        return "all";
    }
    return isAnythingStaged(staging) ? "some" : "none";
}

//
// Returns one side of a file's change as the split view shows it: the staged part or the unstaged
// part, as `sectionDiff` works it out from the file's staging.
//
export function fileSectionDiff(file: IFileDiff, staging: IStaging, section: "staged" | "unstaged"): ISectionDiff {
    return sectionDiff(file.diff ?? "", (hunk, index) => stagedLinesOf(staging, hunk, index), section);
}
//
// The name of the card that shows the whole diff, as the runs of unchanged lines in it are named.
//
const ONE_DIFF_CARD = "File diff";

//
// One section of the split view: its title, the name of its card, the positions of the file's
// hunks it shows, what its file button does and what it says when it has no hunks.
//
interface ISplitSection {
    title: string;
    card: string;
    hunks: number[];
    action: "stage" | "unstage";
    empty: string;
}

//
// Returns the split view's two sections for `file`: the unstaged hunks, then the staged ones.
//
export function splitSections(file: IFileDiff, staging: IStaging): ISplitSection[] {
    const all = Array.from({ length: parseHunks(file.diff ?? "").length }, (_unused, index) => index);
    return [
        { title: "Unstaged", card: "Unstaged diff", hunks: all.filter(index => hunkStagedState(staging, index) !== "all"), action: "stage", empty: "Everything in this file is staged." },
        { title: "Staged", card: "Staged diff", hunks: all.filter(index => hunkStagedState(staging, index) !== "none"), action: "unstage", empty: "Nothing in this file is staged." },
    ];
}


//
// Renders a file's change in two sections, its staged hunks above its unstaged ones, each the
// Diff page's diff card showing only its own hunks. The staged section's buttons unstage and the
// unstaged section's buttons stage; both change the one staging the file has. A section with no
// hunks says so.
//
export function SplitDiff({
    file,
    staging,
    onStagingChange,
    isCurrent,
    currentStop,
    onSelectHunk,
    onSelectGap,
    cardRef,
    discards,
    onDiscardsChange,
    isMaximised,
    onToggleMaximise,
}: {
    file: IFileDiff;
    staging: IStaging;
    onStagingChange: (staging: IStaging) => void;
    isCurrent: boolean;
    currentStop: DiffStop | undefined;
    onSelectHunk: (hunkIndex: number) => void;
    onSelectGap: (card: string, gapIndex: number) => void;
    cardRef: (card: string) => Ref<IFileDiffCardHandle>;
    discards: IDiscards;
    onDiscardsChange: (discards: IDiscards) => void;
    isMaximised: boolean;
    onToggleMaximise: () => void;
}): ReactNode {
    const sections = splitSections(file, staging);
    const currentHunk = currentStop?.kind === "hunk" ? currentStop.hunk : undefined;
    return (
        <div className="flex min-h-0 flex-1 flex-col" style={{ gap: "var(--space-2)" }}>
            {sections.map(section => (
                <section key={section.title} aria-label={`${section.title} changes`} className="flex min-h-0 flex-1 flex-col" style={{ gap: "var(--space-1)" }}>
                    <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-text-muted)" }}>
                        {section.title} ({section.hunks.length} {section.hunks.length === 1 ? "change" : "changes"})
                    </h3>
                    {section.hunks.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center" style={{ padding: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                            {section.empty}
                        </div>
                    ) : (
                        <div className="min-h-0 flex-1">
                            <FileDiffCard
                                key={file.path + section.title}
                                ref={cardRef(section.card)}
                                file={file}
                                label={section.card}
                                section={section.action === "unstage" ? "staged" : "unstaged"}
                                isCurrent={isCurrent && ((currentHunk !== undefined && section.hunks.includes(currentHunk)) || (currentStop?.kind === "gap" && currentStop.card === section.card))}
                                currentHunk={currentHunk}
                                currentGap={currentStop?.kind === "gap" && currentStop.card === section.card ? currentStop.gap : undefined}
                                onSelectGap={gap => onSelectGap(section.card, gap)}
                                staging={staging}
                                onStagingChange={onStagingChange}
                                answersKeys={false}
                                onSelectHunk={onSelectHunk}
                                discards={discards}
                                onDiscardsChange={onDiscardsChange}
                                isMaximised={isMaximised}
                                onToggleMaximise={onToggleMaximise}
                                initialWrap
                                fillHeight
                            />
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
}

//
// Returns true when a key pressed with the focus on `target` belongs to the target itself: a text
// box, an open menu, a resize handle, or Space and Enter on a button, checkbox or link.
//
function isOwnKeyTarget(target: EventTarget, key: string): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (target.closest('input[type="text"], textarea, select, [role="menu"], [role="dialog"], [role="listbox"]') !== null) {
        return true;
    }
    return (key === " " || key === "Enter") && target.closest('button, a, input[type="checkbox"]') !== null;
}

//
// Renders the area in a window frame. The files pane lists every changed file with a checkbox
// that stages or unstages the whole file, ticked when all of it is staged and half-ticked when
// some hunks are, and a count of the files and how many are staged. The selected file's diff
// shows to its right in the Diff page's diff card, with Stage and Unstage buttons for the file and
// each hunk; the checkboxes and the buttons share one staging. The files take the area's full
// height. To the right of the diff the commit box
// takes a summary and a description, with "Amend" and "No verify" checkboxes and
// the Commit button, which needs a summary and something staged, or the amend box ticked. A
// commit takes the staged files and hunks out of the list and says what it committed. The keys
// work while the focus is in the area outside a text box: in the files, Up and Down move from file
// to file and open each one's diff, Space stages or unstages the file and Right moves into the
// diff; in the diff, Up and Down step from change to change, Space stages or unstages the change,
// Shift with Up or Down moves from file to file and Left or Escape goes back to the files.
//
export function ChangesArea({ startFiles }: { startFiles: IFileDiff[] }): ReactNode {
    const [files, setFiles] = useState(startFiles);
    const [stagings, setStagings] = useState<ReadonlyMap<string, IStaging>>(() => new Map(startFiles.map(file => [file.path, initialStaging(file.stagedHunks)])));
    const [selectedPath, setSelectedPath] = useState<string | undefined>(startFiles[0]?.path);
    const [selectedSection, setSelectedSection] = useState<ListSection>("all");
    const [activePane, setActivePane] = useState<0 | 1 | 2>(0);
    const [currentStop, setCurrentStop] = useState<DiffStop | undefined>(undefined);
    const currentHunk = currentStop?.kind === "hunk" ? currentStop.hunk : undefined;
    const cardRefs = useRef(new Map<string, IFileDiffCardHandle | null>());

    function setCurrentHunk(hunk: number | undefined): void {
        setCurrentStop(hunk === undefined ? undefined : { kind: "hunk", hunk });
    }

    //
    // Returns a ref that keeps the card named `card`, so Space can show or fold its runs of
    // unchanged lines.
    //
    function cardRef(card: string): Ref<IFileDiffCardHandle> {
        return handle => {
            cardRefs.current.set(card, handle);
        };
    }
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [amend, setAmend] = useState(false);
    const [skipHooks, setSkipHooks] = useState(false);
    const [committed, setCommitted] = useState<{ id: number; text: string } | undefined>(undefined);
    const closeCommitted = useRef(() => setCommitted(undefined)).current;
    const [diffMode, setDiffMode] = useState<"one" | "split">("one");
    const [maximised, setMaximised] = useState<0 | 1 | 2 | undefined>(undefined);
    const [collapsed, setCollapsed] = useState<ReadonlySet<0 | 2>>(new Set());
    const [panelCollapsed, setPanelCollapsed] = useState<ReadonlySet<"staged" | "unstaged">>(new Set());
    const [panelMaximised, setPanelMaximised] = useState<"staged" | "unstaged" | undefined>(undefined);

    //
    // Folds the Staged or the Unstaged panel of the file list down to its heading, so the other
    // panel takes the room, or opens it again.
    //
    function togglePanelCollapse(panel: "staged" | "unstaged"): void {
        withViewTransition(() =>
            setPanelCollapsed(current => {
                const next = new Set(current);
                if (next.has(panel)) {
                    next.delete(panel);
                }
                else {
                    next.add(panel);
                }
                return next;
            }),
        );
    }
    const [fileSearch, setFileSearch] = useState("");
    const [discardsByPath, setDiscardsByPath] = useState<ReadonlyMap<string, IDiscards>>(new Map());
    const discardsOf = (path: string): IDiscards => discardsByPath.get(path) ?? noDiscards();

    function setDiscards(path: string, discards: IDiscards): void {
        setDiscardsByPath(current => new Map(current).set(path, discards));
    }
    const areaRef = useRef<HTMLDivElement>(null);
    const summaryRef = useRef<HTMLInputElement>(null);
    const shownFiles = files.filter(file => `${file.oldPath ?? ""} ${file.path}`.toLowerCase().includes(fileSearch.trim().toLowerCase()));
    const selectedFile = files.find(file => file.path === selectedPath);
    const hunkCountOf = (file: IFileDiff): number => parseHunks(file.diff ?? "").length;
    const stagingOf = (file: IFileDiff): IStaging => stagings.get(file.path) ?? initialStaging(undefined);

    //
    // Returns true when nothing of `file` is left to commit: the whole file is discarded, or every
    // one of its hunks is.
    //
    const isWhollyDiscarded = (file: IFileDiff): boolean => {
        const discards = discardsOf(file.path);
        const count = hunkCountOf(file);
        return discards.isFile || (count > 0 && Array.from({ length: count }, (_unused, index) => index).every(index => discards.hunks.has(index)));
    };
    const liveFiles = files.filter(file => !isWhollyDiscarded(file));
    const stagedFiles = liveFiles.filter(file => stagedState(stagingOf(file), hunkCountOf(file)) !== "none");
    const canCommit = summary.trim() !== "" && (stagedFiles.length > 0 || amend);

    function setStaging(path: string, staging: IStaging): void {
        setStagings(current => new Map(current).set(path, staging));
    }

    function toggleFile(file: IFileDiff): void {
        setStaging(file.path, withFileToggled(stagingOf(file), hunkCountOf(file)));
    }

    //
    // The rows of the file list: every shown file once in one diff, and in the split each staged
    // file under Staged and each unstaged file under Unstaged, so a file staged in part shows in
    // both.
    //
    const entries: IListEntry[] = [
        ...shownFiles.filter(file => stagedState(stagingOf(file), hunkCountOf(file)) !== "all").map(file => ({ file, section: "unstaged" as const })),
        ...shownFiles.filter(file => stagedState(stagingOf(file), hunkCountOf(file)) !== "none").map(file => ({ file, section: "staged" as const })),
    ];
    const selectedEntry = entries.find(entry => entry.file.path === selectedPath && entry.section === selectedSection) ?? entries.find(entry => entry.file.path === selectedPath);

    function selectFile(path: string, section: ListSection, pane: 0 | 1): void {
        if (path !== selectedPath) {
            setCurrentHunk(undefined);
        }
        setSelectedPath(path);
        setSelectedSection(section);
        setActivePane(pane);
    }

    function moveFile(step: number, pane: 0 | 1): void {
        const index = selectedEntry ? entries.indexOf(selectedEntry) : -1;
        const next = entries[Math.min(Math.max(index + step, 0), entries.length - 1)];
        if (next) {
            selectFile(next.file.path, next.section, pane);
        }
    }

    //
    // Stages or unstages a whole file from its row: a row under Staged unstages all of it, a row
    // under Unstaged stages all of it, and a row in one diff flips it.
    //
    function toggleEntry(entry: IListEntry): void {
        if (entry.section === "staged") {
            setStaging(entry.file.path, emptyStaging());
        }
        else if (entry.section === "unstaged") {
            setStaging(entry.file.path, withFileToggled(emptyStaging(), hunkCountOf(entry.file)));
        }
        else {
            toggleFile(entry.file);
        }
    }

    //
    // Returns the selected file's stops in the order Up and Down step through them, its hunks and
    // the runs of unchanged lines between them: as the one diff draws them, and in the split the
    // unstaged section's stops before the staged section's.
    //
    function stopOrder(): DiffStop[] {
        if (!selectedFile?.diff) {
            return [];
        }
        if (diffMode === "one" || hunkCountOf(selectedFile) === 0) {
            return diffStops(selectedFile.diff, selectedFile.oldFileLines, undefined, ONE_DIFF_CARD);
        }
        return splitSections(selectedFile, stagingOf(selectedFile)).flatMap(section => {
            if (section.hunks.length === 0) {
                return [];
            }
            const side = fileSectionDiff(selectedFile, stagingOf(selectedFile), section.action === "unstage" ? "staged" : "unstaged");
            return diffStops(side.diff, selectedFile.oldFileLines, side.hunkIndexes, section.card);
        });
    }

    function moveHunk(step: number): void {
        setCurrentStop(stopAfterMove(stopOrder(), currentStop, step));
    }

    //
    // Collapses the files pane or the commit pane into a strip at its side, or restores it. A pane
    // stays as it is while one pane is maximised.
    //
    function toggleCollapse(pane: 0 | 2): void {
        if (maximised !== undefined) {
            return;
        }
        //
        // The pane's rows go as it collapses, so the keys move to the area to keep working.
        //
        areaRef.current?.focus();
        withViewTransition(() =>
            setCollapsed(current => {
                const next = new Set(current);
                if (next.has(pane)) {
                    next.delete(pane);
                }
                else {
                    next.add(pane);
                }
                return next;
            }),
        );
    }

    function toggleMaximise(pane: 0 | 1 | 2): void {
        withViewTransition(() => setMaximised(maximised === pane ? undefined : pane));
    }

    function onAmend(isTicked: boolean): void {
        setAmend(isTicked);
        if (isTicked && summary.trim() === "") {
            setSummary(lastCommit.summary);
            setDescription(lastCommit.description);
        }
    }

    function commit(): void {
        const count = stagedFiles.length;
        const left: IFileDiff[] = [];
        for (const file of files) {
            const staging = stagingOf(file);
            const state = stagedState(staging, hunkCountOf(file));
            if (state === "some" && file.diff !== undefined) {
                left.push({ ...file, diff: fileSectionDiff(file, staging, "unstaged").diff, stagedHunks: undefined });
            }
            else if (state === "none") {
                left.push(file);
            }
        }
        setFiles(left);
        setStagings(new Map(left.map(file => [file.path, initialStaging(undefined)])));
        setSelectedPath(left.find(file => file.path === selectedPath)?.path ?? left[0]?.path);
        setCurrentHunk(undefined);
        setActivePane(0);
        setCommitted({ id: Date.now(), text: amend ? `Amended the last commit: ${summary.trim()}` : `Committed ${count} ${count === 1 ? "file" : "files"}: ${summary.trim()}` });
        setSummary("");
        setDescription("");
        setAmend(false);
        setSkipHooks(false);
    }

    //
    // Discards the part the keys are on, or brings it back when it is discarded: the selected file
    // in the file list, and in the diff the picked lines, else the current hunk, else the file.
    //
    function discardCurrent(): void {
        if (!selectedFile) {
            return;
        }
        const discards = discardsOf(selectedFile.path);
        if (activePane === 1) {
            const cards = diffMode === "one" ? [ONE_DIFF_CARD] : ["Staged diff", "Unstaged diff"];
            if (cards.some(card => cardRefs.current.get(card)?.discardPicked() === true)) {
                return;
            }
            if (currentHunk !== undefined && !discards.isFile) {
                setDiscards(selectedFile.path, withHunkMarked(discards, currentHunk, !discards.hunks.has(currentHunk)));
                return;
            }
        }
        setDiscards(selectedFile.path, withFileDiscarded(discards, !discards.isFile));
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (event.ctrlKey || event.altKey || event.metaKey || isOwnKeyTarget(event.target, event.key)) {
            return;
        }
        const key = event.key;
        if (key === "m" || key === "M") {
            event.preventDefault();
            toggleMaximise(activePane);
            return;
        }
        if (key.toUpperCase() === COLLAPSE_KEY && activePane !== 1) {
            event.preventDefault();
            toggleCollapse(activePane);
            return;
        }
        if (DISCARD_KEYS.includes(key) && activePane !== 2) {
            event.preventDefault();
            discardCurrent();
            return;
        }
        if (activePane === 1) {
            const cards = diffMode === "one" ? [ONE_DIFF_CARD] : ["Staged diff", "Unstaged diff"];
            if (cards.some(card => cardRefs.current.get(card)?.handleLineKey(key, event.shiftKey) === true)) {
                event.preventDefault();
                return;
            }
        }
        if (activePane === 1 && !event.shiftKey) {
            const cards = diffMode === "one" ? [ONE_DIFF_CARD] : ["Staged diff", "Unstaged diff"];
            const handled = cards.map(card => cardRefs.current.get(card)?.handleOptionKey(key) === true);
            if (handled.includes(true)) {
                event.preventDefault();
                return;
            }
        }
        if (activePane === 2) {
            if (key === "ArrowLeft") {
                event.preventDefault();
                setActivePane(1);
            }
            else if (key === "Enter") {
                event.preventDefault();
                summaryRef.current?.focus();
            }
            return;
        }
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape", " "].includes(key)) {
            return;
        }
        event.preventDefault();
        if (activePane === 0) {
            if (key === "ArrowUp" || key === "ArrowDown") {
                moveFile(key === "ArrowUp" ? -1 : 1, 0);
            }
            else if (key === " " && selectedEntry) {
                toggleEntry(selectedEntry);
            }
            else if (key === "ArrowRight" && selectedFile) {
                setActivePane(1);
            }
            return;
        }
        if (key === "ArrowUp" || key === "ArrowDown") {
            const step = key === "ArrowUp" ? -1 : 1;
            if (event.shiftKey) {
                moveFile(step, 1);
            }
            else {
                moveHunk(step);
            }
        }
        else if (key === " " && currentStop?.kind === "gap") {
            cardRefs.current.get(currentStop.card ?? ONE_DIFF_CARD)?.toggleGap(currentStop.gap);
        }
        else if (key === " " && selectedFile) {
            setStaging(selectedFile.path, currentHunk === undefined ? withFileToggled(stagingOf(selectedFile), hunkCountOf(selectedFile)) : withHunkToggled(stagingOf(selectedFile), currentHunk));
        }
        else if (key === "ArrowLeft" || key === "Escape") {
            setActivePane(0);
        }
        else if (key === "ArrowRight") {
            moveToCommit();
        }
    }

    //
    // Makes the Commit pane the active pane and puts the keys in the summary, ready to type.
    //
    function moveToCommit(): void {
        setActivePane(2);
        summaryRef.current?.focus();
    }

    //
    // Takes the keys out of a text box of the Commit pane on Escape, back to the area with the
    // Commit pane active, so the arrow keys move between the panes again.
    //
    function onMessageKey(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setActivePane(2);
            areaRef.current?.focus();
        }
    }

    //
    // Renders one file's row in the Staged or the Unstaged panel: the button that stages or unstages
    // it at the left, its path and its path menu, and at the right Discard on the selected row and
    // the row under the pointer, or Undo on a discarded one.
    //
    function fileRow(entry: IListEntry): ReactNode {
        const { file, section } = entry;
        const isChecked = section === "staged";
        return (
            <ListItemButton
                key={`${section}:${file.path}`}
                className={discardsOf(file.path).isFile ? "graft-discarded" : undefined}
                data-discarded={discardsOf(file.path).isFile || undefined}
                component="li"
                aria-label={file.path}
                selected={entry === selectedEntry}
                onClick={() => selectFile(file.path, section, 0)}
                sx={{
                    gap: "var(--space-2)",
                    fontSize: "var(--text-sm)",
                    paddingRight: "var(--space-2)",
                    "& .file-path-menu": { opacity: 0 },
                    "&:hover .file-path-menu, &.Mui-selected .file-path-menu, &:focus-within .file-path-menu": { opacity: 1 },
                    //
                    // Discard shows on the selected row and the row under the pointer, and is out of
                    // reach on the rest, so a click on another row cannot hit it.
                    //
                    "& .file-discard": { visibility: "hidden" },
                    "&:hover .file-discard, &.Mui-selected .file-discard, &:focus-within .file-discard": { visibility: "visible" },
                }}
            >
                <span data-floating-actions className="flex flex-none items-center" style={{ width: "calc(var(--space-6) + var(--space-1))" }}>
                    {discardsOf(file.path).isFile ? undefined : <StageButton isStaged={isChecked} what="file" onClick={() => toggleEntry(entry)} />}
                </span>
                <span className="min-w-0 flex-1">
                    <FilePath path={file.path} />
                </span>
                <FilePathMenu path={file.path} />
                <span data-floating-actions className="flex flex-none items-center" style={{ marginLeft: "var(--space-2)" }}>
                    {discardsOf(file.path).isFile ? (
                        <UndoButton what="file" onClick={() => setDiscards(file.path, noDiscards())} />
                    ) : (
                        <span className="file-discard inline-flex">
                            <DiscardButton what="file" onClick={() => setDiscards(file.path, withFileDiscarded(discardsOf(file.path), true))} />
                        </span>
                    )}
                </span>
            </ListItemButton>
        );
    }

    return (
        <div
            ref={areaRef}
            role="application"
            aria-label="Changes"
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={`flex flex-col ${diffMode === "split" ? "lg:h-[900px]" : "lg:h-[680px]"} shadow-(--shadow-raised) focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--color-focus),var(--shadow-raised)]`}
            style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                outline: "none",
            }}
        >
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row" style={{ gap: "var(--space-3)", padding: "var(--space-3)" }}>
                <div
                    className={
                        maximised === 1 || maximised === 2
                            ? "hidden"
                            : maximised === 0
                              ? "flex min-h-0 flex-1 flex-col"
                              : collapsed.has(0)
                                ? "flex flex-none flex-col lg:min-h-0"
                                : "flex min-h-[420px] flex-col lg:min-h-0 lg:w-[280px] lg:flex-none 2xl:w-[360px]"
                    }
                    style={{ gap: "var(--space-3)" }}
                >
                    <div className="flex min-h-0 flex-1 flex-col" style={{ maxHeight: "100%" }} onPointerDown={() => setActivePane(0)}>
                        <Pane
                            label="Changed files"
                            width="100%"
                            fillsHeight
                            isCollapsed={collapsed.has(0)}
                            onToggleCollapse={() => toggleCollapse(0)}
                            collapseSide="left"
                            railTitle="Changes"
                            isRailResponsive
                            isActive={activePane === 0}
                            isMaximised={maximised === 0}
                            onToggleMaximise={() => toggleMaximise(0)}
                            toolbar={
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Search changed files"
                                    value={fileSearch}
                                    onChange={event => setFileSearch(event.target.value)}
                                    slotProps={{
                                        htmlInput: {
                                            "aria-label": "Search changed files",
                                        },
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-md)" }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: fileSearch.trim() !== "" ? (
                                                <InputAdornment position="end" sx={{ gap: "var(--space-2)" }}>
                                                    <span aria-live="polite" style={{ fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>
                                                        {shownFiles.length} of {files.length}
                                                    </span>
                                                    <Tooltip title="Clear the search">
                                                        <IconButton size="small" aria-label="Clear search" onClick={() => setFileSearch("")} edge="end">
                                                            <FontAwesomeIcon icon={faXmark} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </InputAdornment>
                                            ) : undefined,
                                        },
                                    }}
                                />
                            }
                            headerExtra={
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={diffMode}
                                onChange={(_event, value: "one" | "split" | null) => {
                                    if (value) {
                                        setDiffMode(value);
                                    }
                                }}
                                aria-label="Diff shows"
                                sx={{ "& .MuiToggleButton-root": { padding: "var(--space-1) var(--space-2)", fontSize: "var(--icon-sm)" } }}
                            >
                                <Tooltip title={<Tip title="One diff" detail="The file's whole change, staged and unstaged together." />}>
                                    <ToggleButton value="one" aria-label="One diff">
                                        <FontAwesomeIcon icon={faFileLines} />
                                    </ToggleButton>
                                </Tooltip>
                                <Tooltip title={<Tip title="Staged and unstaged" detail="The unstaged changes and the staged changes in separate sections, unstaged above." />}>
                                    <ToggleButton value="split" aria-label="Staged and unstaged">
                                        <FontAwesomeIcon icon={faLayerGroup} />
                                    </ToggleButton>
                                </Tooltip>
                            </ToggleButtonGroup>
                            }
                            title={
                                <span className="flex items-baseline" style={{ gap: "var(--space-2)" }}>
                                    Changes
                                    <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-normal)", color: "var(--color-text-muted)" }}>
                                        {files.length === 0 ? "none" : `${liveFiles.length} ${liveFiles.length === 1 ? "file" : "files"}, ${stagedFiles.length} staged`}
                                    </span>
                                </span>
                            }
                        >
                            {files.length === 0 ? (
                                <p className="flex items-center justify-center" style={{ gap: "var(--space-2)", padding: "var(--space-8) var(--space-4)", color: "var(--color-text-muted)" }}>
                                    <FontAwesomeIcon icon={faCheck} style={{ color: "var(--color-success)" }} />
                                    No changes. The working tree matches the last commit.
                                </p>
                            ) : (
                                <div className="flex h-full flex-col" style={{ gap: "var(--space-2)", padding: "var(--space-2)" }}>
                                    {shownFiles.length === 0 ? (
                                        <p style={{ padding: "var(--space-4) var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>No changed file matches the search.</p>
                                    ) : (
                                        (["unstaged", "staged"] as const).map(section => {
                                            const sectionEntries = entries.filter(entry => entry.section === section);
                                            const title = section === "staged" ? "Staged" : "Unstaged";
                                            const isPanelCollapsed = panelCollapsed.has(section) && panelMaximised !== section;
                                            if (panelMaximised !== undefined && panelMaximised !== section) {
                                                return undefined;
                                            }
                                            return (
                                                <section
                                                    key={section}
                                                    aria-label={`${title} files`}
                                                    data-collapsed={isPanelCollapsed || undefined}
                                                    data-maximised={panelMaximised === section || undefined}
                                                    className={isPanelCollapsed ? "flex flex-none flex-col" : "flex min-h-[120px] flex-1 flex-col"}
                                                    style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}
                                                >
                                                    <div
                                                        className="flex flex-none items-center"
                                                        style={{
                                                            gap: "var(--space-2)",
                                                            padding: "var(--space-1) var(--space-1) var(--space-1) var(--space-3)",
                                                            background: "var(--color-raised)",
                                                            borderBottom: isPanelCollapsed ? "none" : "1px solid var(--color-border)",
                                                        }}
                                                    >
                                                        <h3
                                                            className="min-w-0 flex-1 truncate"
                                                            style={{
                                                                fontSize: "var(--text-sm)",
                                                                fontWeight: "var(--weight-bold)",
                                                                color: "var(--color-text-muted)",
                                                            }}
                                                        >
                                                            {title} ({sectionEntries.filter(entry => !isWhollyDiscarded(entry.file)).length})
                                                        </h3>
                                                        {panelMaximised === section ? undefined : (
                                                            <Tooltip title={isPanelCollapsed ? `Restore the ${title.toLowerCase()} files` : `Collapse the ${title.toLowerCase()} files`}>
                                                                <IconButton
                                                                    size="small"
                                                                    aria-label={isPanelCollapsed ? `Restore the ${title.toLowerCase()} files` : `Collapse the ${title.toLowerCase()} files`}
                                                                    aria-expanded={!isPanelCollapsed}
                                                                    onClick={() => togglePanelCollapse(section)}
                                                                >
                                                                    <FontAwesomeIcon icon={isPanelCollapsed ? faChevronDown : faChevronUp} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip title={panelMaximised === section ? `Restore the ${title.toLowerCase()} files` : `Maximise the ${title.toLowerCase()} files`}>
                                                            <IconButton
                                                                size="small"
                                                                aria-label={panelMaximised === section ? `Put the ${title.toLowerCase()} files back` : `Maximise the ${title.toLowerCase()} files`}
                                                                aria-pressed={panelMaximised === section}
                                                                onClick={() => withViewTransition(() => setPanelMaximised(panelMaximised === section ? undefined : section))}
                                                            >
                                                                <FontAwesomeIcon icon={panelMaximised === section ? faDownLeftAndUpRightToCenter : faUpRightAndDownLeftFromCenter} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </div>
                                                    <div data-pane-scroll className={isPanelCollapsed ? "hidden" : "min-h-0 flex-1 overflow-auto"}>
                                                        {sectionEntries.length === 0 ? (
                                                            <p style={{ padding: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
                                                                {section === "staged" ? "Nothing staged yet." : "Everything is staged."}
                                                            </p>
                                                        ) : (
                                                            <List aria-label={`${title} files`} sx={{ padding: "var(--space-1)" }}>
                                                                {sectionEntries.map(entry => fileRow(entry))}
                                                            </List>
                                                        )}
                                                    </div>
                                                </section>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </Pane>
                    </div>
                </div>

                <div className={maximised === 0 || maximised === 2 ? "hidden" : "flex min-h-[420px] min-w-0 flex-1 flex-col lg:min-h-0"} style={{ gap: "var(--space-2)" }} onPointerDown={() => setActivePane(1)}>
                    {selectedFile ? (
                        diffMode === "split" && hunkCountOf(selectedFile) > 0 ? (
                            <SplitDiff
                                file={selectedFile}
                                staging={stagingOf(selectedFile)}
                                onStagingChange={staging => setStaging(selectedFile.path, staging)}
                                isCurrent={activePane === 1}
                                currentStop={currentStop}
                                cardRef={cardRef}
                                onSelectGap={(card, gap) => {
                                    setCurrentStop({ kind: "gap", gap, card });
                                    setActivePane(1);
                                }}
                                discards={discardsOf(selectedFile.path)}
                                onDiscardsChange={discards => setDiscards(selectedFile.path, discards)}
                                isMaximised={maximised === 1}
                                onToggleMaximise={() => toggleMaximise(1)}
                                onSelectHunk={hunk => {
                                    setCurrentHunk(hunk);
                                    setActivePane(1);
                                }}
                            />
                        ) : (
                            <div className="min-h-0 flex-1">
                                <FileDiffCard
                                    key={selectedFile.path + (selectedFile.diff ?? "")}
                                    file={selectedFile}
                                    label="File diff"
                                    ref={cardRef(ONE_DIFF_CARD)}
                                    isCurrent={activePane === 1}
                                    currentHunk={currentHunk}
                                    currentGap={currentStop?.kind === "gap" && currentStop.card === ONE_DIFF_CARD ? currentStop.gap : undefined}
                                    onSelectGap={gap => {
                                        setCurrentStop({ kind: "gap", gap, card: ONE_DIFF_CARD });
                                        setActivePane(1);
                                    }}
                                    staging={stagingOf(selectedFile)}
                                    onStagingChange={staging => setStaging(selectedFile.path, staging)}
                                    answersKeys={false}
                                    discards={discardsOf(selectedFile.path)}
                                    onDiscardsChange={discards => setDiscards(selectedFile.path, discards)}
                                    isMaximised={maximised === 1}
                                    onToggleMaximise={() => toggleMaximise(1)}
                                    onSelectHunk={hunk => {
                                        setCurrentHunk(hunk);
                                        setActivePane(1);
                                    }}
                                    initialWrap
                                    fillHeight
                                />
                            </div>
                        )
                    ) : (
                        <div className="flex flex-1 items-center justify-center" style={{ color: "var(--color-text-muted)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                            {files.length === 0 ? "Nothing to commit." : "Select a file to see its diff."}
                        </div>
                    )}
                </div>

                <div
                    className={
                        maximised === 2
                            ? "flex min-h-0 flex-1 flex-col"
                            : maximised !== undefined
                              ? "hidden"
                              : collapsed.has(2)
                                ? "flex flex-none flex-col lg:min-h-0"
                                : "flex min-h-0 flex-none flex-col lg:w-[240px] 2xl:w-[300px]"
                    }
                    onPointerDown={() => setActivePane(2)}
                >
                <Pane
                    label="Commit"
                    title="Commit"
                    width="100%"
                    fillsHeight
                    isActive={activePane === 2}
                    isMaximised={maximised === 2}
                    onToggleMaximise={() => toggleMaximise(2)}
                    isCollapsed={collapsed.has(2)}
                    onToggleCollapse={() => toggleCollapse(2)}
                    collapseSide="right"
                    isRailResponsive
                >
                <div className="flex h-full flex-col" style={{ gap: "var(--space-4)", padding: "var(--space-4) var(--space-3) var(--space-3)" }}>
                    <TextField
                        size="small"
                        fullWidth
                        label="Summary"
                        value={summary}
                        inputRef={summaryRef}
                        onKeyDown={onMessageKey}
                        onFocus={() => setActivePane(2)}
                        onChange={event => setSummary(event.target.value)}
                    />
                    <TextField
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        label="Description"
                        value={description}
                        onKeyDown={onMessageKey}
                        onFocus={() => setActivePane(2)}
                        onChange={event => setDescription(event.target.value)}
                        //
                        // The description takes the height the commit box has left over, so a long
                        // message has room before it scrolls.
                        //
                        className="lg:min-h-0 lg:flex-1"
                        sx={{
                            "@media (min-width: 1024px)": {
                                "& .MuiInputBase-root": { height: "100%", alignItems: "flex-start" },
                                "& textarea": { height: "100% !important", overflow: "auto !important" },
                            },
                        }}
                    />
                    <div className="flex flex-wrap items-center" style={{ gap: "0 var(--space-3)" }}>
                        <Tooltip title={<Tip title="Amend the last commit" detail="Replaces the last commit with one that also holds what is staged, using this message." />}>
                            <FormControlLabel label="Amend" control={<Checkbox size="small" checked={amend} onChange={event => onAmend(event.target.checked)} />} />
                        </Tooltip>
                        <Tooltip title={<Tip title="No verify (--no-verify)" detail="Commits without running the repository's pre-commit and commit-msg hooks." />}>
                            <FormControlLabel label="No verify" control={<Checkbox size="small" checked={skipHooks} onChange={event => setSkipHooks(event.target.checked)} />} />
                        </Tooltip>
                    </div>
                    <Tooltip
                        title={
                            canCommit ? (
                                <Tip title={amend ? "Amend the last commit" : "Commit the staged changes"} detail={skipHooks ? "With --no-verify, so no hooks run." : undefined} />
                            ) : (
                                <Tip title="Nothing to commit yet" detail="Write a summary and stage a change, or tick Amend." />
                            )
                        }
                    >
                        <span>
                            <Button variant="contained" fullWidth disabled={!canCommit} onClick={commit}>
                                {amend ? "Amend commit" : stagedFiles.length === 0 ? "Nothing to commit" : `Commit ${stagedFiles.length} ${stagedFiles.length === 1 ? "file" : "files"}`}
                            </Button>
                        </span>
                    </Tooltip>
                </div>
                </Pane>
                </div>
            </div>

            <div
                aria-label="Keys"
                className="flex flex-none flex-wrap items-center"
                style={{
                    gap: "var(--space-1) var(--space-4)",
                    padding: "var(--space-2) var(--space-4)",
                    background: "var(--color-panel)",
                    borderTop: "1px solid var(--color-border)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-muted)",
                }}
            >
                {keyHints.map(hint => (
                    <span key={hint.action} className="inline-flex items-center" style={{ gap: "var(--space-2)" }}>
                        <span className="inline-flex" style={{ gap: "var(--space-1)" }}>
                            {hint.keys.map(key => (
                                <KeyCaps key={key} keys={key} />
                            ))}
                        </span>
                        {hint.action}
                    </span>
                ))}
            </div>
            {committed ? (
                //
                // The commit's toast shows at the bottom centre of the screen.
                //
                <div className="fixed left-1/2 z-[1400] -translate-x-1/2" style={{ bottom: "var(--space-6)", width: "min(calc(var(--space-8) * 11), calc(100vw - var(--space-8)))" }}>
                    <ToastStack>
                        <LiveToast key={committed.id} toast={{ id: committed.id, message: { kind: "success", label: "Committed", text: committed.text } }} onClose={closeCommitted} />
                    </ToastStack>
                </div>
            ) : undefined}
        </div>
    );
}
