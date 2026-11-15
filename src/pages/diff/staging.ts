//
// Which parts of a changed file are staged for the next commit, and how a click, Space or a
// selection of lines changes that.
//

import type { IHunk } from "./model";

//
// What is staged of one changed file.
//
export interface IStaging {
    //
    // The positions of the hunks staged whole, from 0.
    //
    hunks: ReadonlySet<number>;

    //
    // For each hunk staged in part, by position, the positions in the hunk's lines of its staged
    // added and deleted lines. A hunk staged whole or not at all has no entry.
    //
    lines: ReadonlyMap<number, ReadonlySet<number>>;

    //
    // True when the whole of a file with no hunks, such as a binary file or a rename, is staged.
    //
    isWholeFile: boolean;
}

//
// How much of a hunk is staged.
//
export type StagedState = "all" | "some" | "none";

//
// Returns a staging with nothing staged.
//
export function emptyStaging(): IStaging {
    return { hunks: new Set(), lines: new Map(), isWholeFile: false };
}

//
// Returns the staging a file starts with, from the positions of its hunks already staged. For a
// file with no hunks, any position stands for the whole file.
//
export function initialStaging(stagedHunks: number[] | undefined): IStaging {
    return {
        hunks: new Set(stagedHunks ?? []),
        lines: new Map(),
        isWholeFile: (stagedHunks ?? []).length > 0,
    };
}

//
// Returns the positions in `hunk`'s lines of its added and deleted lines, the lines that can be
// staged one by one.
//
export function changedLineIndexes(hunk: IHunk): number[] {
    return hunk.lines.flatMap((line, index) => (line.kind === "context" ? [] : [index]));
}

//
// Returns how much of hunk `index` is staged.
//
export function hunkStagedState(staging: IStaging, index: number): StagedState {
    if (staging.hunks.has(index)) {
        return "all";
    }
    return (staging.lines.get(index)?.size ?? 0) > 0 ? "some" : "none";
}

//
// Returns the positions of hunk `index`'s staged lines: every changed line for a hunk staged
// whole, its own staged lines for a hunk staged in part and none otherwise.
//
export function stagedLinesOf(staging: IStaging, hunk: IHunk, index: number): ReadonlySet<number> {
    if (staging.hunks.has(index)) {
        return new Set(changedLineIndexes(hunk));
    }
    return staging.lines.get(index) ?? new Set();
}

//
// Returns true when anything of the file is staged.
//
export function isAnythingStaged(staging: IStaging): boolean {
    return staging.hunks.size > 0 || staging.lines.size > 0 || staging.isWholeFile;
}

//
// Returns true when the whole file is staged: every hunk, or the file itself when it has none.
//
export function isFileStaged(staging: IStaging, hunkCount: number): boolean {
    return hunkCount > 0 ? staging.hunks.size === hunkCount : staging.isWholeFile;
}

//
// Returns the staging with hunk `index` staged whole when `isStaged` is true, and unstaged whole
// otherwise.
//
export function withHunkStaged(staging: IStaging, index: number, isStaged: boolean): IStaging {
    const hunks = new Set(staging.hunks);
    const lines = new Map(staging.lines);
    lines.delete(index);
    if (isStaged) {
        hunks.add(index);
    }
    else {
        hunks.delete(index);
    }
    return { ...staging, hunks, lines };
}

//
// Returns the staging with hunk `index` flipped: unstaged whole when it was staged whole, and
// staged whole otherwise, so a hunk staged in part is staged whole.
//
export function withHunkToggled(staging: IStaging, index: number): IStaging {
    return withHunkStaged(staging, index, !staging.hunks.has(index));
}

//
// Returns the staging with the lines at `lineIndexes` of hunk `index` staged when `isStaged` is
// true and unstaged otherwise. A hunk whose changed lines end up all staged counts as staged
// whole, and one with none staged as not staged.
//
export function withLinesStaged(staging: IStaging, hunk: IHunk, index: number, lineIndexes: Iterable<number>, isStaged: boolean): IStaging {
    const changed = changedLineIndexes(hunk);
    const staged = new Set(stagedLinesOf(staging, hunk, index));
    for (const line of lineIndexes) {
        if (isStaged) {
            staged.add(line);
        }
        else {
            staged.delete(line);
        }
    }
    if (staged.size === changed.length) {
        return withHunkStaged(staging, index, true);
    }
    if (staged.size === 0) {
        return withHunkStaged(staging, index, false);
    }
    const hunks = new Set(staging.hunks);
    hunks.delete(index);
    return { ...staging, hunks, lines: new Map(staging.lines).set(index, staged) };
}

//
// Returns the staging with the whole file flipped: everything unstaged when it was all staged, and
// everything staged otherwise.
//
export function withFileToggled(staging: IStaging, hunkCount: number): IStaging {
    const isStaged = isFileStaged(staging, hunkCount);
    return {
        hunks: isStaged ? new Set() : new Set(Array.from({ length: hunkCount }, (_unused, index) => index)),
        lines: new Map(),
        isWholeFile: !isStaged,
    };
}
