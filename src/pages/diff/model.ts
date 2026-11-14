//
// Turns a file's diff, as `git diff` writes it, into the rows the diff views draw: numbered lines
// in hunks for the unified view, pairs of old and new lines for the side-by-side view, and the
// words that changed within a changed line.
//

//
// One line of a diff.
//
export interface IDiffLine {
    //
    // What the line is: one the change kept, added or deleted.
    //
    kind: "context" | "added" | "deleted";

    //
    // The line's number in the old file, absent for an added line.
    //
    oldNumber?: number;

    //
    // The line's number in the new file, absent for a deleted line.
    //
    newNumber?: number;

    //
    // The line's text without its marker.
    //
    text: string;

    //
    // True when Git marked the line "\ No newline at end of file": the file ends on this line with
    // no line break.
    //
    hasNoNewline?: boolean;
}

//
// One hunk of a diff: a run of changed lines with the kept lines around them.
//
export interface IHunk {
    //
    // The hunk header as Git writes it, as in "@@ -40,5 +40,6 @@ pub fn run(args: Args) !Result {".
    //
    header: string;

    //
    // The first line of the hunk in the old file.
    //
    oldStart: number;

    //
    // How many lines of the old file the hunk covers.
    //
    oldCount: number;

    //
    // The first line of the hunk in the new file.
    //
    newStart: number;

    //
    // The hunk's lines, numbered.
    //
    lines: IDiffLine[];
}

//
// Splits a diff into hunks and numbers their lines. Each hunk header gives the first old and new
// line numbers of the lines after it. A line starting "+" is added, "-" deleted, "\" marks the
// line before it as ending without a line break, and any other line is kept.
//
export function parseHunks(diff: string): IHunk[] {
    const hunks: IHunk[] = [];
    let oldNumber = 0;
    let newNumber = 0;
    for (const line of diff.split("\n")) {
        const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,\d+)? @@/.exec(line);
        if (header) {
            oldNumber = Number(header[1]);
            newNumber = Number(header[3]);
            hunks.push({
                header: line,
                oldStart: oldNumber,
                oldCount: header[2] === undefined ? 1 : Number(header[2]),
                newStart: newNumber,
                lines: [],
            });
            continue;
        }
        const hunk = hunks[hunks.length - 1];
        if (!hunk) {
            continue;
        }
        if (line.startsWith("\\")) {
            const previous = hunk.lines[hunk.lines.length - 1];
            if (previous) {
                previous.hasNoNewline = true;
            }
        }
        else if (line.startsWith("+")) {
            hunk.lines.push({ kind: "added", newNumber, text: line.slice(1) });
            newNumber += 1;
        }
        else if (line.startsWith("-")) {
            hunk.lines.push({ kind: "deleted", oldNumber, text: line.slice(1) });
            oldNumber += 1;
        }
        else {
            hunk.lines.push({ kind: "context", oldNumber, newNumber, text: line.slice(1) });
            oldNumber += 1;
            newNumber += 1;
        }
    }
    return hunks;
}

//
// One row of the side-by-side view: the old line on the left and the new line on the right. A
// side is absent where the other side added or deleted a line with no partner.
//
export interface ISplitRow {
    //
    // The line on the old side.
    //
    old?: IDiffLine;

    //
    // The line on the new side.
    //
    new?: IDiffLine;
}

//
// Lays a hunk's lines out side by side. A kept line shows on both sides. A run of deleted lines
// followed by a run of added lines is a change: its lines pair up row by row, and the longer run's
// extra lines face an empty side.
//
export function splitRows(lines: IDiffLine[]): ISplitRow[] {
    const rows: ISplitRow[] = [];
    let index = 0;
    while (index < lines.length) {
        const line = lines[index];
        if (line.kind === "context") {
            rows.push({ old: line, new: line });
            index += 1;
            continue;
        }
        const deleted: IDiffLine[] = [];
        while (index < lines.length && lines[index].kind === "deleted") {
            deleted.push(lines[index]);
            index += 1;
        }
        const added: IDiffLine[] = [];
        while (index < lines.length && lines[index].kind === "added") {
            added.push(lines[index]);
            index += 1;
        }
        for (let row = 0; row < Math.max(deleted.length, added.length); row++) {
            rows.push({ old: deleted[row], new: added[row] });
        }
    }
    return rows;
}

//
// Returns, for each line of a hunk, the line it was changed from or into: the deleted and added
// lines of a change pair up in order, as in the side-by-side view. A line with no partner, and a
// kept line, are absent.
//
export function changePartners(lines: IDiffLine[]): Map<IDiffLine, IDiffLine> {
    const partners = new Map<IDiffLine, IDiffLine>();
    for (const row of splitRows(lines)) {
        if (row.old && row.new && row.old.kind === "deleted" && row.new.kind === "added") {
            partners.set(row.old, row.new);
            partners.set(row.new, row.old);
        }
    }
    return partners;
}

//
// One piece of a changed line: text that the change kept or text that it changed.
//
export interface IWordPiece {
    //
    // The piece's text.
    //
    text: string;

    //
    // True when the change added or deleted this text within the line.
    //
    isChanged: boolean;
}

//
// Splits a line into words, runs of spaces and single other characters, so a word-level diff
// marks whole words and leaves punctuation and spacing to match on their own.
//
export function tokens(text: string): string[] {
    return text.match(/\w+|\s+|[^\w\s]/g) ?? [];
}

//
// Compares a line with the line it was changed from or into and returns its pieces, with the
// words the other line lacks marked as changed. It keeps the longest run of words the two lines
// share in order and marks the rest. Joining neighbouring pieces of the same kind keeps the
// marking to as few blocks as possible.
//
export function wordPieces(text: string, partner: string): IWordPiece[] {
    const own = tokens(text);
    const other = tokens(partner);
    const shared: number[][] = Array.from({ length: own.length + 1 }, () => new Array<number>(other.length + 1).fill(0));
    for (let ownIndex = own.length - 1; ownIndex >= 0; ownIndex--) {
        for (let otherIndex = other.length - 1; otherIndex >= 0; otherIndex--) {
            shared[ownIndex][otherIndex] =
                own[ownIndex] === other[otherIndex]
                    ? shared[ownIndex + 1][otherIndex + 1] + 1
                    : Math.max(shared[ownIndex + 1][otherIndex], shared[ownIndex][otherIndex + 1]);
        }
    }
    const pieces: IWordPiece[] = [];
    function add(piece: string, isChanged: boolean): void {
        const last = pieces[pieces.length - 1];
        if (last && last.isChanged === isChanged) {
            last.text += piece;
        }
        else {
            pieces.push({ text: piece, isChanged });
        }
    }
    let ownIndex = 0;
    let otherIndex = 0;
    while (ownIndex < own.length) {
        if (otherIndex < other.length && own[ownIndex] === other[otherIndex]) {
            add(own[ownIndex], false);
            ownIndex += 1;
            otherIndex += 1;
        }
        else if (otherIndex < other.length && shared[ownIndex][otherIndex + 1] >= shared[ownIndex + 1][otherIndex]) {
            otherIndex += 1;
        }
        else {
            add(own[ownIndex], true);
            ownIndex += 1;
        }
    }
    return pieces;
}

//
// Returns the diff without the hunks at the positions in `drop`, from 0, as it reads once those
// hunks are committed and only the rest of the change is left.
//
export function withoutHunks(diff: string, drop: ReadonlySet<number>): string {
    const kept: string[] = [];
    let hunk = -1;
    for (const line of diff.split("\n")) {
        if (line.startsWith("@@")) {
            hunk += 1;
        }
        if (!drop.has(hunk)) {
            kept.push(line);
        }
    }
    return kept.join("\n");
}
