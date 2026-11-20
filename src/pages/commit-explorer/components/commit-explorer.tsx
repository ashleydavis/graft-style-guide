//
// The commit explorer: Graft's window onto a repository's history. The commit pane lists the
// commits; opening one adds the commit details pane to its right, and opening a changed file adds
// the file pane, as in the column view of a file browser.
//

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { type DiffStop, type IStackStop } from "../../diff/stops";
import { exampleOldFile } from "../../diff/example-old-file";
import { FOLD_DIFF_KEY, isFindKey, type IFileDiffCardHandle } from "../../diff/components/file-diff-card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { commitByHash, commitFiles, graftHistory, type CommitDiffKind, type IChangedFile, type ICommit, type IHistory } from "../data";
import { closeCommitDetailsPane, closeFilePane, COMMIT_SUMMARY_PATH, explorerKeys, DIRECTORY_PREFIX, initialExplorerState, selectCommit, selectFile, stateAfterKey, type IExplorerState } from "../explorer-state";
import { filePathsInViewOrder, isUnder, parentDirectory, rowPathsInViewOrder, treeRows, type FileListView } from "../file-views";
import { collapsedAfterAllKey } from "../../../components/tree-rows";
import { scrollLastChildIntoView, scrollPaneIntoView, scrollSelectionIntoView } from "../scroll";
import { parseHunks } from "../../diff/model";
import { CommitDetailsPane, CommitInfoPane } from "./commit-details-pane";
import { CommitPane, refBadge } from "./commit-pane";
import { useExplorerSearch } from "./explorer-search";
import { DirectoryPane, FilePane } from "./file-pane";
import { directoryKeyAction } from "../../../components/tree-guides";
import { isSearchKey, matchesSearch } from "../../../components/search-box";
import { ResizeHandle } from "./resize-handle";
import { COLLAPSE_KEY } from "../../../components/collapse";
import { withViewTransition } from "../../../lib/view-transition";
import { createTheme, ThemeProvider, type Theme } from "@mui/material/styles";

//
// The width the commit details pane starts at, and goes back to when its resize handle is
// double-clicked, in pixels: room for a file's path beside its status and line counts. The commit
// pane sizes itself until its handle is dragged, and goes back to sizing itself on a double-click.
//
const DETAILS_PANE_WIDTH = 450;

//
// How many commits make up a page of the history. The example histories are read a page at a time,
// as Graft reads a real history, so a long example history shows the commit list reading more as
// it scrolls.
//
const COMMIT_PAGE_SIZE = 10;

//
// How long reading a page of the example history takes, in milliseconds, long enough to see the
// "Reading more commits" line at the end of the list.
//
const PAGE_READ_DELAY_MS = 400;

//
// How many commits from the end of the list the selection may come before the next page is read,
// so moving down with the keys never waits at the end.
//
const READ_AHEAD_COMMITS = 5;

//
// The pixels Up and Down scroll a diff by while a diff pane has the keys: about three lines.
//
const SCROLL_STEP_PIXELS = 60;

//
// Returns true when `key` pressed with the focus on `target` belongs to the target itself: every
// key in a text box, and Enter or Space on a link or a real button, such as a pane's close button,
// which they press, and every key in an open menu, dialog or list box, which move through their
// own items. The arrow keys and Escape on a button still move through the
// explorer, so the keys keep working after a click on a button.
//
function isOwnKeyTarget(target: EventTarget, key: string): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (target.closest('input, textarea, select, [role="separator"], [role="menu"], [role="dialog"], [role="listbox"]') !== null) {
        return true;
    }
    return (key === "Enter" || key === " ") && target.closest("a, button") !== null;
}

//
// Returns the theme around the explorer with every tooltip placed to the right of what it is for,
// so in the explorer's columns a tooltip opens beside its row rather than over the row below. A
// tooltip with no room on the right flips to the left, as MUI's tooltips do. The outer theme's
// other tooltip defaults, such as the panel's light or dark class, stay.
//
export function rightTooltipTheme(outer: Theme): Theme {
    return createTheme(outer, {
        components: {
            MuiTooltip: {
                defaultProps: {
                    ...outer.components?.MuiTooltip?.defaultProps,
                    placement: "right",
                },
            },
        },
    });
}

//
// The panes' labels in order, so a pane's position, as the explorer's state counts them, comes
// from its label.
//
const PANE_LABELS = ["Commits", "Commit details", "File diff", "Full commit details", "Directory diffs"];

//
// Returns the commits that match `search`, ignoring case: those whose title, description, author,
// hash or refs contain it. An empty search matches every commit.
//
export function matchingCommits(commits: ICommit[], search: string): ICommit[] {
    const needle = search.trim().toLowerCase();
    if (needle === "") {
        return commits;
    }
    return commits.filter(commit => [commit.title, commit.description, commit.authorName, commit.hash, ...commit.refs.map(gitRef => refBadge(gitRef).name)].some(text => text.toLowerCase().includes(needle)));
}

//
// Renders the explorer in a window frame: a title bar with the repository and branch, the panes,
// with a search box at the top of the commit list that the search button or Ctrl+F shows. Each
// button's tooltip names its key. While a search Enter applied is on, every commit keeps its place
// and its lanes, the commits that do not match fade, and Up and Down move through the matches only.
// The explorer answers its keys while the focus is anywhere inside it outside the search box; click
// a commit or move to the explorer with Tab to use them. In the file pane, Up and Down move from
// change to change in the diff, marking the current one, and Shift with Up or Down opens the
// previous or next file of the commit. It shows `history`, the small example history by default,
// and starts as `initialState` sets it, which by default selects the newest commit and opens
// nothing. When a pane opens, the panes scroll sideways to bring it into view.
//
export function CommitExplorer({ history = graftHistory, initialState }: { history?: IHistory; initialState?: IExplorerState }): ReactNode {
    const [state, setState] = useState<IExplorerState>(initialState ?? { ...initialExplorerState, selectedHash: history.commits[0].hash });
    //
    // The commit search and the file search. Closing either gives the keys back to the explorer.
    //
    const commitSearch = useExplorerSearch(() => explorerRef.current?.focus());
    const [diffKind, setDiffKind] = useState<CommitDiffKind>("commit");
    const [readCount, setReadCount] = useState(COMMIT_PAGE_SIZE);
    const [isReading, setIsReading] = useState(false);
    const readTimer = useRef<number | undefined>(undefined);
    const [fileView, setFileView] = useState<FileListView>("tree");
    const [treeRoot, setTreeRoot] = useState("");
    const [collapsedDirectories, setCollapsedDirectories] = useState<ReadonlySet<string>>(new Set());
    const fileSearch = useExplorerSearch(() => explorerRef.current?.focus());

    //
    // Returns the files of a commit the file list's search keeps.
    //
    function searchedFiles<File extends { path: string }>(files: File[]): File[] {
        return files.filter(file => matchesSearch(file.path, fileSearch.query));
    }

    //
    // Collapses the directory `path` in the commit's file list, hiding the rows inside it, or
    // expands it again.
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
    const shownRoot = fileView === "tree" ? treeRoot : "";

    //
    // Returns the path of every directory in the tree from its focused directory down, collapsed
    // or not, for expand all, collapse all and the A key.
    //
    function treeDirectories(): string[] {
        if (!openCommit) {
            return [];
        }
        return treeRows(searchedFiles(openFiles), shownRoot).flatMap(row => (row.kind === "directory" ? [row.path] : []));
    }

    //
    // Shows only the open commit's files inside the directory `path`. The pane to the right stays
    // open. The keyboard focus moves to the explorer, as the directory's row no longer shows.
    //
    function drillInto(path: string): void {
        explorerRef.current?.focus();
        setTreeRoot(path);
        setState(current => ({ ...current, activePaneIndex: 1, selectedPath: undefined }));
    }

    //
    // Focuses the tree on the directory above the one it is focused on, leaving the selection as
    // it is. The keyboard focus moves to the explorer, as the row or button that held it may no
    // longer show.
    //
    function drillOut(): void {
        if (treeRoot === "") {
            return;
        }
        explorerRef.current?.focus();
        setTreeRoot(parentDirectory(treeRoot));
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
    //
    // The commits read so far, a page at a time, and while a search is applied only those the
    // search matches.
    //
    const readCommits = history.commits.slice(0, readCount);
    const hasMore = readCount < history.commits.length;
    const commits = matchingCommits(readCommits, commitSearch.query);
    const isSearching = commitSearch.query.trim() !== "";

    //
    // Reads the next page of the example history after a short wait, as Graft waits on Git. A page
    // already being read is left to finish.
    //
    function readNextPage(): void {
        if (!hasMore || isReading) {
            return;
        }
        setIsReading(true);
        readTimer.current = window.setTimeout(() => {
            setReadCount(count => count + COMMIT_PAGE_SIZE);
            setIsReading(false);
        }, PAGE_READ_DELAY_MS);
    }

    useEffect(() => {
        return () => window.clearTimeout(readTimer.current);
    }, []);

    //
    // Reads the next page when the keys bring the selection near the end of the commits read.
    //
    const selectedIndex = state.selectedHash === undefined ? -1 : readCommits.findIndex(commit => commit.hash === state.selectedHash);
    useEffect(() => {
        if (selectedIndex >= 0 && selectedIndex >= readCommits.length - READ_AHEAD_COMMITS) {
            readNextPage();
        }
    }, [selectedIndex, readCommits.length]);

    //
    // The selection moves to the first match when a search is applied and the selected commit does
    // not match, so Up and Down start from a match.
    //
    useEffect(() => {
        const matches = matchingCommits(history.commits.slice(0, readCount), commitSearch.query);
        if (matches.length > 0) {
            setState(current => (matches.some(commit => commit.hash === current.selectedHash) ? current : { ...current, selectedHash: matches[0].hash }));
        }
    }, [commitSearch.query, history, readCount]);
    const columnsRef = useRef<HTMLDivElement>(null);

    //
    // True from a press on a pane less than half in view until its click, which the press spends
    // on scrolling the pane into view.
    //
    const isRevealPress = useRef(false);
    const explorerRef = useRef<HTMLDivElement>(null);
    const openCommit = state.openHash !== undefined ? commitByHash(history, state.openHash) : undefined;
    const isCommitOpen = state.openPath === COMMIT_SUMMARY_PATH;
    const isDirectoryOpen = state.openPath?.startsWith(DIRECTORY_PREFIX) === true;
    //
    // The open commit's files, compared with its parent or with the files on disk as the commit
    // options pick.
    //
    const openFiles: IChangedFile[] = openCommit ? commitFiles(history, openCommit.hash, diffKind) : [];
    const openFile = state.openPath !== undefined && !isCommitOpen && !isDirectoryOpen ? openFiles.find(file => file.path === state.openPath) : undefined;
    const [currentStop, setCurrentStop] = useState<DiffStop | undefined>(undefined);
    const currentHunk = currentStop?.kind === "hunk" ? currentStop.hunk : undefined;
    const currentGap = currentStop?.kind === "gap" ? currentStop.gap : undefined;
    const fileCardRef = useRef<IFileDiffCardHandle>(null);
    const openDirectory = openCommit && isDirectoryOpen ? (state.openPath as string).slice(DIRECTORY_PREFIX.length) : undefined;
    const openDirectoryFiles =
        openCommit && openDirectory !== undefined
            ? filePathsInViewOrder(openFiles.filter(file => isUnder(file.path, openDirectory)), fileView, openDirectory).flatMap(path => openFiles.filter(file => file.path === path))
            : [];

    //
    // The hunk or run of unchanged lines last clicked in the open directory's stacked diffs. A
    // different directory starts with none.
    //
    const [stackStop, setStackStop] = useState<IStackStop | undefined>(undefined);
    const stackCardRefs = useRef(new Map<string, IFileDiffCardHandle | null>());
    useEffect(() => {
        setStackStop(undefined);
    }, [openDirectory]);
    const openPaneCount = openFile || (openCommit && (isCommitOpen || openDirectory !== undefined)) ? 3 : openCommit ? 2 : 1;
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

    //
    // A newly opened commit starts with its tree at the top of the repository, every directory
    // open and no file search.
    //
    useEffect(() => {
        setTreeRoot("");
        setCollapsedDirectories(new Set());
        if (fileSearch.isOpen) {
            fileSearch.close();
        }
    }, [state.openHash]);

    useEffect(() => {
        setCurrentStop(undefined);
    }, [state.openHash, state.openPath]);

    useEffect(() => {
        if (columnsRef.current) {
            scrollLastChildIntoView(columnsRef.current);
        }
    }, [state.openHash, state.openPath]);

    //
    // Keeps the active pane in view in a row of panes too wide for the screen, as on a phone, so
    // moving to a pane on the left, by Left, Escape or a click, scrolls it back into view.
    //
    useEffect(() => {
        const row = columnsRef.current;
        const labels = state.activePaneIndex === 2 ? PANE_LABELS.slice(2) : [PANE_LABELS[state.activePaneIndex]];
        const pane = row ? labels.map(label => row.querySelector<HTMLElement>(`section[aria-label="${label}"]`)).find(element => element) : undefined;
        if (row && pane) {
            scrollPaneIntoView(row, pane);
        }
    }, [state.activePaneIndex]);

    useEffect(() => {
        const selector = currentStop?.kind === "gap" ? `[data-gap-index="${currentStop.gap}"]` : `[data-hunk-index="${currentHunk}"]`;
        const element = columnsRef.current?.querySelector(`[aria-label="File diff"] ${selector}`);
        if (element instanceof HTMLElement) {
            scrollSelectionIntoView(element);
        }
    }, [currentStop, currentHunk]);

    //
    // Scrolls the open diff pane, a file's diff or a directory's stacked diffs, by `pixels`.
    //
    function scrollDiff(pixels: number): void {
        const pane = PANE_LABELS.slice(2)
            .map(label => columnsRef.current?.querySelector<HTMLElement>(`section[aria-label="${label}"] [data-pane-scroll]`))
            .find(element => element);
        pane?.scrollBy({ top: pixels });
    }

    //
    // Opens the row `step` rows from the open one in the commit's file list, in the order the list
    // shows them, a directory's row opening its stacked diffs, and keeps the keys in the pane to
    // the right.
    //
    function moveFile(step: number): void {
        if (!openCommit) {
            return;
        }
        const paths = [COMMIT_SUMMARY_PATH, ...rowPathsInViewOrder(searchedFiles(openFiles), fileView, shownRoot, DIRECTORY_PREFIX, collapsedDirectories)];
        const index = state.openPath === undefined ? -1 : paths.indexOf(state.openPath);
        const next = paths[Math.min(Math.max(index + step, 0), paths.length - 1)];
        if (next !== undefined) {
            setState(current => ({ ...selectFile(current, next), activePaneIndex: 2 }));
        }
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (isSearchKey(event) && state.activePaneIndex === 0) {
            //
            // Ctrl+F in the commit list shows its search box and puts the keys in it.
            //
            event.preventDefault();
            event.stopPropagation();
            commitSearch.open();
            return;
        }
        if (isSearchKey(event) && state.activePaneIndex === 1 && openCommit) {
            event.preventDefault();
            event.stopPropagation();
            fileSearch.open();
            return;
        }
        if (isFindKey(event) && (openFile || openDirectory !== undefined)) {
            //
            // Ctrl+F starts find mode in the diff the keys are on: the current file of a
            // directory's stacked diffs, or the open file's diff.
            //
            const card = openDirectory !== undefined ? stackCardRefs.current.get(stackStop?.path ?? openDirectoryFiles[0]?.path ?? "") : fileCardRef.current;
            if (card) {
                event.preventDefault();
                event.stopPropagation();
                setState(current => ({ ...current, activePaneIndex: 2 }));
                card.openFind();
            }
            return;
        }
        if (state.activePaneIndex === 2 && openDirectory !== undefined && event.key === " " && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && !isOwnKeyTarget(event.target, event.key) && stackStop?.stop?.kind === "gap") {
            //
            // In a directory's stacked diffs, Space opens or folds the run of unchanged lines last
            // clicked.
            //
            event.preventDefault();
            event.stopPropagation();
            stackCardRefs.current.get(stackStop.path)?.toggleGap(stackStop.stop.gap);
            return;
        }
        if (state.activePaneIndex === 2 && event.key.toUpperCase() === FOLD_DIFF_KEY && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            //
            // Folds away or shows the diff the keys are on: the current file of a directory's
            // stacked diffs, or the open file's diff.
            //
            event.preventDefault();
            event.stopPropagation();
            if (openDirectory !== undefined) {
                //
                // E folds the file last clicked in a directory's stacked diffs, or the first file.
                //
                stackCardRefs.current.get(stackStop?.path ?? openDirectoryFiles[0]?.path ?? "")?.toggleOpen();
            }
            else {
                fileCardRef.current?.toggleOpen();
            }
            return;
        }
        if ((event.key === "m" || event.key === "M") && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            event.preventDefault();
            event.stopPropagation();
            toggleMaximise(state.activePaneIndex);
            return;
        }
        if (event.key.toUpperCase() === COLLAPSE_KEY && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
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
            const directory = state.selectedPath?.startsWith(DIRECTORY_PREFIX) ? state.selectedPath.slice(DIRECTORY_PREFIX.length) : undefined;
            const directoryAction = fileView === "tree" ? directoryKeyAction(event) : undefined;
            //
            // A directory key acts only when there is something for it to act on: a selected
            // directory to focus on or toggle, or a focused directory to go up from. Otherwise the
            // key goes on, as Space on a file row goes on to the browser.
            //
            if (directory !== undefined && directoryAction === "focus") {
                event.preventDefault();
                event.stopPropagation();
                drillInto(directory);
                return;
            }
            if (directoryAction === "up" && treeRoot !== "") {
                event.preventDefault();
                event.stopPropagation();
                drillOut();
                return;
            }
            if (directory !== undefined && directoryAction === "toggle") {
                event.preventDefault();
                event.stopPropagation();
                toggleCollapsedDirectory(directory);
                return;
            }
            if (directoryAction === "all") {
                event.preventDefault();
                event.stopPropagation();
                setCollapsedDirectories(collapsedAfterAllKey(treeDirectories(), collapsedDirectories));
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
                scrollDiff(step * SCROLL_STEP_PIXELS);
            }
            return;
        }
        setState(current =>
            stateAfterKey(current, event.key, {
                commitHashes: commits.map(commit => commit.hash),
                filePaths: current.openHash !== undefined ? [COMMIT_SUMMARY_PATH, ...rowPathsInViewOrder(searchedFiles(openFiles), fileView, shownRoot, DIRECTORY_PREFIX, collapsedDirectories)] : [],
            }),
        );
    }

    return (
        <ThemeProvider theme={rightTooltipTheme}>
            <div
                ref={explorerRef}
                role="application"
                aria-label="Commit explorer"
                tabIndex={0}
                onKeyDownCapture={onKeyDown}
                className="relative flex flex-col focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--color-focus)]"
                style={{
                    //
                    // The explorer fills the window's height less room for the section heading
                    // above it, and keeps 480 pixels on a short screen.
                    //
                    height: "max(480px, calc(100dvh - var(--space-8) * 4))",
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
                    <span className="flex min-w-0 flex-1 items-center truncate" style={{ gap: "var(--space-1)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                        <FontAwesomeIcon icon={faCodeBranch} style={{ fontSize: "var(--icon-sm)" }} />
                        <span className="truncate" style={{ fontFamily: "var(--font-mono)" }}>
                            {history.name} · {history.branch}
                        </span>
                    </span>
                </div>

                <div
                    ref={columnsRef}
                    //
                    // No pane is wider than the row less a strip, so on a narrow screen the pane
                    // beside the one in view always shows a strip to tap.
                    //
                    className="flex min-h-0 flex-1 items-stretch overflow-x-auto [&>*]:max-w-[calc(100%-var(--space-8)*1.5)]"
                    style={{ padding: "var(--space-3) var(--space-3) var(--space-3) 0" }}
                    //
                    // A press anywhere in a pane makes it the active pane, found by the pane's
                    // label, and scrolls the whole pane into view. A press on a pane less than half
                    // in view, such as the strip of the pane beside the one on a phone's screen,
                    // does nothing else, so the row or button under the press waits for a press
                    // once the pane can be seen.
                    //
                    onPointerDown={event => {
                        const section = (event.target as Element).closest<HTMLElement>(PANE_LABELS.map(label => `section[aria-label="${label}"]`).join(", "));
                        const pane = section?.getAttribute("aria-label");
                        const index = pane ? Math.min(PANE_LABELS.indexOf(pane), 2) : -1;
                        if (index >= 0) {
                            setState(current => (current.activePaneIndex === index ? current : { ...current, activePaneIndex: index }));
                        }
                        const row = columnsRef.current;
                        isRevealPress.current = false;
                        if (row && section) {
                            const rowBox = row.getBoundingClientRect();
                            const paneBox = section.getBoundingClientRect();
                            if (paneBox.left < rowBox.left - 1 || paneBox.right > rowBox.right + 1) {
                                const visibleWidth = Math.min(paneBox.right, rowBox.right) - Math.max(paneBox.left, rowBox.left);
                                isRevealPress.current = visibleWidth < paneBox.width / 2;
                                scrollPaneIntoView(row, section);
                            }
                        }
                    }}
                    onClickCapture={event => {
                        if (isRevealPress.current) {
                            isRevealPress.current = false;
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }}
                >
                    {shows(0) ? (
                        <CommitPane
                            isMaximised={maximisedPane === 0}
                            onToggleMaximise={() => toggleMaximise(0)}
                            isCollapsed={collapsed.has(0)}
                            onToggleCollapse={() => toggleCollapse(0)}
                            commits={commits}
                            laneCount={history.laneCount}
                            width={commitPaneWidth}
                            isSearching={isSearching}
                            search={commitSearch}
                            matchCount={commits.length}
                            totalCount={readCommits.length}
                            hasMore={hasMore}
                            isReading={isReading}
                            onReachEnd={readNextPage}
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
                            files={openFiles}
                            diffKind={diffKind}
                            onChangeDiffKind={setDiffKind}
                            selectedPath={state.selectedPath}
                            openPath={state.openPath}
                            isActive={state.activePaneIndex === 1}
                            width={detailsPaneWidth}
                            fileView={fileView}
                            onChangeFileView={setFileView}
                            treeRoot={shownRoot}
                            onDrillIn={drillInto}
                            onDrillOut={drillOut}
                            collapsedDirectories={collapsedDirectories}
                            onToggleDirectory={path => toggleCollapsedDirectory(path)}
                            onExpandAll={() => setCollapsedDirectories(new Set())}
                            onCollapseAll={() => setCollapsedDirectories(new Set(treeDirectories()))}
                            fileSearch={fileSearch}
                            onSelectFile={path =>
                                setState(current => {
                                    //
                                    // A click on a directory only selects it. Enter opens the diffs
                                    // of every file inside it.
                                    //
                                    if (path.startsWith(DIRECTORY_PREFIX)) {
                                        return { ...current, activePaneIndex: 1, selectedPath: path };
                                    }
                                    //
                                    // A click on a file or the commit's own row opens it to the
                                    // right and gives that pane the keys.
                                    //
                                    return { ...selectFile(current, path), activePaneIndex: 2 };
                                })
                            }
                            onClose={() => setState(closeCommitDetailsPane)}
                        />
                    ) : undefined}
                    {openCommit && maximisedPane === undefined && !collapsed.has(1) ? (
                        <ResizeHandle label="commit details" getWidth={() => paneWidth("Commit details")} min={300} max={800} onReset={() => setDetailsPaneWidth(DETAILS_PANE_WIDTH)} onWidth={setDetailsPaneWidth} />
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
                    {openCommit && openDirectory !== undefined && shows(2) ? (
                        <DirectoryPane
                            key={openDirectory}
                            path={openDirectory}
                            files={openDirectoryFiles}
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
        </ThemeProvider>
    );
}
