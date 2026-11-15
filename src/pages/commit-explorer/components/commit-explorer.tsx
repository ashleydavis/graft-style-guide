//
// The commit explorer: Graft's window onto a repository's history. The commit pane lists the
// commits; opening one adds the commit details pane to its right, and opening a changed file adds
// the file pane, as in the column view of a file browser.
//

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { diffStops, stackStopAfterMove, stackStops, stopAfterMove, type DiffStop, type IStackStop } from "../../diff/stops";
import { exampleOldFile } from "../../diff/example-old-file";
import { FOLD_DIFF_KEY, isFindKey, type IFileDiffCardHandle } from "../../diff/components/file-diff-card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { changedFile, commitByHash, graftHistory, type ICommit, type IHistory } from "../data";
import { closeCommitDetailsPane, closeFilePane, COMMIT_SUMMARY_PATH, explorerKeys, FOLDER_PREFIX, initialExplorerState, selectCommit, selectFile, stateAfterKey, type IExplorerState } from "../explorer-state";
import { filePathsInViewOrder, isUnder, parentFolder, rowPathsInViewOrder, type FileListView } from "../file-views";
import { scrollLastChildIntoView, scrollSelectionIntoView } from "../scroll";
import { parseHunks } from "../../diff/model";
import { CommitDetailsPane, CommitInfoPane } from "./commit-details-pane";
import { CommitPane } from "./commit-pane";
import { DirectoryPane, FilePane } from "./file-pane";
import { directoryKeyAction } from "../../../components/tree-guides";
import { isSearchKey, matchesSearch, useSearchMode } from "../../../components/search-box";
import { ResizeHandle } from "./resize-handle";
import { COLLAPSE_KEY } from "../../../components/collapse";
import { withViewTransition } from "../../../lib/view-transition";

//
// The width the commit details pane starts at, and goes back to when its resize handle is
// double-clicked, in pixels. The commit pane sizes itself until its handle is dragged, and goes
// back to sizing itself on a double-click.
//
const DETAILS_PANE_WIDTH = 380;

//
// Returns true when `key` pressed with the focus on `target` belongs to the target itself: every
// key in a text box, and Enter on a link or a real button, such as a pane's close button or the
// file view switch, which Enter presses, and every key in an open menu, dialog or list box, which
// move through their own items. The arrow keys and Escape on a button still move through the
// explorer, so the keys keep working after a click on a button.
//
function isOwnKeyTarget(target: EventTarget, key: string): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (target.closest('input, textarea, select, [role="separator"], [role="menu"], [role="dialog"], [role="listbox"]') !== null) {
        return true;
    }
    return key === "Enter" && target.closest("a, button") !== null;
}

//
// Returns the commits that match `search`, ignoring case: those whose title, author, hash or refs
// contain it. An empty search matches every commit.
//
// The panes' labels in order, so a pane's position, as the explorer's state counts them, comes
// from its label.
//
const PANE_LABELS = ["Commits", "Commit details", "File diff", "Full commit details"];

//
export function matchingCommits(commits: ICommit[], search: string): ICommit[] {
    const needle = search.trim().toLowerCase();
    if (needle === "") {
        return commits;
    }
    return commits.filter(commit => [commit.title, commit.authorName, commit.hash, ...commit.refs].some(text => text.toLowerCase().includes(needle)));
}

//
// Renders the explorer in a window frame: a title bar with the repository and branch, the panes,
// with a search box at the top of the commit list. Each button's tooltip names its key. While a search is typed,
// every commit keeps its place and its lanes, the commits that do not match fade, and Up and Down
// move through the matches only. The explorer answers its keys while the focus is anywhere inside it outside the
// search box; click a commit or move to the explorer with Tab to use them. In the file pane, Up and
// Down move from change to change in the diff, marking the current one, and Shift with Up or Down
// opens the previous or next file of the commit. It shows `history`, the
// small example history by default, and starts as `initialState` sets it, which by default selects
// the newest commit and opens nothing. When a pane opens, the panes scroll sideways to bring it
// into view.
//
export function CommitExplorer({ history = graftHistory, initialState }: { history?: IHistory; initialState?: IExplorerState }): ReactNode {
    const [state, setState] = useState<IExplorerState>(initialState ?? { ...initialExplorerState, selectedHash: history.commits[0].hash });
    const [search, setSearch] = useState("");
    const [fileView, setFileView] = useState<FileListView>("tree");
    const [treeRoot, setTreeRoot] = useState("");
    const [rootHistory, setRootHistory] = useState<string[]>([]);
    const [collapsedFolders, setCollapsedFolders] = useState<ReadonlySet<string>>(new Set());
    const fileSearch = useSearchMode();

    //
    // Returns the files of a commit the file list's search keeps.
    //
    function searchedFiles<File extends { path: string }>(files: File[]): File[] {
        return files.filter(file => matchesSearch(file.path, fileSearch.query));
    }

    //
    // Collapses the folder `path` in the commit's file list, hiding the rows inside it, or expands
    // it again.
    //
    function toggleCollapsedFolder(path: string, isCollapsed = !collapsedFolders.has(path)): void {
        setCollapsedFolders(current => {
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
    const shownRoot = fileView === "tree" ? treeRoot : "";

    //
    // Shows only the open commit's files inside the folder `path`, with its first row selected.
    //
    function drillInto(path: string): void {
        explorerRef.current?.focus();
        setRootHistory(current => [...current, treeRoot]);
        setTreeRoot(path);
        setState(current => ({ ...current, activePaneIndex: 1, selectedPath: undefined, openPath: undefined }));
    }

    //
    // Goes back from a folder the file list shows to the view it was opened from, with the folder
    // selected.
    //
    function drillOut(): void {
        if (treeRoot === "") {
            return;
        }
        explorerRef.current?.focus();
        const folder = `${FOLDER_PREFIX}${treeRoot}`;
        setTreeRoot(rootHistory[rootHistory.length - 1] ?? parentFolder(treeRoot));
        setRootHistory(current => current.slice(0, -1));
        setState(current => ({ ...current, activePaneIndex: 1, selectedPath: folder, openPath: folder }));
    }
    const [commitPaneWidth, setCommitPaneWidth] = useState<number | undefined>(undefined);
    const [detailsPaneWidth, setDetailsPaneWidth] = useState(DETAILS_PANE_WIDTH);
    const [maximised, setMaximised] = useState<number | undefined>(undefined);

    //
    // Returns the width on screen of the pane named `label`, in pixels.
    //
    function paneWidth(label: string): number {
        return columnsRef.current?.querySelector(`[aria-label="${label}"]`)?.getBoundingClientRect().width ?? 0;
    }
    const commits = matchingCommits(history.commits, search);
    const matchingHashes = new Set(commits.map(commit => commit.hash));
    const isSearching = search.trim() !== "";
    const columnsRef = useRef<HTMLDivElement>(null);
    const explorerRef = useRef<HTMLDivElement>(null);
    const openCommit = state.openHash !== undefined ? commitByHash(history, state.openHash) : undefined;
    const isCommitOpen = state.openPath === COMMIT_SUMMARY_PATH;
    const isFolderOpen = state.openPath?.startsWith(FOLDER_PREFIX) === true;
    const openFile = state.openHash !== undefined && state.openPath !== undefined && !isCommitOpen && !isFolderOpen ? changedFile(history, state.openHash, state.openPath) : undefined;
    const [currentStop, setCurrentStop] = useState<DiffStop | undefined>(undefined);
    const currentHunk = currentStop?.kind === "hunk" ? currentStop.hunk : undefined;
    const currentGap = currentStop?.kind === "gap" ? currentStop.gap : undefined;
    const fileCardRef = useRef<IFileDiffCardHandle>(null);
    const openFolder = openCommit && isFolderOpen ? (state.openPath as string).slice(FOLDER_PREFIX.length) : undefined;
    const openFolderFiles =
        openCommit && openFolder !== undefined
            ? filePathsInViewOrder(openCommit.files.filter(file => isUnder(file.path, openFolder)), fileView, openFolder).map(path => changedFile(history, openCommit.hash, path))
            : [];

    //
    // The stop the keys are on in the open directory's stacked diffs, and the stops they step
    // through. A different directory starts with no stop.
    //
    const [stackStop, setStackStop] = useState<IStackStop | undefined>(undefined);
    const stackCardRefs = useRef(new Map<string, IFileDiffCardHandle | null>());
    const directoryStops = stackStops(openFolderFiles.map(file => ({ path: file.path, diff: file.diff, oldFileLines: exampleOldFile(file.path, file.status, file.diff) })));
    useEffect(() => {
        setStackStop(undefined);
    }, [openFolder]);
    const openPaneCount = openFile || (openCommit && (isCommitOpen || openFolder !== undefined)) ? 3 : openCommit ? 2 : 1;
    const maximisedPane = maximised !== undefined && maximised < openPaneCount ? maximised : undefined;

    //
    // Maximises the pane at `index`, or puts the panes back when it is the maximised one.
    //
    function toggleMaximise(index: number): void {
        withViewTransition(() => setMaximised(maximisedPane === index ? undefined : index));
    }

    //
    // Returns true when the pane at `index` shows: every pane while none is maximised, and only
    // the maximised one while one is.
    //
    const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());

    //
    // Collapses the pane at `index` into a strip at its left, or restores it. A pane stays as it is
    // while one pane is maximised.
    //
    function toggleCollapse(index: number): void {
        if (maximisedPane !== undefined) {
            return;
        }
        //
        // The pane's rows go as it collapses, so the keys move to the explorer to keep working.
        //
        explorerRef.current?.focus();
        withViewTransition(() =>
            setCollapsed(current => {
                const next = new Set(current);
                if (next.has(index)) {
                    next.delete(index);
                }
                else {
                    next.add(index);
                }
                return next;
            }),
        );
    }

    function shows(index: number): boolean {
        return maximisedPane === undefined || maximisedPane === index;
    }

    useEffect(() => {
        setTreeRoot("");
        setRootHistory([]);
    }, [state.openHash]);

    useEffect(() => {
        setCurrentStop(undefined);
    }, [state.openHash, state.openPath]);

    useEffect(() => {
        if (columnsRef.current) {
            scrollLastChildIntoView(columnsRef.current);
        }
    }, [state.openHash, state.openPath]);

    useEffect(() => {
        const selector = currentStop?.kind === "gap" ? `[data-gap-index="${currentStop.gap}"]` : `[data-hunk-index="${currentHunk}"]`;
        const element = columnsRef.current?.querySelector(`[aria-label="File diff"] ${selector}`);
        if (element instanceof HTMLElement) {
            scrollSelectionIntoView(element);
        }
    }, [currentStop, currentHunk]);

    //
    // Moves the keys `step` stops from the current one in the open file, through its hunks and the
    // runs of unchanged lines between them, staying on the first or last stop at the ends. With no
    // stop current yet, Down goes to the first stop and Up to the last.
    //
    function moveHunk(step: number): void {
        if (!openFile) {
            return;
        }
        setCurrentStop(current => stopAfterMove(diffStops(openFile.diff, exampleOldFile(openFile.path, openFile.status, openFile.diff)), current, step));
    }

    //
    // Opens the file `step` files from the open one in the commit's file list, in the order the
    // list shows them, and keeps the keys in the file pane.
    //
    function moveFile(step: number): void {
        if (!openCommit) {
            return;
        }
        const paths = [COMMIT_SUMMARY_PATH, ...filePathsInViewOrder(searchedFiles(openCommit.files), fileView, shownRoot, collapsedFolders)];
        const index = state.openPath === undefined ? -1 : paths.indexOf(state.openPath);
        const next = paths[Math.min(Math.max(index + step, 0), paths.length - 1)];
        if (next !== undefined) {
            setState(current => ({ ...selectFile(current, next), activePaneIndex: 2 }));
        }
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (isSearchKey(event) && state.activePaneIndex === 0) {
            //
            // Ctrl+F in the commit list puts the keys in its search box.
            //
            event.preventDefault();
            event.stopPropagation();
            explorerRef.current?.querySelector<HTMLInputElement>('input[aria-label="Search commits"]')?.focus();
            return;
        }
        if (isSearchKey(event) && state.activePaneIndex === 1 && openCommit && openCommit.files.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            fileSearch.open();
            return;
        }
        if (isFindKey(event) && (openFile || openFolder !== undefined)) {
            //
            // Ctrl+F starts find mode in the diff the keys are on: the current file of a
            // directory's stacked diffs, or the open file's diff.
            //
            const card = openFolder !== undefined ? stackCardRefs.current.get(stackStop?.path ?? openFolderFiles[0]?.path ?? "") : fileCardRef.current;
            if (card) {
                event.preventDefault();
                event.stopPropagation();
                setState(current => ({ ...current, activePaneIndex: 2 }));
                card.openFind();
            }
            return;
        }
        if (state.activePaneIndex === 2 && openFolder !== undefined && !event.altKey && !event.metaKey && !event.shiftKey && !isOwnKeyTarget(event.target, event.key)) {
            //
            // In a directory's stacked diffs, Up and Down step through every file's hunks and runs
            // of unchanged lines, Ctrl with Up or Down jumps from file to file, and Space opens or
            // folds the run the keys are on.
            //
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                event.stopPropagation();
                setStackStop(current => stackStopAfterMove(directoryStops, current, event.key === "ArrowUp" ? -1 : 1, event.ctrlKey));
                return;
            }
            if (event.key === " " && !event.ctrlKey && stackStop?.stop?.kind === "gap") {
                event.preventDefault();
                event.stopPropagation();
                stackCardRefs.current.get(stackStop.path)?.toggleGap(stackStop.stop.gap);
                return;
            }
        }
        if (state.activePaneIndex === 1 && event.key === "ArrowRight" && openFolder !== undefined && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            setStackStop(stackStopAfterMove(directoryStops, undefined, 1, false));
        }
        if (state.activePaneIndex === 2 && event.key.toUpperCase() === FOLD_DIFF_KEY && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            //
            // Folds away or shows the diff the keys are on: the current file of a directory's
            // stacked diffs, or the open file's diff.
            //
            event.preventDefault();
            event.stopPropagation();
            if (openFolder !== undefined) {
                if (stackStop) {
                    stackCardRefs.current.get(stackStop.path)?.toggleOpen();
                }
            }
            else {
                fileCardRef.current?.toggleOpen();
            }
            return;
        }
        if ((event.key === "m" || event.key === "M") && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            event.preventDefault();
            event.stopPropagation();
            toggleMaximise(state.activePaneIndex);
            return;
        }
        if (event.key.toUpperCase() === COLLAPSE_KEY && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            event.preventDefault();
            event.stopPropagation();
            toggleCollapse(state.activePaneIndex);
            return;
        }
        if (state.activePaneIndex === 2 && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key) && fileCardRef.current?.handleOptionKey(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (event.key === " " && state.activePaneIndex === 2 && currentStop?.kind === "gap" && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            event.preventDefault();
            event.stopPropagation();
            fileCardRef.current?.toggleGap(currentStop.gap);
            return;
        }
        if (state.activePaneIndex === 1 && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            const directory = state.selectedPath?.startsWith(FOLDER_PREFIX) ? state.selectedPath.slice(FOLDER_PREFIX.length) : undefined;
            const directoryAction = fileView === "tree" ? directoryKeyAction(event) : undefined;
            if (directoryAction) {
                event.preventDefault();
                event.stopPropagation();
                if (directoryAction === "up") {
                    drillOut();
                }
                else if (directory !== undefined && directoryAction === "focus") {
                    drillInto(directory);
                }
                else if (directory !== undefined && directoryAction === "toggle") {
                    toggleCollapsedFolder(directory);
                }
                return;
            }
            if (event.key === "Enter" && state.selectedPath?.startsWith(FOLDER_PREFIX)) {
                event.preventDefault();
                event.stopPropagation();
                drillInto(state.selectedPath.slice(FOLDER_PREFIX.length));
                return;
            }
            if (event.key === "Escape" && shownRoot !== "") {
                event.preventDefault();
                event.stopPropagation();
                drillOut();
                return;
            }
        }
        if (!explorerKeys.includes(event.key) || event.ctrlKey || event.altKey || event.metaKey || isOwnKeyTarget(event.target, event.key)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (state.activePaneIndex === 2 && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            const step = event.key === "ArrowUp" ? -1 : 1;
            if (event.shiftKey) {
                moveFile(step);
            }
            else {
                moveHunk(step);
            }
            return;
        }
        setState(current =>
            stateAfterKey(current, event.key, {
                commitHashes: commits.map(commit => commit.hash),
                filePaths: current.openHash !== undefined ? [COMMIT_SUMMARY_PATH, ...rowPathsInViewOrder(searchedFiles(commitByHash(history, current.openHash).files), fileView, shownRoot, FOLDER_PREFIX, collapsedFolders)] : [],
            }),
        );
    }

    return (
        <div
            ref={explorerRef}
            role="application"
            aria-label="Commit explorer"
            tabIndex={0}
            onKeyDownCapture={onKeyDown}
            className="relative flex flex-col focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--color-focus)]"
            style={{
                height: "560px",
                background: "var(--color-bg)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                outline: "none",
            }}
        >
            <div
                className="flex flex-none flex-wrap items-center"
                style={{
                    gap: "var(--space-2) var(--space-3)",
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-panel)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <span style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-lg)", lineHeight: "var(--leading-tight)" }}>Commits</span>
                <span className="flex min-w-0 flex-1 items-center truncate" style={{ gap: "var(--space-1)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    <FontAwesomeIcon icon={faCodeBranch} style={{ fontSize: "var(--icon-sm)" }} />
                    <span className="truncate" style={{ fontFamily: "var(--font-mono)" }}>
                        {history.name} · {history.branch}
                    </span>
                </span>
            </div>

            <div
                ref={columnsRef}
                className="flex min-h-0 flex-1 items-stretch overflow-x-auto"
                style={{ paddingTop: "var(--space-3)" }}
                //
                // A press anywhere in a pane makes it the active pane, found by the pane's label.
                //
                onPointerDown={event => {
                    const pane = (event.target as Element).closest(PANE_LABELS.map(label => `section[aria-label="${label}"]`).join(", "))?.getAttribute("aria-label");
                    const index = pane ? Math.min(PANE_LABELS.indexOf(pane), 2) : -1;
                    if (index >= 0) {
                        setState(current => (current.activePaneIndex === index ? current : { ...current, activePaneIndex: index }));
                    }
                }}
            >
                {shows(0) ? (
                    <CommitPane
                        isMaximised={maximisedPane === 0}
                        onToggleMaximise={() => toggleMaximise(0)}
                        isCollapsed={collapsed.has(0)}
                        onToggleCollapse={() => toggleCollapse(0)}
                        commits={history.commits}
                        laneCount={history.laneCount}
                        width={commitPaneWidth}
                        matchingHashes={isSearching ? matchingHashes : undefined}
                        search={search}
                        matchCount={commits.length}
                        totalCount={history.commits.length}
                        onSearch={text => {
                            setSearch(text);
                            //
                            // The selection moves to the first match when the selected commit no
                            // longer matches, so Up and Down start from a match.
                            //
                            const matches = matchingCommits(history.commits, text);
                            if (matches.length > 0 && !matches.some(commit => commit.hash === state.selectedHash)) {
                                setState(current => ({ ...current, selectedHash: matches[0].hash }));
                            }
                        }}
                        selectedHash={state.selectedHash}
                        openHash={state.openHash}
                        isActive={state.activePaneIndex === 0}
                        onSelectCommit={hash => setState(selectCommit(hash))}
                    />
                ) : undefined}
                {maximisedPane === undefined && !collapsed.has(0) ? (
                    <ResizeHandle label="commit list" getWidth={() => paneWidth("Commits")} min={320} max={1000} onReset={() => setCommitPaneWidth(undefined)} onWidth={setCommitPaneWidth} />
                ) : maximisedPane === undefined ? (
                    <span aria-hidden="true" className="flex-none" style={{ width: "var(--space-2)" }} />
                ) : undefined}
                {openCommit && shows(1) ? (
                    <CommitDetailsPane
                        isMaximised={maximisedPane === 1}
                        onToggleMaximise={() => toggleMaximise(1)}
                        isCollapsed={collapsed.has(1)}
                        onToggleCollapse={() => toggleCollapse(1)}
                        key={openCommit.hash}
                        commit={openCommit}
                        selectedPath={state.selectedPath}
                        openPath={state.openPath}
                        isActive={state.activePaneIndex === 1}
                        width={detailsPaneWidth}
                        fileView={fileView}
                        onChangeFileView={setFileView}
                        treeRoot={shownRoot}
                        onDrillIn={drillInto}
                        onDrillOut={drillOut}
                        collapsedFolders={collapsedFolders}
                        onToggleFolder={path => toggleCollapsedFolder(path)}
                        fileSearch={fileSearch}
                        onSelectFile={path => setState(current => selectFile(current, path))}
                        onClose={() => setState(closeCommitDetailsPane)}
                    />
                ) : undefined}
                {openCommit && maximisedPane === undefined && !collapsed.has(1) ? (
                    <ResizeHandle label="commit details" getWidth={() => paneWidth("Commit details")} min={280} max={800} onReset={() => setDetailsPaneWidth(DETAILS_PANE_WIDTH)} onWidth={setDetailsPaneWidth} />
                ) : openCommit && maximisedPane === undefined ? (
                    <span aria-hidden="true" className="flex-none" style={{ width: "var(--space-2)" }} />
                ) : undefined}
                {openFile && shows(2) ? (
                    <FilePane
                        key={openFile.path}
                        isMaximised={maximisedPane === 2}
                        onToggleMaximise={() => toggleMaximise(2)}
                        isCollapsed={collapsed.has(2)}
                        onToggleCollapse={() => toggleCollapse(2)}
                        file={openFile}
                        isActive={state.activePaneIndex === 2}
                        currentHunk={currentHunk}
                        currentGap={currentGap}
                        cardRef={fileCardRef}
                        onSelectHunk={hunk => {
                            setCurrentStop({ kind: "hunk", hunk });
                            setState(current => ({ ...current, activePaneIndex: 2 }));
                        }}
                        onSelectGap={gap => {
                            setCurrentStop({ kind: "gap", gap });
                            setState(current => ({ ...current, activePaneIndex: 2 }));
                        }}
                        onClose={() => setState(closeFilePane)}
                    />
                ) : undefined}
                {openCommit && openFolder !== undefined && shows(2) ? (
                    <DirectoryPane
                        key={openFolder}
                        path={openFolder}
                        files={openFolderFiles}
                        currentStop={stackStop}
                        cardRef={path => handle => {
                            stackCardRefs.current.set(path, handle);
                        }}
                        onSelectStop={stop => {
                            setStackStop(stop);
                            setState(current => ({ ...current, activePaneIndex: 2 }));
                        }}
                        isActive={state.activePaneIndex === 2}
                        isMaximised={maximisedPane === 2}
                        onToggleMaximise={() => toggleMaximise(2)}
                        isCollapsed={collapsed.has(2)}
                        onToggleCollapse={() => toggleCollapse(2)}
                        onClose={() => setState(closeFilePane)}
                    />
                ) : undefined}
                {openCommit && isCommitOpen && shows(2) ? (
                    <CommitInfoPane
                        commit={openCommit}
                        isActive={state.activePaneIndex === 2}
                        isMaximised={maximisedPane === 2}
                        onToggleMaximise={() => toggleMaximise(2)}
                        isCollapsed={collapsed.has(2)}
                        onToggleCollapse={() => toggleCollapse(2)}
                        onClose={() => setState(closeFilePane)}
                    />
                ) : undefined}
            </div>

        </div>
    );
}
