//
// The changes area: the working tree's changed files beside the selected file's diff, with the
// commit box below the files. Staging happens here, a file or a hunk at a time, and the commit
// box commits what is staged.
//

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { diffStops, stackCardName, stackStopAfterMove, stackStops, stopAfterMove, type DiffStop, type IStackStop } from "../../diff/stops";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronDown, faChevronUp, faDownLeftAndUpRightToCenter, faFileLines, faFolderTree, faGripLines, faGripLinesVertical, faLayerGroup, faList, faMagnifyingGlass, faSliders, faTableColumns, type IconDefinition, faUpRightAndDownLeftFromCenter, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FilePathMenu } from "../../../components/file-path-menu";
import { Tip } from "../../../components/tip";
import { FilePath } from "../../commit-explorer/components/file-path";
import { Pane } from "../../commit-explorer/components/pane";
import { countLines, DISCARD_KEYS, DiscardButton, FileDiffCard, FOLD_DIFF_KEY, isFindKey, OptionRow, StageButton, UndoButton, type IFileDiff, type IFileDiffCardHandle } from "../../diff/components/file-diff-card";
import Popover from "@mui/material/Popover";
import { noDiscards, withFileDiscarded, withHunkMarked, type IDiscards } from "../../diff/discards";
import { parseHunks, sectionDiff, type ISectionDiff } from "../../diff/model";
import { emptyStaging, hunkStagedState, initialStaging, isAnythingStaged, isFileStaged, stagedLinesOf, withFileToggled, withHunkToggled, type IStaging } from "../../diff/staging";
import { withViewTransition } from "../../../lib/view-transition";
import { filePathsInViewOrder, isUnder, parentDirectory, treeGuides, treeRows, withoutCollapsed, type FileListView, type TreeGuide } from "../../commit-explorer/file-views";
import { FileIcon } from "../../../components/file-icon";
import { directoryKeyAction } from "../../../components/tree-guides";
import { collapsedAfterAllKey, TreeBar, TreeDirectoryRow, TreeFileRow } from "../../../components/tree-rows";
import { LiveToast, ToastStack } from "../../notifications";
import { COLLAPSE_KEY } from "../../../components/collapse";
import { PinnableTooltip } from "../../../components/pinnable-tooltip";
import { FileTip } from "../../../components/file-tip";

//
// The message of the last commit, which ticking "Amend the last commit" brings into an empty
// message box.
//
const lastCommit = {
    summary: "Show the Git commands each page runs",
    description: "The help panel in the right sidebar lists the commands, each with a button that copies it.",
};

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
// One row of the file list: a file, or in the tree a directory with the files inside it, each with
// how many directories deep it sits.
//
type ListItem =
    | { kind: "file"; entry: IListEntry; guides: TreeGuide[] }
    | { kind: "directory"; path: string; name: string; section: ListSection; guides: TreeGuide[]; files: IFileDiff[] };

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
        <div className="graft-slide-in flex min-h-0 flex-1 flex-col" style={{ gap: "var(--space-2)" }}>
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
                                isFoldable={false}
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
// Renders a file's label in a list in the chosen view: the full path for full paths, the file name
// and its directory in two columns for file name and directory, and the file name alone in the
// tree, where the directories above it say where it is. `tint` gives a slight tinge, as for a
// staged file.
//
function FileLabel({ path, view, tint }: { path: string; view: FileListView; tint?: string }): ReactNode {
    const slash = path.lastIndexOf("/");
    const name = path.slice(slash + 1);
    const nameColour = tint ? `color-mix(in srgb, var(--color-text) 70%, ${tint})` : undefined;
    if (view === "paths") {
        return <FilePath path={path} tint={tint} />;
    }
    if (view === "tree") {
        return (
            <span className="block truncate" style={{ color: nameColour }}>
                {name}
            </span>
        );
    }
    return (
        <span className="grid min-w-0" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)", gap: "var(--space-3)" }}>
            <span className="truncate" style={{ color: nameColour }}>
                {name}
            </span>
            <span className="truncate" title={path} style={{ color: tint ? `color-mix(in srgb, var(--color-text-muted) 70%, ${tint})` : "var(--color-text-muted)", direction: "rtl", textAlign: "left" }}>
                <bdi>{slash >= 0 ? path.slice(0, slash) : ""}</bdi>
            </span>
        </span>
    );
}

//
// The keys of the Changes pane's options, as KeyboardEvent.key names them in lower case, and as the
// options dialog shows them.
//
export const CHANGES_OPTION_KEYS = { split: "s", stack: "h", fileView: "t" };

//
// The ways the list of files shows, in the order the key steps through them, with each one's icon
// and name.
//
const FILE_VIEWS: { value: FileListView; label: string; icon: IconDefinition }[] = [
    { value: "paths", label: "Full paths", icon: faList },
    { value: "columns", label: "File name and directory", icon: faTableColumns },
    { value: "tree", label: "Tree", icon: faFolderTree },
];

//
// Renders the Changes pane's options button, which opens a dialog under it with each way of
// showing the changes, labelled with what it does and its key: one diff with one list of files, or
// the unstaged and the staged changes apart, and, while they are apart, their panels stacked or
// side by side.
//
export function ChangesOptions({
    diffMode,
    onDiffMode,
    panelStack,
    onPanelStack,
    fileView,
    onFileView,
}: {
    diffMode: "one" | "split";
    onDiffMode: (diffMode: "one" | "split") => void;
    panelStack: "vertical" | "horizontal";
    onPanelStack: (panelStack: "vertical" | "horizontal") => void;
    fileView: FileListView;
    onFileView: (fileView: FileListView) => void;
}): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    const groupStyle = { "& .MuiToggleButton-root": { padding: "var(--space-1) var(--space-2)", fontSize: "var(--icon-sm)" } };
    return (
        <>
            <Tooltip title={<Tip title="Changes options" detail="How the changes show, with a key for each." />}>
                <IconButton size="small" aria-label="Changes options" aria-haspopup="dialog" aria-expanded={anchor !== undefined} onClick={event => setAnchor(event.currentTarget)}>
                    <FontAwesomeIcon icon={faSliders} />
                </IconButton>
            </Tooltip>
            <Popover
                open={anchor !== undefined}
                anchorEl={anchor}
                onClose={() => setAnchor(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { role: "dialog", "aria-label": "Changes options" } }}
            >
                <div className="flex flex-col" style={{ gap: "var(--space-3)", padding: "var(--space-4)", width: "min(calc(var(--space-8) * 13), calc(100vw - var(--space-8)))" }}>
                    <OptionRow
                        label="File list"
                        detail="Full paths, file name and directory, or a tree of directories."
                        keyName={CHANGES_OPTION_KEYS.fileView}
                        control={
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={fileView}
                                onChange={(_event, value: FileListView | null) => {
                                    if (value) {
                                        onFileView(value);
                                    }
                                }}
                                aria-label="List files as"
                                sx={groupStyle}
                            >
                                {FILE_VIEWS.map(view => (
                                    <Tooltip key={view.value} title={view.label}>
                                        <ToggleButton value={view.value} aria-label={view.label}>
                                            <FontAwesomeIcon icon={view.icon} />
                                        </ToggleButton>
                                    </Tooltip>
                                ))}
                            </ToggleButtonGroup>
                        }
                    />
                    <OptionRow
                        label="Diff view"
                        detail="One diff and one list of files, or the unstaged and the staged changes apart."
                        keyName={CHANGES_OPTION_KEYS.split}
                        control={
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={diffMode}
                                onChange={(_event, value: "one" | "split" | null) => {
                                    if (value) {
                                        onDiffMode(value);
                                    }
                                }}
                                aria-label="Diff shows"
                                sx={groupStyle}
                            >
                                <Tooltip title="One diff">
                                    <ToggleButton value="one" aria-label="One diff">
                                        <FontAwesomeIcon icon={faFileLines} />
                                    </ToggleButton>
                                </Tooltip>
                                <Tooltip title="Staged and unstaged">
                                    <ToggleButton value="split" aria-label="Staged and unstaged">
                                        <FontAwesomeIcon icon={faLayerGroup} />
                                    </ToggleButton>
                                </Tooltip>
                            </ToggleButtonGroup>
                        }
                    />
                    <OptionRow
                        label="Panels"
                        detail={diffMode === "split" ? "Unstaged above Staged, or side by side." : "Shows with the unstaged and the staged changes apart."}
                        keyName={CHANGES_OPTION_KEYS.stack}
                        control={
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={panelStack}
                                disabled={diffMode !== "split"}
                                onChange={(_event, value: "vertical" | "horizontal" | null) => {
                                    if (value) {
                                        onPanelStack(value);
                                    }
                                }}
                                aria-label="Panels sit"
                                sx={groupStyle}
                            >
                                <Tooltip title="Stacked">
                                    <ToggleButton value="vertical" aria-label="Stack the panels">
                                        <FontAwesomeIcon icon={faGripLines} />
                                    </ToggleButton>
                                </Tooltip>
                                <Tooltip title="Side by side">
                                    <ToggleButton value="horizontal" aria-label="Put the panels side by side">
                                        <FontAwesomeIcon icon={faGripLinesVertical} />
                                    </ToggleButton>
                                </Tooltip>
                            </ToggleButtonGroup>
                        }
                    />
                </div>
            </Popover>
        </>
    );
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
    const [panelStack, setPanelStack] = useState<"vertical" | "horizontal">("vertical");
    const [fileView, setFileView] = useState<FileListView>("tree");
    const [treeRoot, setTreeRoot] = useState("");
    const [rootHistory, setRootHistory] = useState<string[]>([]);
    const [collapsedDirectories, setCollapsedDirectories] = useState<ReadonlySet<string>>(new Set());

    //
    // The stop the keys are on in a selected directory's stacked diffs.
    //
    const [stackStop, setStackStop] = useState<IStackStop | undefined>(undefined);
    const stackRef = useRef<HTMLDivElement>(null);

    //
    // Keeps the stacked diffs' current stop in view as the keys move it.
    //
    useEffect(() => {
        if (!stackStop) {
            return;
        }
        const card = [...(stackRef.current?.querySelectorAll<HTMLElement>("[data-stack-path]") ?? [])].find(element => element.dataset.stackPath === stackStop.path);
        const selector = stackStop.stop?.kind === "hunk" ? `[data-hunk-index="${stackStop.stop.hunk}"]` : stackStop.stop?.kind === "gap" ? `[data-gap-index="${stackStop.stop.gap}"]` : undefined;
        const target = (selector ? card?.querySelector<HTMLElement>(selector) : undefined) ?? card;
        target?.scrollIntoView({ block: "nearest" });
    }, [stackStop]);

    //
    // Collapses the directory `path`, hiding the rows inside it, or expands it again.
    //
    function toggleCollapsedDirectory(path: string, isCollapsed = !collapsedDirectories.has(path)): void {
        setCollapsedDirectories(current => {
            const next = new Set(current);
            if (isCollapsed) {
                next.add(path);
            }
            else {
                next.delete(path);
            }
            return next;
        });
    }

    //
    // Returns the path of every directory in the tree from its focused directory down, collapsed
    // or not, for expand all, collapse all and the A key.
    //
    function treeDirectories(): string[] {
        return treeRows(shownFiles, shownRoot).flatMap(row => (row.kind === "directory" ? [row.path] : []));
    }
    const [selectedDirectory, setSelectedDirectory] = useState<{ path: string; section: ListSection } | undefined>(undefined);
    const shownRoot = fileView === "tree" ? treeRoot : "";

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
    const orderedFiles = filePathsInViewOrder(shownFiles, fileView, shownRoot).map(path => shownFiles.find(file => file.path === path) as IFileDiff);
    const entries: IListEntry[] =
        diffMode === "one"
            ? orderedFiles.map(file => ({ file, section: "all" as const }))
            : [
                  ...orderedFiles.filter(file => stagedState(stagingOf(file), hunkCountOf(file)) !== "all").map(file => ({ file, section: "unstaged" as const })),
                  ...orderedFiles.filter(file => stagedState(stagingOf(file), hunkCountOf(file)) !== "none").map(file => ({ file, section: "staged" as const })),
              ];
    const selectedEntry = selectedDirectory ? undefined : (entries.find(entry => entry.file.path === selectedPath && entry.section === selectedSection) ?? entries.find(entry => entry.file.path === selectedPath));

    //
    // The rows the file list shows, in order, which Up and Down move through: in the tree, each
    // directory above its files; otherwise one row per file. In the split, the unstaged rows come
    // before the staged ones.
    //
    function itemsOf(listEntries: IListEntry[], section: ListSection): ListItem[] {
        if (fileView !== "tree") {
            return listEntries.map(entry => ({ kind: "file", entry, guides: [] }));
        }
        const rows = withoutCollapsed(treeRows(listEntries.map(entry => ({ path: entry.file.path, entry })), shownRoot), collapsedDirectories);
        const guides = treeGuides(rows);
        return rows.map((row, index) =>
            row.kind === "directory"
                ? { kind: "directory", path: row.path, name: row.name, section, guides: guides[index], files: listEntries.filter(entry => isUnder(entry.file.path, row.path)).map(entry => entry.file) }
                : { kind: "file", entry: row.file.entry, guides: guides[index] },
        );
    }
    const unstagedItems = itemsOf(entries.filter(entry => entry.section === "unstaged"), "unstaged");
    const stagedItems = itemsOf(entries.filter(entry => entry.section === "staged"), "staged");
    const items: ListItem[] = diffMode === "one" ? itemsOf(entries, "all") : [...unstagedItems, ...stagedItems];
    const selectedDirectoryItem = items.find((item): item is Extract<ListItem, { kind: "directory" }> => item.kind === "directory" && selectedDirectory?.path === item.path && selectedDirectory.section === item.section);

    function isItemSelected(item: ListItem): boolean {
        return item.kind === "directory" ? selectedDirectory?.path === item.path && selectedDirectory.section === item.section : item.entry === selectedEntry;
    }

    function selectDirectory(path: string, section: ListSection): void {
        setSelectedDirectory({ path, section });
        setStackStop(undefined);
        setActivePane(0);
    }

    function selectItem(item: ListItem, pane: 0 | 1): void {
        if (item.kind === "directory") {
            selectDirectory(item.path, item.section);
        }
        else {
            selectFile(item.entry.file.path, item.entry.section, pane);
        }
    }

    //
    // Shows only the changes inside the directory `path`, with the first row inside it selected.
    //
    function drillInto(path: string): void {
        //
        // The row the keys were on goes as the list changes, so the keys move to the area.
        //
        areaRef.current?.focus();
        setRootHistory(current => [...current, treeRoot]);
        setTreeRoot(path);
        setSelectedDirectory(undefined);
        const first = entries.find(entry => isUnder(entry.file.path, path));
        if (first) {
            setSelectedPath(first.file.path);
            setSelectedSection(first.section);
        }
    }

    //
    // Goes back from a directory the list shows to the view it was opened from, with the directory
    // that was shown selected.
    //
    function drillOut(): void {
        if (treeRoot === "") {
            return;
        }
        areaRef.current?.focus();
        const section = selectedDirectory?.section ?? selectedEntry?.section ?? "all";
        setSelectedDirectory({ path: treeRoot, section: diffMode === "one" ? "all" : section });
        setTreeRoot(rootHistory[rootHistory.length - 1] ?? parentDirectory(treeRoot));
        setRootHistory(current => current.slice(0, -1));
    }

    //
    // Returns true when every file of a directory's row is staged: always on the staged side of the
    // split, never on the unstaged side, and in the single list when each file is staged whole.
    //
    function isDirectoryStaged(item: Extract<ListItem, { kind: "directory" }>): boolean {
        if (item.section !== "all") {
            return item.section === "staged";
        }
        return item.files.every(file => stagedState(stagingOf(file), hunkCountOf(file)) === "all");
    }

    //
    // Stages every file of a directory's row, or unstages them all when the directory is staged.
    //
    function toggleDirectoryStaged(item: Extract<ListItem, { kind: "directory" }>): void {
        const isStaged = isDirectoryStaged(item);
        setStagings(current => {
            const next = new Map(current);
            for (const file of item.files) {
                next.set(file.path, isStaged ? emptyStaging() : withFileToggled(emptyStaging(), hunkCountOf(file)));
            }
            return next;
        });
    }

    //
    // Discards every file of a directory's row, or brings them all back when they are all
    // discarded.
    //
    function discardDirectory(item: Extract<ListItem, { kind: "directory" }>): void {
        const isDiscarded = item.files.every(file => discardsOf(file.path).isFile);
        setDiscardsByPath(current => {
            const next = new Map(current);
            for (const file of item.files) {
                next.set(file.path, isDiscarded ? noDiscards() : withFileDiscarded(discardsOf(file.path), true));
            }
            return next;
        });
    }

    function selectFile(path: string, section: ListSection, pane: 0 | 1): void {
        setSelectedDirectory(undefined);
        if (path !== selectedPath) {
            setCurrentHunk(undefined);
        }
        setSelectedPath(path);
        setSelectedSection(section);
        setActivePane(pane);
    }

    function moveFile(step: number, pane: 0 | 1): void {
        //
        // In the file list, Up and Down move through every row, directories too; from the diff they
        // move from file to file.
        //
        const rows = pane === 0 ? items : items.filter(item => item.kind === "file");
        const index = rows.findIndex(isItemSelected);
        const next = rows[Math.min(Math.max(index + step, 0), rows.length - 1)];
        if (next) {
            selectItem(next, pane);
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
        const directory = items.find(item => item.kind === "directory" && isItemSelected(item));
        if (activePane === 0 && directory?.kind === "directory") {
            discardDirectory(directory);
            return;
        }
        if (activePane === 1 && selectedDirectoryItem && stackStop) {
            const discards = discardsOf(stackStop.path);
            const stop = stackStop.stop;
            setDiscards(stackStop.path, stop?.kind === "hunk" && !discards.isFile ? withHunkMarked(discards, stop.hunk, !discards.hunks.has(stop.hunk)) : withFileDiscarded(discards, !discards.isFile));
            return;
        }
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
        if (isFindKey(event) && activePane === 0) {
            //
            // Ctrl+F in the file list puts the keys in its search box.
            //
            event.preventDefault();
            areaRef.current?.querySelector<HTMLInputElement>('input[placeholder="Search changed files"]')?.focus();
            return;
        }
        if (isFindKey(event) && activePane === 1) {
            //
            // Ctrl+F starts find mode in the diff the keys are on: the current file of a
            // directory's stacked diffs, or the selected file's diff, the unstaged side first in
            // the split.
            //
            const names = selectedDirectoryItem
                ? [stackCardName(stackStop?.path ?? selectedDirectoryItem.files[0]?.path ?? "")]
                : diffMode === "one"
                  ? [ONE_DIFF_CARD]
                  : ["Unstaged diff", "Staged diff"];
            const card = names.map(name => cardRefs.current.get(name)).find(handle => handle);
            if (card) {
                event.preventDefault();
                setActivePane(1);
                card.openFind();
            }
            return;
        }
        if (
            event.ctrlKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.shiftKey &&
            (event.key === "ArrowUp" || event.key === "ArrowDown") &&
            activePane === 1 &&
            selectedDirectoryItem &&
            !isOwnKeyTarget(event.target, event.key)
        ) {
            event.preventDefault();
            setStackStop(stackStopAfterMove(stackStops(selectedDirectoryItem.files), stackStop, event.key === "ArrowUp" ? -1 : 1, true));
            return;
        }
        if (event.ctrlKey || event.altKey || event.metaKey || isOwnKeyTarget(event.target, event.key)) {
            return;
        }
        const key = event.key;
        if (key === "m" || key === "M") {
            event.preventDefault();
            toggleMaximise(activePane);
            return;
        }
        if (key.toLowerCase() === CHANGES_OPTION_KEYS.fileView && !event.shiftKey) {
            event.preventDefault();
            const index = FILE_VIEWS.findIndex(view => view.value === fileView);
            setFileView(FILE_VIEWS[(index + 1) % FILE_VIEWS.length].value);
            return;
        }
        if (key.toLowerCase() === CHANGES_OPTION_KEYS.split && !event.shiftKey) {
            event.preventDefault();
            setDiffMode(diffMode === "one" ? "split" : "one");
            return;
        }
        if (key.toLowerCase() === CHANGES_OPTION_KEYS.stack && !event.shiftKey && diffMode === "split") {
            event.preventDefault();
            withViewTransition(() => setPanelStack(panelStack === "vertical" ? "horizontal" : "vertical"));
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
        if (activePane === 1 && key.toUpperCase() === FOLD_DIFF_KEY && !event.shiftKey) {
            //
            // Folds away or shows the diff the keys are on: the current file of a directory's
            // stacked diffs, or the selected file's diff.
            //
            event.preventDefault();
            const cards = selectedDirectoryItem ? (stackStop ? [stackCardName(stackStop.path)] : []) : diffMode === "one" ? [ONE_DIFF_CARD] : ["Staged diff", "Unstaged diff"];
            cards.forEach(card => cardRefs.current.get(card)?.toggleOpen());
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
        //
        // Space stages the selected row here, a directory as well as a file, so only E expands or
        // collapses a directory.
        //
        const directoryAction = activePane === 0 && fileView === "tree" && key !== " " ? directoryKeyAction(event) : undefined;
        if (directoryAction) {
            const directory = items.find(item => item.kind === "directory" && isItemSelected(item));
            event.preventDefault();
            if (directoryAction === "up") {
                drillOut();
            }
            else if (directory?.kind === "directory" && directoryAction === "focus") {
                drillInto(directory.path);
            }
            else if (directory?.kind === "directory" && directoryAction === "toggle") {
                toggleCollapsedDirectory(directory.path);
            }
            else if (directoryAction === "all") {
                setCollapsedDirectories(collapsedAfterAllKey(treeDirectories(), collapsedDirectories));
            }
            return;
        }
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape", " ", "Enter"].includes(key)) {
            return;
        }
        event.preventDefault();
        if (activePane === 0) {
            const directory = items.find(item => item.kind === "directory" && isItemSelected(item));
            if (key === "ArrowUp" || key === "ArrowDown") {
                moveFile(key === "ArrowUp" ? -1 : 1, 0);
            }
            else if (key === " " && directory?.kind === "directory") {
                toggleDirectoryStaged(directory);
            }
            else if (key === "Enter" && directory?.kind === "directory") {
                drillInto(directory.path);
            }
            else if (key === "Escape") {
                drillOut();
            }
            else if (key === " " && selectedEntry) {
                toggleEntry(selectedEntry);
            }
            else if (key === "ArrowRight" && directory?.kind === "directory") {
                setActivePane(1);
                setStackStop(stackStopAfterMove(stackStops(directory.files), undefined, 1, false));
            }
            else if (key === "ArrowRight" && selectedFile) {
                setActivePane(1);
            }
            return;
        }
        if (selectedDirectoryItem) {
            //
            // In a directory's stacked diffs, Up and Down step through every file's hunks and runs
            // of unchanged lines, and Space stages or unstages the hunk, opens or folds the run, or
            // stages or unstages a file with neither.
            //
            if (key === "ArrowUp" || key === "ArrowDown") {
                setStackStop(stackStopAfterMove(stackStops(selectedDirectoryItem.files), stackStop, key === "ArrowUp" ? -1 : 1, false));
            }
            else if (key === " " && stackStop) {
                const file = selectedDirectoryItem.files.find(candidate => candidate.path === stackStop.path);
                const stop = stackStop.stop;
                if (stop?.kind === "gap") {
                    cardRefs.current.get(stackCardName(stackStop.path))?.toggleGap(stop.gap);
                }
                else if (file) {
                    setStaging(file.path, stop?.kind === "hunk" ? withHunkToggled(stagingOf(file), stop.hunk) : withFileToggled(stagingOf(file), hunkCountOf(file)));
                }
            }
            else if (key === "ArrowLeft" || key === "Escape") {
                setActivePane(0);
            }
            else if (key === "ArrowRight") {
                moveToCommit();
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
        else if (key === "Enter") {
            return;
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
    // Commit pane active, so the arrow keys move between the panes again; and on Left with the
    // cursor at the start of the box, to the diff.
    //
    function onMessageKey(event: KeyboardEvent): void {
        const box = event.target;
        const isAtStart = (box instanceof HTMLInputElement || box instanceof HTMLTextAreaElement) && box.selectionStart === 0 && box.selectionEnd === 0;
        if (event.key === "ArrowLeft" && isAtStart && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
            //
            // Left with the cursor at the very start of the box, nothing selected, moves the keys
            // out of the box to the diff, the pane to the left.
            //
            event.preventDefault();
            event.stopPropagation();
            setActivePane(1);
            areaRef.current?.focus();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setActivePane(2);
            areaRef.current?.focus();
        }
    }

    //
    // Renders the rows of a list in the chosen view: a row per file and, in the tree, a row per
    // directory above its files, joined by tree lines while the stage buttons keep the left column.
    //
    function listRows(listItems: ListItem[]): ReactNode {
        return listItems.map(item => (item.kind === "directory" ? directoryRow(item) : fileRow(item.entry, item.guides)));
    }

    //
    // Renders a directory's row in the tree, selectable and moved through with the keys like a
    // file's: at the left the button that stages or unstages every file in it, then the directory's
    // name with the menu of ways to copy its path, and at the right Discard for every file in it on
    // the selected row and the row under the pointer, or Undo once they are all discarded. Enter or
    // a double click shows only the changes inside it.
    //
    function directoryRow(item: Extract<ListItem, { kind: "directory" }>): ReactNode {
        const isStaged = isDirectoryStaged(item);
        const isDiscarded = item.files.every(file => discardsOf(file.path).isFile);
        return (
            <TreeDirectoryRow
                key={`directory:${item.section}:${item.path}`}
                path={item.path}
                name={item.name}
                guides={item.guides}
                isCollapsed={collapsedDirectories.has(item.path)}
                isSelected={isItemSelected(item)}
                isHighlighted={false}
                isOpen={false}
                icon={undefined}
                tint={isStaged ? "var(--color-success)" : undefined}
                isDiscarded={isDiscarded}
                lead={
                    <span data-floating-actions className="flex flex-none items-center" style={{ width: "calc(var(--space-6) + var(--space-1))" }}>
                        {isDiscarded ? undefined : <StageButton isStaged={isStaged} what="directory" onClick={() => toggleDirectoryStaged(item)} isProminent />}
                    </span>
                }
                menu={<FilePathMenu path={item.path} kind="directory" />}
                trail={
                    <span data-floating-actions className="flex flex-none items-center" style={{ marginLeft: "var(--space-2)" }}>
                        {isDiscarded ? (
                            <UndoButton what="directory" onClick={() => discardDirectory(item)} />
                        ) : (
                            <span className="file-discard inline-flex">
                                <DiscardButton what="directory" onClick={() => discardDirectory(item)} />
                            </span>
                        )}
                    </span>
                }
                rowRef={undefined}
                onSelect={() => selectDirectory(item.path, item.section)}
                onToggle={() => toggleCollapsedDirectory(item.path)}
                onFocus={() => drillInto(item.path)}
            />
        );
    }

    //
    // Renders the bar at the top of the tree: the way back up while the tree is focused on a
    // directory, and the expand all and collapse all buttons. The other views have none.
    //
    function treeBar(): ReactNode {
        if (fileView !== "tree") {
            return undefined;
        }
        return (
            <ul className="flex-none" style={{ margin: 0, padding: 0 }}>
                <TreeBar focusedPath={shownRoot} onBack={drillOut} onExpandAll={() => setCollapsedDirectories(new Set())} onCollapseAll={() => setCollapsedDirectories(new Set(treeDirectories()))} />
            </ul>
        );
    }

    //
    // Renders one file's row in the single list or in the Staged or the Unstaged panel: at the left
    // the button that stages or unstages it, a minus for a file staged whole in the single list or
    // any file on the staged side, then its path and its path menu, and at the right Discard on the
    // selected row and the row under the pointer, or Undo on a discarded one.
    //
    function fileRow(entry: IListEntry, guides: TreeGuide[] = [], view: FileListView = fileView): ReactNode {
        const { file, section } = entry;
        const isChecked = section === "all" ? stagedState(stagingOf(file), hunkCountOf(file)) === "all" : section === "staged";
        const isDiscarded = discardsOf(file.path).isFile;
        return (
            <TreeFileRow
                key={`${section}:${file.path}`}
                path={file.path}
                label={
                    //
                    // A staged file's path takes a slight green tinge.
                    //
                    <FileLabel path={file.path} view={view} tint={isChecked ? "var(--color-success)" : undefined} />
                }
                icon={<FileIcon path={file.path} />}
                guides={guides}
                isSelected={entry === selectedEntry}
                isOpen={false}
                isDiscarded={isDiscarded}
                lead={
                    <span data-floating-actions className="flex flex-none items-center" style={{ width: "calc(var(--space-6) + var(--space-1))" }}>
                        {isDiscarded ? undefined : <StageButton isStaged={isChecked} what="file" onClick={() => toggleEntry(entry)} isProminent />}
                    </span>
                }
                extra={undefined}
                wrapLabel={label => (
                    <PinnableTooltip enterDelayMs={500} maxWidth="calc(var(--space-8) * 12)" tip={pinButton => <FileTip file={{ ...file, linesAdded: countLines(file.diff).added, linesDeleted: countLines(file.diff).deleted }} pinButton={pinButton} />}>
                        {label}
                    </PinnableTooltip>
                )}
                menu={<FilePathMenu path={file.path} />}
                trail={
                    <span data-floating-actions className="flex flex-none items-center" style={{ marginLeft: "var(--space-2)" }}>
                        {isDiscarded ? (
                            <UndoButton what="file" onClick={() => setDiscards(file.path, noDiscards())} />
                        ) : (
                            <span className="file-discard inline-flex">
                                <DiscardButton what="file" onClick={() => setDiscards(file.path, withFileDiscarded(discardsOf(file.path), true))} />
                            </span>
                        )}
                    </span>
                }
                rowRef={undefined}
                onSelect={() => selectFile(file.path, section, 0)}
            />
        );
    }

    return (
        <div
            ref={areaRef}
            role="application"
            aria-label="Changes"
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={`flex flex-col ${diffMode === "split" ? "lg:h-[900px]" : "lg:h-[680px]"} focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--color-focus)]`}
            style={{
                background: "var(--color-bg)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                outline: "none",
            }}
        >
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row" style={{ gap: "var(--space-3)" }}>
                <div
                    className={
                        maximised === 1 || maximised === 2
                            ? "hidden"
                            : maximised === 0
                              ? "flex min-h-0 flex-1 flex-col"
                              : collapsed.has(0)
                                ? "flex flex-none flex-col lg:min-h-0"
                                : diffMode === "split" && panelStack === "horizontal"
                                  ? "flex min-h-[420px] flex-col lg:min-h-0 lg:w-[480px] lg:flex-none 2xl:w-[600px]"
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
                                <ChangesOptions
                                    diffMode={diffMode}
                                    onDiffMode={setDiffMode}
                                    panelStack={panelStack}
                                    onPanelStack={value => withViewTransition(() => setPanelStack(value))}
                                    fileView={fileView}
                                    onFileView={setFileView}
                                />
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
                                <div className="flex h-full flex-col">
                                {treeBar()}
                                <div className={panelStack === "vertical" ? "flex min-h-0 flex-1 flex-col" : "flex min-h-0 flex-1 flex-row"} style={{ gap: "var(--space-2)", padding: "var(--space-2)" }}>
                                    {shownFiles.length === 0 ? (
                                        <p style={{ padding: "var(--space-4) var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>No changed file matches the search.</p>
                                    ) : diffMode === "one" ? (
                                        <List aria-label="Changed files" sx={{ padding: 0 }}>
                                            {listRows(items)}
                                        </List>
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
                                                    className={isPanelCollapsed ? "flex flex-none flex-col" : panelStack === "vertical" ? "flex min-h-[120px] flex-1 flex-col" : "flex min-w-0 flex-1 flex-col"}
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
                                                                {listRows(section === "staged" ? stagedItems : unstagedItems)}
                                                            </List>
                                                        )}
                                                    </div>
                                                </section>
                                            );
                                        })
                                    )}
                                </div>
                                </div>
                            )}
                        </Pane>
                    </div>
                </div>

                <div className={maximised === 0 || maximised === 2 ? "hidden" : "flex min-h-[420px] min-w-0 flex-1 flex-col lg:min-h-0"} style={{ gap: "var(--space-2)" }} onPointerDown={() => setActivePane(1)}>
                    {selectedDirectoryItem ? (
                        //
                        // A selected directory shows the diffs of all its files stacked, each with
                        // its own button that collapses or expands it, the column scrolling as a
                        // whole.
                        //
                        <div ref={stackRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto" role="region" aria-label={`Diffs in ${selectedDirectoryItem.path}`} style={{ gap: "var(--space-3)" }}>
                            {selectedDirectoryItem.files.map(file => (
                                //
                                // Each card keeps its full height, so the column scrolls through
                                // them.
                                //
                                <div key={file.path + (file.diff ?? "")} className="flex-none" data-stack-path={file.path}>
                                <FileDiffCard
                                    file={file}
                                    label={`File diff ${file.path}`}
                                    ref={cardRef(stackCardName(file.path))}
                                    isCurrent={activePane === 1 && stackStop?.path === file.path}
                                    currentHunk={stackStop?.path === file.path && stackStop.stop?.kind === "hunk" ? stackStop.stop.hunk : undefined}
                                    currentGap={stackStop?.path === file.path && stackStop.stop?.kind === "gap" ? stackStop.stop.gap : undefined}
                                    onSelectHunk={hunk => {
                                        setStackStop({ path: file.path, stop: { kind: "hunk", hunk } });
                                        setActivePane(1);
                                    }}
                                    onSelectGap={gap => {
                                        setStackStop({ path: file.path, stop: { kind: "gap", gap, card: stackCardName(file.path) } });
                                        setActivePane(1);
                                    }}
                                    staging={stagingOf(file)}
                                    onStagingChange={staging => setStaging(file.path, staging)}
                                    answersKeys={false}
                                    discards={discardsOf(file.path)}
                                    onDiscardsChange={discards => setDiscards(file.path, discards)}
                                    initialWrap
                                />
                                </div>
                            ))}
                        </div>
                    ) : selectedFile ? (
                        diffMode === "split" && hunkCountOf(selectedFile) > 0 ? (
                            <SplitDiff
                                key={selectedFile.path}
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
                            //
                            // The diff slides in from the left when another file is picked.
                            //
                            <div key={selectedFile.path} className="graft-slide-in min-h-0 flex-1">
                                <FileDiffCard
                                    isFoldable={false}
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
