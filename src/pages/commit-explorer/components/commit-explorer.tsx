//
// The commit explorer: Graft's window onto a repository's history. The commit pane lists the
// commits; opening one adds the commit details pane to its right, and opening a changed file adds
// the file pane, as in the column view of a file browser.
//

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { KeyCaps } from "../../../components/shortcut";
import { changedFile, commitByHash, graftHistory, type IHistory } from "../data";
import { closeCommitDetailsPane, closeFilePane, explorerKeys, initialExplorerState, selectCommit, selectFile, stateAfterKey, type IExplorerState } from "../explorer-state";
import { scrollLastChildIntoView } from "../scroll";
import { CommitDetailsPane } from "./commit-details-pane";
import { CommitPane } from "./commit-pane";
import { FilePane } from "./file-pane";

//
// The keys the explorer answers to, with what each does, for the hints along its foot.
//
const keyHints = [
    { keys: ["↑", "↓"], action: "Move" },
    { keys: ["←", "→"], action: "Switch pane" },
    { keys: ["Enter"], action: "Open" },
    { keys: ["Esc"], action: "Close" },
];

//
// Returns true when a key pressed with the focus on `target` belongs to the target itself: a text
// box, a link or a real button, such as a pane's close button, which answer Enter themselves.
//
function isOwnKeyTarget(target: EventTarget): boolean {
    return target instanceof HTMLElement && target.closest("input, textarea, select, a, button") !== null;
}

//
// Renders the explorer in a window frame: a title bar with the repository and branch, the panes
// and the key hints. The explorer
// answers its keys while the focus is anywhere inside it; click a commit or move to the explorer
// with Tab to use them. It shows `history`, the small example history by default, and starts as
// `initialState` sets it, which by default selects the newest commit and opens nothing. When a
// pane opens, the panes scroll sideways to bring it into view.
//
export function CommitExplorer({ history = graftHistory, initialState }: { history?: IHistory; initialState?: IExplorerState }): ReactNode {
    const [state, setState] = useState<IExplorerState>(initialState ?? { ...initialExplorerState, selectedHash: history.commits[0].hash });
    const commits = history.commits;
    const columnsRef = useRef<HTMLDivElement>(null);
    const openCommit = state.openHash !== undefined ? commitByHash(history, state.openHash) : undefined;
    const openFile = state.openHash !== undefined && state.openPath !== undefined ? changedFile(history, state.openHash, state.openPath) : undefined;

    useEffect(() => {
        if (columnsRef.current) {
            scrollLastChildIntoView(columnsRef.current);
        }
    }, [state.openHash, state.openPath]);

    function onKeyDown(event: KeyboardEvent): void {
        if (!explorerKeys.includes(event.key) || event.ctrlKey || event.altKey || event.metaKey || isOwnKeyTarget(event.target)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        setState(current =>
            stateAfterKey(current, event.key, {
                commitHashes: commits.map(commit => commit.hash),
                filePaths: current.openHash !== undefined ? commitByHash(history, current.openHash).files.map(file => file.path) : [],
            }),
        );
    }

    return (
        <div
            role="application"
            aria-label="Commit explorer"
            tabIndex={0}
            onKeyDownCapture={onKeyDown}
            className="relative flex flex-col"
            style={{
                height: "560px",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-raised)",
                overflow: "hidden",
                outlineOffset: "var(--focus-ring-offset)",
            }}
        >
            <div
                className="flex flex-none items-center"
                style={{
                    gap: "var(--space-2)",
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-panel)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <span style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-lg)", lineHeight: "var(--leading-tight)" }}>Commits</span>
                <span className="flex min-w-0 items-center truncate" style={{ gap: "var(--space-1)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    <FontAwesomeIcon icon={faCodeBranch} style={{ fontSize: "var(--icon-sm)" }} />
                    <span className="truncate" style={{ fontFamily: "var(--font-mono)" }}>
                        {history.name} · {history.branch}
                    </span>
                </span>
            </div>

            <div ref={columnsRef} className="flex min-h-0 flex-1 items-stretch overflow-x-auto" style={{ gap: "var(--space-3)", padding: "var(--space-3)" }}>
                <CommitPane
                    commits={commits}
                    laneCount={history.laneCount}
                    selectedHash={state.selectedHash}
                    openHash={state.openHash}
                    isActive={state.activePaneIndex === 0}
                    onSelectCommit={hash => setState(selectCommit(hash))}
                />
                {openCommit ? (
                    <CommitDetailsPane
                        key={openCommit.hash}
                        commit={openCommit}
                        selectedPath={state.selectedPath}
                        openPath={state.openPath}
                        isActive={state.activePaneIndex === 1}
                        onSelectFile={path => setState(current => selectFile(current, path))}
                        onClose={() => setState(closeCommitDetailsPane)}
                    />
                ) : undefined}
                {openFile ? <FilePane key={openFile.path} file={openFile} isActive={state.activePaneIndex === 2} onClose={() => setState(closeFilePane)} /> : undefined}
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
