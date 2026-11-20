//
// The tooltip body for a changed file in a tree or a list: its status letter and what it means,
// its lines added and deleted, and its path, with the path it was renamed from, each path with a
// button that copies it.
//

import type { ReactNode } from "react";
import { codeField, CopyTip } from "./copy-tip";
import { statusColour, statusTips, type FileStatus } from "../pages/tree";

//
// The changed file a tip describes. The commit explorer's and the Commit page's files both fit it.
//
export interface IFileTipFile {
    //
    // The file's path from the root of the repository.
    //
    path: string;

    //
    // How the file changed, as Git's one-letter status.
    //
    status: FileStatus;

    //
    // The lines the change added to the file, absent where the lines were not counted, as on the
    // Tree page.
    //
    linesAdded?: number;

    //
    // The lines the change deleted from the file, absent where the lines were not counted.
    //
    linesDeleted?: number;

    //
    // The path a renamed file had before, absent for a file that kept its path.
    //
    oldPath?: string;
}

//
// Renders the tip's body: the status letter, its name and the line counts, when counted, on the
// first line with `pinButton` at its end, what the status means under it, then the path, and the
// old path of a renamed file, each with a copy button.
//
export function FileTip({ file, pinButton }: { file: IFileTipFile; pinButton: ReactNode }): ReactNode {
    const status = statusTips[file.status];
    const fields = file.oldPath ? [codeField("Path", file.path), codeField("Renamed from", file.oldPath)] : [codeField("Path", file.path)];
    return (
        <span className="flex flex-col" style={{ gap: "var(--space-1)" }}>
            <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)", color: statusColour(file.status) }}>{file.status}</span>
                <span style={{ fontWeight: "var(--weight-bold)" }}>{status.title}</span>
                <span className="flex-1" style={{ fontFamily: "var(--font-mono)" }}>
                    {file.linesAdded !== undefined && file.linesDeleted !== undefined ? `+${file.linesAdded} −${file.linesDeleted}` : undefined}
                </span>
                {pinButton}
            </span>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-normal)", color: "var(--color-tooltip-muted)" }}>{status.detail}</span>
            <CopyTip fields={fields} action={undefined} />
        </span>
    );
}
