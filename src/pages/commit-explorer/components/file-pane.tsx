//
// The file pane: the column that opens to the right of the commit details pane, with one changed
// file's diff in the commit.
//

import type { ReactNode } from "react";
import { StatusLetter } from "../../tree";
import type { IChangedFile } from "../data";
import { DiffView } from "./diff-view";
import { FilePath } from "./file-path";
import { LineCounts } from "./line-counts";
import { Pane } from "./pane";

//
// Renders the pane, headed by the file's status letter, path and line counts, with the diff below.
//
export function FilePane({ file, isActive, onClose }: { file: IChangedFile; isActive: boolean; onClose: () => void }): ReactNode {
    return (
        <Pane
            label="File diff"
            width="600px"
            isActive={isActive}
            title={
                <span className="flex items-center" style={{ gap: "var(--space-2)", fontWeight: "var(--weight-normal)" }}>
                    <StatusLetter status={file.status} />
                    <span className="min-w-0 flex-1">
                        <FilePath path={file.path} />
                    </span>
                </span>
            }
            headerExtra={<LineCounts added={file.linesAdded} deleted={file.linesDeleted} />}
            onClose={onClose}
        >
            <DiffView diff={file.diff} />
        </Pane>
    );
}
