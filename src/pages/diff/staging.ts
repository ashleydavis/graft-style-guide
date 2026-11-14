//
// Which parts of a changed file are staged for the next commit, and how a click or Space changes
// that.
//

//
// What is staged of one changed file.
//
export interface IStaging {
    //
    // The positions of the staged hunks, from 0.
    //
    hunks: ReadonlySet<number>;

    //
    // True when the whole of a file with no hunks, such as a binary file or a rename, is staged.
    //
    isWholeFile: boolean;
}

//
// Returns the staging a file starts with, from the positions of its hunks already staged. For a
// file with no hunks, any position stands for the whole file.
//
export function initialStaging(stagedHunks: number[] | undefined): IStaging {
    return {
        hunks: new Set(stagedHunks ?? []),
        isWholeFile: (stagedHunks ?? []).length > 0,
    };
}

//
// Returns true when the whole file is staged: every hunk, or the file itself when it has none.
//
export function isFileStaged(staging: IStaging, hunkCount: number): boolean {
    return hunkCount > 0 ? staging.hunks.size === hunkCount : staging.isWholeFile;
}

//
// Returns the staging with hunk `index` flipped between staged and unstaged.
//
export function withHunkToggled(staging: IStaging, index: number): IStaging {
    const hunks = new Set(staging.hunks);
    if (hunks.has(index)) {
        hunks.delete(index);
    }
    else {
        hunks.add(index);
    }
    return { ...staging, hunks };
}

//
// Returns the staging with the whole file flipped: everything unstaged when it was all staged, and
// everything staged otherwise.
//
export function withFileToggled(staging: IStaging, hunkCount: number): IStaging {
    const isStaged = isFileStaged(staging, hunkCount);
    return {
        hunks: isStaged ? new Set() : new Set(Array.from({ length: hunkCount }, (_unused, index) => index)),
        isWholeFile: !isStaged,
    };
}
