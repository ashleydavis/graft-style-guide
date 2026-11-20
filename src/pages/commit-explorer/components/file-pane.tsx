//
// The file pane: the column that opens to the right of the commit details pane, with one changed
// file's diff in the commit. It is the Diff page's file diff card itself, so the commit explorer
// and the Diff page draw a diff the same way.
//

import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { stackCardName, type IStackStop } from "../../diff/stops";
import { exampleOldFile } from "../../diff/example-old-file";
import { FileDiffCard, type IFileDiff, type IFileDiffCardHandle } from "../../diff/components/file-diff-card";
import type { IChangedFile } from "../data";
import { CollapsedRail } from "../../../components/collapse";
import { Pane } from "./pane";

//
// The least width a diff pane takes: 840 pixels on a desktop screen, so a diff's lines have room
// beside the panes to its left, and the screen's width less the explorer's margins on a phone,
// where 840 pixels would not fit.
//
export const DIFF_PANE_WIDTH_MIN = "min(840px, calc(100vw - var(--space-8) * 2))";

//
// Returns the status the diff card draws for a commit's file. The card knows added, modified,
// deleted and renamed: a copy draws as a new file with the path it came from, and a type change
// or a conflict draws as a modified file.
//
export function cardStatus(status: IChangedFile["status"]): IFileDiff["status"] {
    if (status === "C") {
        return "A";
    }
    if (status === "T" || status === "U") {
        return "M";
    }
    return status;
}

//
// Returns the diff card's file for a commit's file, with its old path, its binary sizes and the
// example old file the card shows unchanged lines from.
//
export function cardFileOf(file: IChangedFile): IFileDiff {
    return {
        path: file.path,
        oldPath: file.oldPath,
        status: cardStatus(file.status),
        diff: file.diff,
        binary: file.binary,
        oldFileLines: exampleOldFile(file.path, file.status, file.diff),
    };
}

//
// What the file pane shows and reports.
//
export interface IFilePaneProps {
    //
    // The changed file.
    //
    file: IChangedFile;

    //
    // True while the pane is the one the keys act on, which the card's accent border shows.
    //
    isActive: boolean;

    //
    // The position of the hunk the keys are on, from 0, or undefined.
    //
    currentHunk: number | undefined;

    //
    // True while the pane fills the explorer.
    //
    isMaximised: boolean;

    //
    // Called by the pane's maximise button.
    //
    onToggleMaximise: () => void;

    //
    // True while the pane is collapsed into a narrow strip at its left.
    //
    isCollapsed: boolean;

    //
    // Called by the collapse button and the strip's restore button.
    //
    onToggleCollapse: () => void;

    //
    // Called with a hunk's position when it is clicked.
    //
    onSelectHunk: (hunkIndex: number) => void;

    //
    // The position of the run of unchanged lines the keys are on, or undefined.
    //
    currentGap: number | undefined;

    //
    // Called with a run of unchanged lines' position when its bar is clicked.
    //
    onSelectGap: (gapIndex: number) => void;

    //
    // Holds the card, so the explorer can show or fold the current run of unchanged lines.
    //
    cardRef: Ref<IFileDiffCardHandle>;

    //
    // Called by the card's close button.
    //
    onClose: () => void;
}

//
// Renders the card in a column as tall as the explorer's panes, with the diff scrolling inside it.
// The column takes all the width the panes to its left leave, never less than DIFF_PANE_WIDTH_MIN,
// and long lines start wrapped, so the diff uses the room there is and scrolls sideways only when
// wrapping is switched off. A commit is history, already made, so the card has no Stage or Unstage
// buttons.
//
export function FilePane({ file, isActive, currentHunk, currentGap, cardRef, isMaximised, onToggleMaximise, isCollapsed, onToggleCollapse, onSelectHunk, onSelectGap, onClose }: IFilePaneProps): ReactNode {
    if (isCollapsed) {
        return <CollapsedRail label="File diff" title={file.path.slice(file.path.lastIndexOf("/") + 1)} side="left" isActive={isActive} onRestore={onToggleCollapse} />;
    }
    return (
        <div style={{ flex: "1 1 0%", minWidth: DIFF_PANE_WIDTH_MIN, height: "100%" }}>
            <FileDiffCard
                isFoldable={false}
                file={cardFileOf(file)}
                label="File diff"
                initialWrap
                stageable={false}
                answersKeys={false}
                isCurrent={isActive}
                currentHunk={currentHunk}
                currentGap={currentGap}
                ref={cardRef}
                onSelectHunk={onSelectHunk}
                onSelectGap={onSelectGap}
                fillHeight
                isMaximised={isMaximised}
                onToggleMaximise={onToggleMaximise}
                onCollapse={onToggleCollapse}
                onClose={onClose}
            />
        </div>
    );
}

//
// What the directory pane shows.
//
export interface IDirectoryPaneProps {
    //
    // The directory's path.
    //
    path: string;

    //
    // The commit's changed files inside the directory, in the order the file list shows them.
    //
    files: IChangedFile[];

    //
    // True while the pane is the one the keys act on.
    //
    isActive: boolean;

    //
    // True while the pane fills the explorer.
    //
    isMaximised: boolean;

    //
    // Called by the maximise button.
    //
    onToggleMaximise: () => void;

    //
    // True while the pane is folded into a strip.
    //
    isCollapsed: boolean;

    //
    // Called by the collapse button and the strip's restore button.
    //
    onToggleCollapse: () => void;

    //
    // Called by the close button.
    //
    onClose: () => void;

    //
    // The stop the keys are on, in one of the files.
    //
    currentStop: IStackStop | undefined;

    //
    // Returns the ref that holds the card of the file at a path, so the explorer can open or fold
    // a run of unchanged lines in it.
    //
    cardRef: (path: string) => Ref<IFileDiffCardHandle>;

    //
    // Called with the stop a click on a hunk or a run of unchanged lines lands on.
    //
    onSelectStop: (stop: IStackStop) => void;
}

//
// Renders the diffs of every file in a selected directory stacked in one scrolling pane, each card
// with its own button that collapses or expands it. A commit is history, so the cards have no
// Stage or Unstage buttons.
//
export function DirectoryPane({ path, files, isActive, isMaximised, onToggleMaximise, isCollapsed, onToggleCollapse, onClose, currentStop, cardRef, onSelectStop }: IDirectoryPaneProps): ReactNode {
    const stackRef = useRef<HTMLDivElement>(null);

    //
    // Keeps the current stop in view as the keys move it.
    //
    useEffect(() => {
        if (!currentStop) {
            return;
        }
        const card = [...(stackRef.current?.querySelectorAll<HTMLElement>("[data-stack-path]") ?? [])].find(element => element.dataset.stackPath === currentStop.path);
        const selector = currentStop.stop?.kind === "hunk" ? `[data-hunk-index="${currentStop.stop.hunk}"]` : currentStop.stop?.kind === "gap" ? `[data-gap-index="${currentStop.stop.gap}"]` : undefined;
        const target = (selector ? card?.querySelector<HTMLElement>(selector) : undefined) ?? card;
        target?.scrollIntoView({ block: "nearest" });
    }, [currentStop]);
    return (
        <div style={isCollapsed ? { flex: "none", height: "100%" } : { flex: "1 1 0%", minWidth: DIFF_PANE_WIDTH_MIN, height: "100%" }}>
            <Pane
                label="Directory diffs"
                width="100%"
                fillsHeight
                isActive={isActive}
                isMaximised={isMaximised}
                onToggleMaximise={onToggleMaximise}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                railTitle={path}
                title={path}
                onClose={onClose}
            >
                <div ref={stackRef} className="flex flex-col" style={{ gap: "var(--space-3)", padding: "var(--space-3)" }}>
                    {files.map(file => (
                        //
                        // Each card keeps its full height, so the pane scrolls through them.
                        //
                        <div key={file.path} className="flex-none" data-stack-path={file.path}>
                        <FileDiffCard
                            file={cardFileOf(file)}
                            label={`File diff ${file.path}`}
                            initialWrap
                            stageable={false}
                            answersKeys={false}
                            ref={cardRef(file.path)}
                            isCurrent={isActive && currentStop?.path === file.path}
                            currentHunk={currentStop?.path === file.path && currentStop.stop?.kind === "hunk" ? currentStop.stop.hunk : undefined}
                            currentGap={currentStop?.path === file.path && currentStop.stop?.kind === "gap" ? currentStop.stop.gap : undefined}
                            onSelectHunk={hunk => onSelectStop({ path: file.path, stop: { kind: "hunk", hunk } })}
                            onSelectGap={gap => onSelectStop({ path: file.path, stop: { kind: "gap", gap, card: stackCardName(file.path) } })}
                        />
                        </div>
                    ))}
                </div>
            </Pane>
        </div>
    );
}
