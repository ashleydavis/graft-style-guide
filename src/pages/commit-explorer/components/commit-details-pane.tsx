//
// The commit details pane: the column that opens to the right of the commit pane, with the
// commit's full message, who wrote and made it and when, its hash and parents, and the files it
// changed with their line counts.
//

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListSubheader from "@mui/material/ListSubheader";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen, faFolderTree, faList, faTableColumns, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { CopyButton } from "../../../components/copy-button";
import { FilePathMenu } from "../../../components/file-path-menu";
import { StatusLetter } from "../../tree";
import type { IChangedFile, ICommit } from "../data";
import { treeRows, type FileListView } from "../file-views";
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
// The ways of listing the changed files, with the icon and name of each on the switch.
//
const fileViews: { value: FileListView; label: string; icon: IconDefinition }[] = [
    { value: "paths", label: "Full paths", icon: faList },
    { value: "columns", label: "File name and folder", icon: faTableColumns },
    { value: "tree", label: "Tree", icon: faFolderTree },
];

//
// How many lines of a commit's description show before the rest is folded away.
//
const DESCRIPTION_LINES = 3;

//
// Renders a commit's description in small muted text. A description longer than
// DESCRIPTION_LINES shows its first lines, ending in an ellipsis, with a "Show more" link that
// unfolds the rest and a "Show less" link that folds it again, so the changed files below stay in
// view.
//
export function Description({ text }: { text: string }): ReactNode {
    const textRef = useRef<HTMLParagraphElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLong, setIsLong] = useState(false);

    useLayoutEffect(() => {
        const element = textRef.current;
        if (element && !isOpen) {
            setIsLong(element.scrollHeight > element.clientHeight + 1);
        }
    }, [text, isOpen]);

    return (
        <div className="flex flex-col items-start" style={{ gap: "var(--space-1)" }}>
            <p
                ref={textRef}
                style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-muted)",
                    whiteSpace: "pre-wrap",
                    ...(isOpen
                        ? {}
                        : {
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: DESCRIPTION_LINES,
                              overflow: "hidden",
                          }),
                }}
            >
                {text}
            </p>
            {isLong ? (
                <Link component="button" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)} sx={{ fontSize: "var(--text-sm)" }}>
                    {isOpen ? "Show less" : "Show more"}
                </Link>
            ) : undefined}
        </div>
    );
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
// What one changed file's row shows and reports.
//
export interface IFileRowProps {
    //
    // The changed file.
    //
    file: IChangedFile;

    //
    // How many folders deep the row sits, which indents it.
    //
    depth: number;

    //
    // What the row shows between the status letter and the line counts.
    //
    label: ReactNode;

    //
    // True when the file is selected, drawn on the selected background.
    //
    isSelected: boolean;

    //
    // True when the file's diff is open, drawn with an accent bar.
    //
    isOpen: boolean;

    //
    // Holds the selected row, so the pane can scroll it into view.
    //
    selectedRef: RefObject<HTMLLIElement | null>;

    //
    // Called with the file's path when the person clicks the row.
    //
    onSelectFile: (path: string) => void;
}

//
// Renders one changed file's row: its status letter, its label, indented by its depth, and its
// line counts.
//
export function FileRow({ file, depth, label, isSelected, isOpen, selectedRef, onSelectFile }: IFileRowProps): ReactNode {
    return (
        <ListItemButton
            component="li"
            ref={isSelected ? selectedRef : undefined}
            selected={isSelected}
            aria-current={isOpen ? "true" : undefined}
            aria-label={file.path}
            onClick={() => onSelectFile(file.path)}
            sx={{
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                paddingLeft: `calc(var(--space-3) + var(--space-4) * ${depth})`,
                boxShadow: isOpen ? "inset 2px 0 0 var(--color-accent)" : "none",
                //
                // The path menu shows on the row under the pointer, the selected row and a row
                // with the keyboard in it, so the rest of the list stays quiet. Its space is kept,
                // so the line counts never shift.
                //
                "& .file-path-menu": {
                    opacity: 0,
                    transition: "opacity var(--duration-fast) var(--ease-standard)",
                },
                "&:hover .file-path-menu, &.Mui-selected .file-path-menu, &:focus-within .file-path-menu": {
                    opacity: 1,
                },
            }}
        >
            <span className="min-w-0 flex-1">{label}</span>
            <FilePathMenu path={file.path} />
            <StatusLetter status={file.status} />
            <LineCounts added={file.linesAdded} deleted={file.linesDeleted} />
        </ListItemButton>
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
    // The pane's width, in pixels.
    //
    width: number;

    //
    // How the changed files are listed.
    //
    fileView: FileListView;

    //
    // Called with the way of listing the files the person picks.
    //
    onChangeFileView: (view: FileListView) => void;

    //
    // Called with the path of the changed file the person clicks.
    //
    onSelectFile: (path: string) => void;

    //
    // True while the pane fills the explorer.
    //
    isMaximised: boolean;

    //
    // Called by the pane's maximise button.
    //
    onToggleMaximise: () => void;

    //
    // Called by the close button.
    //
    onClose: () => void;
}

//
// Renders the pane, headed "Commit" and the short hash. The description shows only when the
// message has more than a title, folded to its first lines when it is long, and the author and
// committer show separately only when they differ. The changed files list by full path, by file
// name and folder in two columns, or as a tree of folders, as the switch above them picks. The
// selected file scrolls into view when the keys move the selection.
//
export function CommitDetailsPane({ commit, selectedPath, openPath, isActive, width, isMaximised, onToggleMaximise, fileView, onChangeFileView, onSelectFile, onClose }: ICommitDetailsPaneProps): ReactNode {
    const selectedRef = useRef<HTMLLIElement>(null);
    const isSamePerson = commit.authorName === commit.committerName && commit.authorDate.getTime() === commit.committerDate.getTime();
    const totalAdded = commit.files.reduce((total, file) => total + file.linesAdded, 0);
    const totalDeleted = commit.files.reduce((total, file) => total + file.linesDeleted, 0);

    useEffect(() => {
        scrollSelectionIntoView(selectedRef.current);
    }, [selectedPath]);

    //
    // Returns the parts of a file row's props that come from the pane's selection.
    //
    function rowState(file: IChangedFile): Pick<IFileRowProps, "isSelected" | "isOpen" | "selectedRef" | "onSelectFile"> {
        return {
            isSelected: file.path === selectedPath,
            isOpen: file.path === openPath,
            selectedRef,
            onSelectFile,
        };
    }

    return (
        <Pane
            label="Commit details"
            isMaximised={isMaximised}
            onToggleMaximise={onToggleMaximise}
            width={`${width}px`}
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
                    {commit.description !== "" ? <Description text={commit.description} /> : undefined}
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
                        {commit.files.length > 0 ? (
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={fileView}
                                onChange={(_event, view: FileListView | null) => {
                                    if (view) {
                                        onChangeFileView(view);
                                    }
                                }}
                                aria-label="List files as"
                                sx={{ "& .MuiToggleButton-root": { padding: "var(--space-1) var(--space-2)", fontSize: "var(--icon-sm)" } }}
                            >
                                {fileViews.map(view => (
                                    <Tooltip key={view.value} title={view.label}>
                                        <ToggleButton value={view.value} aria-label={view.label}>
                                            <FontAwesomeIcon icon={view.icon} />
                                        </ToggleButton>
                                    </Tooltip>
                                ))}
                            </ToggleButtonGroup>
                        ) : undefined}
                    </ListSubheader>
                }
            >
                {commit.files.length === 0 ? (
                    <li style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                        No files changed. A merge commit's changes are in its parents.
                    </li>
                ) : fileView === "tree" ? (
                    treeRows(commit.files).map(row =>
                        row.kind === "folder" ? (
                            <li
                                key={`folder-${row.depth}-${row.name}`}
                                className="flex items-center"
                                style={{
                                    gap: "var(--space-2)",
                                    padding: `var(--space-1) var(--space-3) var(--space-1) calc(var(--space-3) + var(--space-4) * ${row.depth})`,
                                    fontSize: "var(--text-sm)",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: "var(--icon-sm)" }} />
                                <span className="min-w-0 truncate">{row.name}</span>
                            </li>
                        ) : (
                            <FileRow key={row.file.path} {...rowState(row.file)} file={row.file} depth={row.depth} label={<span className="truncate">{row.name}</span>} />
                        ),
                    )
                ) : (
                    commit.files.map(file =>
                        fileView === "columns" ? (
                            <FileRow
                                key={file.path}
                                {...rowState(file)}
                                file={file}
                                depth={0}
                                label={
                                    <span className="grid min-w-0" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)", gap: "var(--space-3)" }}>
                                        <span className="truncate">{file.path.slice(file.path.lastIndexOf("/") + 1)}</span>
                                        <span className="truncate" title={file.path} style={{ color: "var(--color-text-muted)", direction: "rtl", textAlign: "left" }}>
                                            <bdi>{file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : ""}</bdi>
                                        </span>
                                    </span>
                                }
                            />
                        ) : (
                            <FileRow key={file.path} {...rowState(file)} file={file} depth={0} label={<FilePath path={file.path} />} />
                        ),
                    )
                )}
            </List>
        </Pane>
    );
}
