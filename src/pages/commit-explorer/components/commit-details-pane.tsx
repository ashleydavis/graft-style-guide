//
// The commit details pane: the column that opens to the right of the commit pane, with the
// commit's full message, who wrote and made it and when, its hash and parents, and the files it
// changed with their line counts.
//

import { useEffect, useRef, type ReactNode } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListSubheader from "@mui/material/ListSubheader";
import { CopyButton } from "../../../components/copy-button";
import { StatusLetter } from "../../tree";
import type { ICommit } from "../data";
import { FilePath } from "./file-path";
import { LineCounts } from "./line-counts";
import { Pane } from "./pane";
import { scrollSelectionIntoView } from "../scroll";

//
// Formats a date with its time for the details, as in "14 Nov 2026, 16:42", in the browser's own
// locale.
//
export function longDate(date: Date): string {
    return date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

//
// Renders one labelled line of the commit's facts: the label small and muted in a column of its
// own, the value beside it.
//
export function Fact({ label, children }: { label: string; children: ReactNode }): ReactNode {
    return (
        <>
            <dt style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{label}</dt>
            <dd className="min-w-0" style={{ fontSize: "var(--text-sm)" }}>
                {children}
            </dd>
        </>
    );
}

//
// Renders a person and when they acted: the name, the email address muted after it and the date
// on the line below.
//
export function PersonAndDate({ name, email, date }: { name: string; email: string; date: Date }): ReactNode {
    return (
        <div className="flex flex-col">
            <span className="truncate">
                {name} <span style={{ color: "var(--color-text-muted)" }}>&lt;{email}&gt;</span>
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>{longDate(date)}</span>
        </div>
    );
}

//
// What the commit details pane shows and reports.
//
export interface ICommitDetailsPaneProps {
    //
    // The open commit.
    //
    commit: ICommit;

    //
    // The path of the selected changed file, drawn on the selected background, or undefined.
    //
    selectedPath: string | undefined;

    //
    // The path of the changed file whose file pane is open, drawn with an accent bar, or
    // undefined.
    //
    openPath: string | undefined;

    //
    // True while the pane is the one the keys act on.
    //
    isActive: boolean;

    //
    // Called with the path of the changed file the person clicks.
    //
    onSelectFile: (path: string) => void;

    //
    // Called by the close button.
    //
    onClose: () => void;
}

//
// Renders the pane, headed "Commit" and the short hash. The description shows only when the
// message has more than a title, and the author and committer show separately only when they
// differ. The selected file scrolls into view when the keys move the selection.
//
export function CommitDetailsPane({ commit, selectedPath, openPath, isActive, onSelectFile, onClose }: ICommitDetailsPaneProps): ReactNode {
    const selectedRef = useRef<HTMLLIElement>(null);
    const isSamePerson = commit.authorName === commit.committerName && commit.authorDate.getTime() === commit.committerDate.getTime();
    const totalAdded = commit.files.reduce((total, file) => total + file.linesAdded, 0);
    const totalDeleted = commit.files.reduce((total, file) => total + file.linesDeleted, 0);

    useEffect(() => {
        scrollSelectionIntoView(selectedRef.current);
    }, [selectedPath]);

    return (
        <Pane
            label="Commit details"
            width="380px"
            isActive={isActive}
            title={
                <span className="flex items-baseline" style={{ gap: "var(--space-2)" }}>
                    Commit
                    <code style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-normal)", color: "var(--color-text-muted)" }}>
                        {commit.hash.slice(0, 7)}
                    </code>
                </span>
            }
            onClose={onClose}
        >
            <div className="flex flex-col" style={{ gap: "var(--space-3)", padding: "var(--space-4)", borderBottom: "1px solid var(--color-border)" }}>
                <div className="flex flex-col" style={{ gap: "var(--space-1)" }}>
                    <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", lineHeight: "var(--leading-tight)" }}>{commit.title}</h3>
                    {commit.description !== "" ? (
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", whiteSpace: "pre-wrap" }}>{commit.description}</p>
                    ) : undefined}
                </div>
                <dl className="grid items-baseline" style={{ gridTemplateColumns: "auto minmax(0, 1fr)", gap: "var(--space-2) var(--space-4)" }}>
                    <Fact label={isSamePerson ? "Author" : "Authored"}>
                        <PersonAndDate name={commit.authorName} email={commit.authorEmail} date={commit.authorDate} />
                    </Fact>
                    {isSamePerson ? undefined : (
                        <Fact label="Committed">
                            <PersonAndDate name={commit.committerName} email={commit.committerEmail} date={commit.committerDate} />
                        </Fact>
                    )}
                    <Fact label="Hash">
                        <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
                            <code className="min-w-0 truncate" style={{ fontFamily: "var(--font-mono)" }}>
                                {commit.hash}
                            </code>
                            <CopyButton text={commit.hash} label="Copy hash" />
                        </span>
                    </Fact>
                    <Fact label={commit.parentHashes.length === 1 ? "Parent" : "Parents"}>
                        {commit.parentHashes.length === 0 ? (
                            <span style={{ color: "var(--color-text-muted)" }}>None, this is the first commit</span>
                        ) : (
                            <code style={{ fontFamily: "var(--font-mono)" }}>{commit.parentHashes.map(parent => parent.slice(0, 7)).join("  ")}</code>
                        )}
                    </Fact>
                </dl>
            </div>
            <List
                aria-label="Files changed"
                sx={{ padding: "0 var(--space-1) var(--space-2)" }}
                subheader={
                    <ListSubheader component="div" className="flex items-center" sx={{ gap: "var(--space-2)", paddingTop: "var(--space-3)" }}>
                        <span className="flex-1">Files changed ({commit.files.length})</span>
                        {commit.files.length > 0 ? <LineCounts added={totalAdded} deleted={totalDeleted} /> : undefined}
                    </ListSubheader>
                }
            >
                {commit.files.length === 0 ? (
                    <li style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                        No files changed. A merge commit's changes are in its parents.
                    </li>
                ) : (
                    commit.files.map(file => {
                        const isSelected = file.path === selectedPath;
                        return (
                            <ListItemButton
                                key={file.path}
                                component="li"
                                ref={isSelected ? selectedRef : undefined}
                                selected={isSelected}
                                aria-current={file.path === openPath ? "true" : undefined}
                                onClick={() => onSelectFile(file.path)}
                                sx={{
                                    gap: "var(--space-2)",
                                    fontSize: "var(--text-sm)",
                                    boxShadow: file.path === openPath ? "inset 2px 0 0 var(--color-accent)" : "none",
                                }}
                            >
                                <span className="flex-none" style={{ width: "var(--space-3)" }}>
                                    <StatusLetter status={file.status} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <FilePath path={file.path} />
                                </span>
                                <LineCounts added={file.linesAdded} deleted={file.linesDeleted} />
                            </ListItemButton>
                        );
                    })
                )}
            </List>
        </Pane>
    );
}
