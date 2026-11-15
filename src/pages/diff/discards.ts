//
// What has been discarded of one changed file: the whole file, whole hunks or picked lines. A
// discarded part stays in view, faded and struck through, and Undo brings it back.
//

//
// What is discarded of one changed file.
//
export interface IDiscards {
    //
    // True when the whole file is discarded.
    //
    isFile: boolean;

    //
    // The positions of the hunks discarded whole, from 0.
    //
    hunks: ReadonlySet<number>;

    //
    // The ids of the lines discarded one by one, "hunk:line" with the hunk's and the line's
    // positions in the whole file's diff.
    //
    lines: ReadonlySet<string>;
}

//
// Returns the discards of a file with nothing discarded.
//
export function noDiscards(): IDiscards {
    return { isFile: false, hunks: new Set(), lines: new Set() };
}

//
// Returns true when hunk `index` is discarded, on its own or with the whole file.
//
export function isHunkDiscarded(discards: IDiscards, index: number): boolean {
    return discards.isFile || discards.hunks.has(index);
}

//
// Returns true when the line `id` is discarded, on its own, with its hunk or with the whole file.
//
export function isLineDiscarded(discards: IDiscards, id: string): boolean {
    return discards.lines.has(id) || isHunkDiscarded(discards, Number(id.split(":")[0]));
}

//
// Returns the discards with the whole file discarded when `isDiscarded` is true, and with nothing
// discarded when it is false, as Undo on the file brings every part back.
//
export function withFileDiscarded(discards: IDiscards, isDiscarded: boolean): IDiscards {
    return isDiscarded ? { ...discards, isFile: true } : noDiscards();
}

//
// Returns the discards with hunk `index` discarded when `isDiscarded` is true and brought back
// otherwise, along with its lines discarded one by one.
//
export function withHunkMarked(discards: IDiscards, index: number, isDiscarded: boolean): IDiscards {
    const hunks = new Set(discards.hunks);
    const lines = new Set([...discards.lines].filter(id => Number(id.split(":")[0]) !== index));
    if (isDiscarded) {
        hunks.add(index);
    }
    else {
        hunks.delete(index);
    }
    return { ...discards, hunks, lines: isDiscarded ? discards.lines : lines };
}

//
// Returns the discards with the lines `ids` discarded when `isDiscarded` is true and brought back
// otherwise.
//
export function withLinesMarked(discards: IDiscards, ids: Iterable<string>, isDiscarded: boolean): IDiscards {
    const lines = new Set(discards.lines);
    for (const id of ids) {
        if (isDiscarded) {
            lines.add(id);
        }
        else {
            lines.delete(id);
        }
    }
    return { ...discards, lines };
}
