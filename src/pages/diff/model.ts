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
// The unchanged lines between two hunks, before the first or after the last: where they start in
// the old file, how many there are and how far the new file's numbers run ahead of the old file's
// there.
//
export interface IGap {
    //
    // The first unchanged line, numbered in the old file.
    //
    oldStart: number;

    //
    // How many unchanged lines there are.
    //
    count: number;

    //
    // The new file's line number minus the old file's for these lines.
    //
    shift: number;
}

//
// Returns the unchanged lines before `hunk`, after the hunk before it, or after the last hunk when
// `hunk` is undefined and the whole old file is known.
//
export function gapBefore(hunks: IHunk[], index: number, oldFileLength: number | undefined): IGap {
    const previous = hunks[index - 1];
    const oldStart = previous ? previous.oldStart + previous.oldCount : 1;
    const previousShift = previous ? previous.newStart + previous.lines.filter(line => line.kind !== "deleted").length - (previous.oldStart + previous.oldCount) : 0;
    const hunk = hunks[index];
    if (hunk) {
        return { oldStart, count: Math.max(hunk.oldStart - oldStart, 0), shift: hunk.newStart - hunk.oldStart };
    }
    return { oldStart, count: oldFileLength === undefined ? 0 : Math.max(oldFileLength - oldStart + 1, 0), shift: previousShift };
}

//
// Returns the hunk's lines as `git diff` writes them: a "+", "-" or space before each line's
// text, and Git's note after a line that ends with no line break.
//
function hunkLineTexts(lines: IDiffLine[]): string[] {
    return lines.flatMap(line => {
        const marker = line.kind === "added" ? "+" : line.kind === "deleted" ? "-" : " ";
        return line.hasNoNewline ? [marker + line.text, "\\ No newline at end of file"] : [marker + line.text];
    });
}

//
// Returns a hunk as `git diff` writes it, with a header that counts its lines afresh from
// `oldStart` and `newStart` and keeps the original header's function or section name.
//
export function hunkText(hunk: IHunk, oldStart: number, newStart: number, lines: IDiffLine[]): string[] {
    const oldCount = lines.filter(line => line.kind !== "added").length;
    const newCount = lines.filter(line => line.kind !== "deleted").length;
    const context = hunk.header.replace(/^@@[^@]*@@/, "");
    return [`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${context}`, ...hunkLineTexts(lines)];
}

//
// One side of a file's change once some of it is staged: its diff, the position each of its hunks
// has in the whole file's diff, and for each of its hunks the position each line has in that
// hunk's lines in the whole file's diff.
//
export interface ISectionDiff {
    diff: string;
    hunkIndexes: number[];
    lineIndexes: number[][];
}

//
// Returns the staged or the unstaged side of `diff`, as `git diff --cached` and `git diff` show
// them once the lines `stagedLines` gives are staged. `stagedLines` returns a hunk's staged line
// positions. The staged side keeps the staged lines as changes, turns the unstaged deleted lines
// into kept lines and leaves the unstaged added lines out. The unstaged side keeps the unstaged
// lines as changes, turns the staged added lines into kept lines and leaves the staged deleted
// lines out. A hunk with no changes on a side drops out of it, and the line numbers follow the
// index, which sits between the last commit and the working tree.
//
export function sectionDiff(diff: string, stagedLines: (hunk: IHunk, index: number) => ReadonlySet<number>, section: "staged" | "unstaged"): ISectionDiff {
    const texts: string[] = [];
    const hunkIndexes: number[] = [];
    const lineIndexes: number[][] = [];
    let shift = 0;
    parseHunks(diff).forEach((hunk, index) => {
        const staged = stagedLines(hunk, index);
        const lines: IDiffLine[] = [];
        const map: number[] = [];
        let stagedShift = 0;
        hunk.lines.forEach((line, position) => {
            const isStaged = staged.has(position);
            if (line.kind !== "context" && isStaged) {
                stagedShift += line.kind === "added" ? 1 : -1;
            }
            if (line.kind === "context" || (section === "staged") === isStaged) {
                lines.push(line);
                map.push(position);
            }
            else if ((section === "staged" && line.kind === "deleted") || (section === "unstaged" && line.kind === "added")) {
                lines.push({ ...line, kind: "context" });
                map.push(position);
            }
        });
        if (lines.some(line => line.kind !== "context")) {
            const oldStart = section === "staged" ? hunk.oldStart : hunk.oldStart + shift;
            const newStart = section === "staged" ? hunk.oldStart + shift : hunk.newStart;
            texts.push(...hunkText(hunk, oldStart, newStart === 0 && lines.some(line => line.kind !== "deleted") ? 1 : newStart, lines));
            hunkIndexes.push(index);
            lineIndexes.push(map);
        }
        shift += stagedShift;
    });
    return { diff: texts.join("\n"), hunkIndexes, lineIndexes };
}
