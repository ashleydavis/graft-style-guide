//
// The file pane: the column that opens to the right of the commit details pane, with one changed
// file's diff in the commit. It is the Diff page's file diff card itself, so the commit explorer
// and the Diff page draw a diff the same way.
//

import type { ReactNode, Ref } from "react";
import { exampleOldFile } from "../../diff/example-old-file";
import { FileDiffCard, type IFileDiffCardHandle } from "../../diff/components/file-diff-card";
import type { IChangedFile } from "../data";
import { CollapsedRail } from "../../../components/collapse";

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
// The column grows to fill the width the panes to its left leave, and long lines start wrapped, so
// the diff uses the room there is and scrolls sideways only when wrapping is switched off. A
// commit is history, already made, so the card has no Stage or Unstage buttons.
//
export function FilePane({ file, isActive, currentHunk, currentGap, cardRef, isMaximised, onToggleMaximise, isCollapsed, onToggleCollapse, onSelectHunk, onSelectGap, onClose }: IFilePaneProps): ReactNode {
    if (isCollapsed) {
        return <CollapsedRail label="File diff" title={file.path.slice(file.path.lastIndexOf("/") + 1)} side="left" isActive={isActive} onRestore={onToggleCollapse} />;
    }
    return (
        <div style={{ flex: "1 1 600px", minWidth: "min(360px, calc(100vw - var(--space-8) * 2))", height: "100%" }}>
            <FileDiffCard
                file={{ path: file.path, status: file.status, diff: file.diff, oldFileLines: exampleOldFile(file.path, file.status, file.diff) }}
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
