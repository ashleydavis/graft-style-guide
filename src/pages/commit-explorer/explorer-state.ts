//
// Works out what the commit explorer shows after each key and click: which panes are open, which
// one is active and which item is selected in each, as in the column view of a file browser.
//

//
// The commit explorer's panes and their selections. The open panes are the commit pane, then the
// commit pane's details while a commit is open, then the file pane while a file is open.
//
export interface IExplorerState {
    //
    // The position of the active pane among the open panes: 0 for the commit pane, 1 for the
    // commit details pane and 2 for the file pane. The keys act on this pane.
    //
    activePaneIndex: number;

    //
    // The hash of the selected commit, or undefined before one is selected.
    //
    selectedHash: string | undefined;

    //
    // The hash of the commit whose details pane is open, or undefined when it is closed.
    //
    openHash: string | undefined;

    //
    // The path of the selected changed file, or undefined before one is selected.
    //
    selectedPath: string | undefined;

    //
    // The path of the file whose file pane is open, or undefined when it is closed.
    //
    openPath: string | undefined;
}

//
// What the panes list, which Up and Down move through.
//
export interface IExplorerItems {
    //
    // The hashes of the commits in the commit pane, in order.
    //
    commitHashes: string[];

    //
    // The paths of the open commit's changed files, in order, or none while no commit is open.
    //
    filePaths: string[];
}

//
// The item at the top of the commit details pane's list, which stands for the commit itself: its
// message on one line and its short hash. It takes a place in the list of paths, so the keys move
// through it as through the files, and opening it shows the full details in the pane to the right.
// The colon makes it a name no changed file in the examples has.
//
export const COMMIT_SUMMARY_PATH = ":commit";

//
// What a directory's row in the tree stands for among the commit details pane's paths: this prefix
// and the directory's path. Selecting it with a click or the arrow keys opens no pane to the right;
// Enter opens the diffs of every file inside it.
//
export const DIRECTORY_PREFIX = ":directory:";

//
// The explorer as it first shows: the commit pane alone, active, with nothing selected.
//
export const initialExplorerState: IExplorerState = {
    activePaneIndex: 0,
    selectedHash: undefined,
    openHash: undefined,
    selectedPath: undefined,
    openPath: undefined,
};

//
// The keys the explorer acts on, as KeyboardEvent.key names them.
//
export const explorerKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape"];

//
// Counts the open panes, so Right knows whether there is a pane to the right of the active one.
//
export function openPaneCount(state: IExplorerState): number {
    if (state.openHash === undefined) {
        return 1;
    }
    if (state.openPath === undefined) {
        return 2;
    }
    return 3;
}

//
// Picks the item one step up (step -1) or down (step 1) from the selected one, staying on the
// first or last item at the ends. With nothing selected it picks the first item, and with no
// items it picks nothing.
//
export function itemAfterMove(items: string[], selected: string | undefined, step: number): string | undefined {
    if (items.length === 0) {
        return undefined;
    }
    const index = selected === undefined ? -1 : items.indexOf(selected);
    if (index < 0) {
        return items[0];
    }
    return items[Math.min(Math.max(index + step, 0), items.length - 1)];
}

//
// Selects the commit and opens its details pane with the commit pane active, as a click on the
// commit does. The file pane closes, so the commit shows afresh.
//
export function selectCommit(hash: string): IExplorerState {
    return {
        activePaneIndex: 0,
        selectedHash: hash,
        openHash: hash,
        selectedPath: undefined,
        openPath: undefined,
    };
}

//
// Selects the changed file and opens its file pane with the commit details pane active, as a
// click on the file does.
//
export function selectFile(state: IExplorerState, path: string): IExplorerState {
    return {
        ...state,
        activePaneIndex: 1,
        selectedPath: path,
        openPath: path,
    };
}

//
// Closes the file pane, as its close button does, and makes the commit details pane active when
// the file pane was.
//
export function closeFilePane(state: IExplorerState): IExplorerState {
    return {
        ...state,
        activePaneIndex: Math.min(state.activePaneIndex, 1),
        openPath: undefined,
    };
}

//
// Closes the commit details pane and the file pane with it, as the details pane's close button
// does, and makes the commit pane active. The commit stays selected.
//
export function closeCommitDetailsPane(state: IExplorerState): IExplorerState {
    return {
        ...state,
        activePaneIndex: 0,
        openHash: undefined,
        selectedPath: undefined,
        openPath: undefined,
    };
}

//
// Works out the explorer after the key: Up and Down move the selection in the active pane, and in
// the commit details pane also open the newly selected file's diff, so stepping through the files
// shows each one with the keys staying on the file list. A directory is only selected. Left
// and Right make the pane to the left or right active when there is one, Enter opens the selected
// item and makes its pane active, and Escape closes the rightmost pane. Any other key changes
// nothing.
//
export function stateAfterKey(state: IExplorerState, key: string, items: IExplorerItems): IExplorerState {
    if (key === "ArrowUp" || key === "ArrowDown") {
        const step = key === "ArrowUp" ? -1 : 1;
        if (state.activePaneIndex === 0) {
            return { ...state, selectedHash: itemAfterMove(items.commitHashes, state.selectedHash, step) };
        }
        if (state.activePaneIndex === 1) {
            const path = itemAfterMove(items.filePaths, state.selectedPath, step);
            if (path?.startsWith(DIRECTORY_PREFIX)) {
                return { ...state, selectedPath: path };
            }
            return { ...state, selectedPath: path, openPath: path };
        }
        return state;
    }
    if (key === "ArrowLeft") {
        return { ...state, activePaneIndex: Math.max(state.activePaneIndex - 1, 0) };
    }
    if (key === "ArrowRight") {
        return { ...state, activePaneIndex: Math.min(state.activePaneIndex + 1, openPaneCount(state) - 1) };
    }
    if (key === "Enter") {
        if (state.activePaneIndex === 0 && state.selectedHash !== undefined) {
            return { ...selectCommit(state.selectedHash), activePaneIndex: 1 };
        }
        if (state.activePaneIndex === 1 && state.selectedPath !== undefined) {
            return { ...selectFile(state, state.selectedPath), activePaneIndex: 2 };
        }
        return state;
    }
    if (key === "Escape") {
        const paneCount = openPaneCount(state);
        if (paneCount === 3) {
            return { ...closeFilePane(state), activePaneIndex: 1 };
        }
        if (paneCount === 2) {
            return closeCommitDetailsPane(state);
        }
    }
    return state;
}
