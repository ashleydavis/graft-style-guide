//
// The stops in a diff that Up and Down move through: each hunk, and each run of unchanged lines
// that can be shown, in the order the diff draws them.
//

import { gapBefore, parseHunks } from "./model";

//
// One stop in a diff: a hunk, by its position in the file's diff, or a run of unchanged lines, by
// its position among the runs the card draws, 0 before the first hunk it shows and the count of
// those hunks after the last. `card` names the card a run belongs to where a file shows in more
// than one card.
//
export type DiffStop = { kind: "hunk"; hunk: number } | { kind: "gap"; gap: number; card?: string };

//
// Returns the stops of `diff` in order. A run of unchanged lines is a stop when it has lines and
// the old file is known, so it can be shown. `hunkIndexes` gives each drawn hunk's position in the
// file's diff, for a card that draws only some of the file's hunks. `card` is set on every run.
//
export function diffStops(diff: string, oldFileLines: string[] | undefined, hunkIndexes?: number[], card?: string): DiffStop[] {
    const hunks = parseHunks(diff);
    const stops: DiffStop[] = [];
    function addGap(position: number): void {
        if (oldFileLines && gapBefore(hunks, position, oldFileLines.length).count > 0) {
            stops.push(card === undefined ? { kind: "gap", gap: position } : { kind: "gap", gap: position, card });
        }
    }
    hunks.forEach((_hunk, position) => {
        addGap(position);
        stops.push({ kind: "hunk", hunk: hunkIndexes?.[position] ?? position });
    });
    addGap(hunks.length);
    return stops;
}

//
// Returns true when `a` and `b` are the same stop.
//
export function isSameStop(a: DiffStop | undefined, b: DiffStop | undefined): boolean {
    if (a === undefined || b === undefined) {
        return a === b;
    }
    if (a.kind === "hunk" && b.kind === "hunk") {
        return a.hunk === b.hunk;
    }
    if (a.kind === "gap" && b.kind === "gap") {
        return a.gap === b.gap && a.card === b.card;
    }
    return false;
}

//
// Returns the stop `step` stops on from `current`, staying on the first or last stop at the ends.
// With no current stop, Down goes to the first stop and Up to the last. Returns undefined when
// there are no stops.
//
export function stopAfterMove(stops: DiffStop[], current: DiffStop | undefined, step: number): DiffStop | undefined {
    if (stops.length === 0) {
        return undefined;
    }
    const index = stops.findIndex(stop => isSameStop(stop, current));
    if (index < 0) {
        return step > 0 ? stops[0] : stops[stops.length - 1];
    }
    return stops[Math.min(Math.max(index + step, 0), stops.length - 1)];
}
