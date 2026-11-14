//
// The commit explorer: Graft's window onto a repository's history. The commit pane lists the
// commits; opening one adds the commit details pane to its right, and opening a changed file adds
// the file pane, as in the column view of a file browser.
//

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { KeyCaps } from "../../../components/shortcut";
import { changedFile, commitByHash, graftHistory, type ICommit, type IHistory } from "../data";
import { closeCommitDetailsPane, closeFilePane, explorerKeys, initialExplorerState, selectCommit, selectFile, stateAfterKey, type IExplorerState } from "../explorer-state";
import { filePathsInViewOrder, type FileListView } from "../file-views";
import { scrollLastChildIntoView, scrollSelectionIntoView } from "../scroll";
import { parseHunks } from "../../diff/model";
import { CommitDetailsPane } from "./commit-details-pane";
import { CommitPane } from "./commit-pane";
import { FilePane } from "./file-pane";
import { ResizeHandle } from "./resize-handle";
import { withViewTransition } from "../../../lib/view-transition";

//
// The width the commit details pane starts at, and goes back to when its resize handle is
// double-clicked, in pixels. The commit pane sizes itself until its handle is dragged, and goes
// back to sizing itself on a double-click.
//
const DETAILS_PANE_WIDTH = 380;

//
// The keys the explorer answers to, with what each does, for the hints along its foot.
//
const keyHints = [
    { keys: ["↑", "↓"], action: "Move, or change to change in a diff" },
    { keys: ["Shift", "↑", "↓"], action: "File to file in a diff" },
    { keys: ["←", "→"], action: "Switch pane" },
    { keys: ["Enter"], action: "Open" },
    { keys: ["Esc"], action: "Close" },
    { keys: ["M"], action: "Maximise or restore the pane" },
];

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
const PANE_LABELS = ["Commits", "Commit details", "File diff"];

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
// with a search box at the top of the commit list, and the key hints. While a search is typed,
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
    const [fileView, setFileView] = useState<FileListView>("paths");
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
    const openCommit = state.openHash !== undefined ? commitByHash(history, state.openHash) : undefined;
    const openFile = state.openHash !== undefined && state.openPath !== undefined ? changedFile(history, state.openHash, state.openPath) : undefined;
    const [currentHunk, setCurrentHunk] = useState<number | undefined>(undefined);
    const openPaneCount = openFile ? 3 : openCommit ? 2 : 1;
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
    function shows(index: number): boolean {
        return maximisedPane === undefined || maximisedPane === index;
    }

    useEffect(() => {
        setCurrentHunk(undefined);
    }, [state.openHash, state.openPath]);

    useEffect(() => {
        if (columnsRef.current) {
            scrollLastChildIntoView(columnsRef.current);
        }
    }, [state.openHash, state.openPath]);

    useEffect(() => {
        const element = columnsRef.current?.querySelector(`[aria-label="File diff"] [data-hunk-index="${currentHunk}"]`);
        if (element instanceof HTMLElement) {
            scrollSelectionIntoView(element);
        }
    }, [currentHunk]);

    //
    // Moves the keys to the hunk `step` hunks from the current one in the open file, staying on
    // the first or last hunk at the ends. With no hunk current yet, Down goes to the first hunk
    // and Up to the last.
    //
    function moveHunk(step: number): void {
        const count = openFile ? parseHunks(openFile.diff).length : 0;
        if (count === 0) {
            return;
        }
        if (currentHunk === undefined) {
            setCurrentHunk(step > 0 ? 0 : count - 1);
            return;
        }
        setCurrentHunk(Math.min(Math.max(currentHunk + step, 0), count - 1));
    }

    //
    // Opens the file `step` files from the open one in the commit's file list, in the order the
    // list shows them, and keeps the keys in the file pane.
    //
    function moveFile(step: number): void {
        if (!openCommit) {
            return;
        }
        const paths = filePathsInViewOrder(openCommit.files, fileView);
        const index = state.openPath === undefined ? -1 : paths.indexOf(state.openPath);
        const next = paths[Math.min(Math.max(index + step, 0), paths.length - 1)];
        if (next !== undefined) {
            setState(current => ({ ...selectFile(current, next), activePaneIndex: 2 }));
        }
    }

    function onKeyDown(event: KeyboardEvent): void {
        if ((event.key === "m" || event.key === "M") && !event.ctrlKey && !event.altKey && !event.metaKey && !isOwnKeyTarget(event.target, event.key)) {
            event.preventDefault();
            event.stopPropagation();
            toggleMaximise(state.activePaneIndex);
            return;
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
                filePaths: current.openHash !== undefined ? filePathsInViewOrder(commitByHash(history, current.openHash).files, fileView) : [],
            }),
        );
    }

    return (
        <div
            role="application"
            aria-label="Commit explorer"
            tabIndex={0}
            onKeyDownCapture={onKeyDown}
            className="relative flex flex-col shadow-(--shadow-raised) focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--color-focus),var(--shadow-raised)]"
            style={{
                height: "560px",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
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
                style={{ padding: "var(--space-3)" }}
                //
                // A press anywhere in a pane makes it the active pane, found by the pane's label.
                //
                onPointerDown={event => {
                    const pane = (event.target as Element).closest(PANE_LABELS.map(label => `section[aria-label="${label}"]`).join(", "))?.getAttribute("aria-label");
                    const index = pane ? PANE_LABELS.indexOf(pane) : -1;
                    if (index >= 0) {
                        setState(current => (current.activePaneIndex === index ? current : { ...current, activePaneIndex: index }));
                    }
                }}
            >
                {shows(0) ? (
                    <CommitPane
                        isMaximised={maximisedPane === 0}
                        onToggleMaximise={() => toggleMaximise(0)}
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
                {maximisedPane === undefined ? (
                    <ResizeHandle label="commit list" getWidth={() => paneWidth("Commits")} min={320} max={1000} onReset={() => setCommitPaneWidth(undefined)} onWidth={setCommitPaneWidth} />
                ) : undefined}
                {openCommit && shows(1) ? (
                    <CommitDetailsPane
                        isMaximised={maximisedPane === 1}
                        onToggleMaximise={() => toggleMaximise(1)}
                        key={openCommit.hash}
                        commit={openCommit}
                        selectedPath={state.selectedPath}
                        openPath={state.openPath}
                        isActive={state.activePaneIndex === 1}
                        width={detailsPaneWidth}
                        fileView={fileView}
                        onChangeFileView={setFileView}
                        onSelectFile={path => setState(current => selectFile(current, path))}
                        onClose={() => setState(closeCommitDetailsPane)}
                    />
                ) : undefined}
                {openCommit && maximisedPane === undefined ? (
                    <ResizeHandle label="commit details" getWidth={() => paneWidth("Commit details")} min={280} max={800} onReset={() => setDetailsPaneWidth(DETAILS_PANE_WIDTH)} onWidth={setDetailsPaneWidth} />
                ) : undefined}
                {openFile && shows(2) ? (
                    <FilePane
                        key={openFile.path}
                        isMaximised={maximisedPane === 2}
                        onToggleMaximise={() => toggleMaximise(2)}
                        file={openFile}
                        isActive={state.activePaneIndex === 2}
                        currentHunk={currentHunk}
                        onSelectHunk={hunk => {
                            setCurrentHunk(hunk);
                            setState(current => ({ ...current, activePaneIndex: 2 }));
                        }}
                        onClose={() => setState(closeFilePane)}
                    />
                ) : undefined}
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
        </div>
    );
}
