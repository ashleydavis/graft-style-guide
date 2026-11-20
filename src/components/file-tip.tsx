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
    // The path a renamed or copied file had before, absent for a file that kept its path.
    //
    oldPath?: string;

    //
    // How much of a renamed or copied file is the same as before, as a percentage, absent where
    // Git did not measure it.
    //
    similarity?: number;

    //
    // True for a file Git does not track yet.
    //
    isUntracked?: boolean;

    //
    // True for a binary file, whose lines Git does not count.
    //
    isBinary?: boolean;
}

//
// Returns the change counts of a file as the tip shows them: its lines added and deleted, that it
// is binary, whose lines Git does not count, or nothing where the lines were not counted.
//
export function changeCounts(file: IFileTipFile): string {
    if (file.isBinary) {
        return "Binary file";
    }
    if (file.linesAdded === undefined || file.linesDeleted === undefined) {
        return "";
    }
    return `+${file.linesAdded} −${file.linesDeleted}`;
}

//
// Renders the tip's body: the status letter, its name, or "Untracked" for an untracked file, and
// the change counts on the first line with `pinButton` at its end, what the status means and how
// much of a renamed or copied file is the same under it, then the path, and the old path of a
// renamed or copied file, each with a copy button.
//
export function FileTip({ file, pinButton }: { file: IFileTipFile; pinButton: ReactNode }): ReactNode {
    const status = statusTips[file.status];
    const fields = file.oldPath ? [codeField("Path", file.path), codeField(file.status === "C" ? "Copied from" : "Renamed from", file.oldPath)] : [codeField("Path", file.path)];
    return (
        <span className="flex flex-col" style={{ gap: "var(--space-1)" }}>
            <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)", color: statusColour(file.status) }}>{file.status}</span>
                <span style={{ fontWeight: "var(--weight-bold)" }}>{file.isUntracked ? "Untracked" : status.title}</span>
                <span className="flex-1" style={{ fontFamily: "var(--font-mono)" }}>
                    {changeCounts(file)}
                </span>
                {pinButton}
            </span>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-normal)", opacity: 0.8 }}>
                {file.isUntracked ? "Git does not track the file yet." : status.detail}
                {file.similarity !== undefined && file.oldPath ? ` ${file.similarity}% the same as before.` : ""}
            </span>
            <CopyTip fields={fields} action={undefined} />
        </span>
    );
}
