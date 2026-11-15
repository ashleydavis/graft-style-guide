//
// The commit details pane: the column that opens to the right of the commit pane, with one row for
// the commit itself, its message on one line and its short hash, then the files it changed with
// their line counts. Opening the commit's row shows the full commit pane to the right, with the
// whole message, who wrote and made it and when, its refs, hash and parents.
//

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListSubheader from "@mui/material/ListSubheader";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRightToBracket, faFolderOpen, faFolderTree, faList, faMessage, faTableColumns, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import IconButton from "@mui/material/IconButton";
import { Tip } from "../../../components/tip";
import { RefBadge } from "../../badges";
import { COMMIT_SUMMARY_PATH, FOLDER_PREFIX } from "../explorer-state";
import { refBadge } from "./commit-pane";
import { CopyButton } from "../../../components/copy-button";
import { FilePathMenu } from "../../../components/file-path-menu";
import { StatusLetter } from "../../tree";
import type { IChangedFile, ICommit } from "../data";
import { treeGuides, treeRows, withoutCollapsed, type FileListView, type TreeGuide } from "../file-views";
import { DIRECTORY_KEYS, FolderToggle, TreeGuides } from "../../../components/tree-guides";
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
    { value: "columns", label: "File name and directory", icon: faTableColumns },
    { value: "tree", label: "Tree", icon: faFolderTree },
];

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
    // The row's tree lines, in the tree view.
    //
    guides?: TreeGuide[];

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
export function FileRow({ file, depth, guides = [], label, isSelected, isOpen, selectedRef, onSelectFile }: IFileRowProps): ReactNode {
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
                boxShadow: isOpen ? "inset 2px 0 0 var(--color-select-item)" : "none",
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
            <TreeGuides guides={guides} />
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
    // The folder the tree shows its files from, or empty for the whole commit.
    //
    treeRoot: string;

    //
    // Called with a folder's path to show only the files inside it.
    //
    onDrillIn: (path: string) => void;

    //
    // Called by the back row to go back to the view the folder was opened from.
    //
    onDrillOut: () => void;

    //
    // The paths of the collapsed folders, whose rows inside the tree hides.
    //
    collapsedFolders: ReadonlySet<string>;

    //
    // Called with a folder's path by its collapse button.
    //
    onToggleFolder: (path: string) => void;

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
    // Called by the close button.
    //
    onClose: () => void;
}

//
// Renders the pane, headed "Commit" and the short hash. The commit's row comes first, then the
// changed files, and the keys move through both as one list. The changed files list by full path, by file
// name and folder in two columns, or as a tree of folders, as the switch above them picks. The
// selected file scrolls into view when the keys move the selection.
//
export function CommitDetailsPane({ commit, selectedPath, openPath, isActive, width, isMaximised, onToggleMaximise, isCollapsed, onToggleCollapse, fileView, onChangeFileView, onSelectFile, treeRoot, onDrillIn, onDrillOut, collapsedFolders, onToggleFolder, onClose }: ICommitDetailsPaneProps): ReactNode {
    const selectedRef = useRef<HTMLLIElement>(null);
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
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            railTitle="Commit"
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
            <List aria-label="Commit" sx={{ padding: "var(--space-1) var(--space-1) 0" }}>
                <ListItemButton
                    component="li"
                    ref={selectedPath === COMMIT_SUMMARY_PATH ? selectedRef : undefined}
                    selected={selectedPath === COMMIT_SUMMARY_PATH}
                    aria-current={openPath === COMMIT_SUMMARY_PATH ? "true" : undefined}
                    aria-label="Commit message"
                    onClick={() => onSelectFile(COMMIT_SUMMARY_PATH)}
                    sx={{
                        gap: "var(--space-2)",
                        fontSize: "var(--text-sm)",
                        boxShadow: openPath === COMMIT_SUMMARY_PATH ? "inset 2px 0 0 var(--color-select-item)" : "none",
                    }}
                >
                    <FontAwesomeIcon icon={faMessage} style={{ fontSize: "var(--icon-sm)", color: "var(--color-text-muted)" }} />
                    <span className="min-w-0 flex-1 truncate" style={{ fontWeight: "var(--weight-medium)" }}>
                        {commit.title}
                    </span>
                    <code className="flex-none" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                        {commit.hash.slice(0, 7)}
                    </code>
                </ListItemButton>
            </List>
            <List
                aria-label="Files changed"
                sx={{ padding: "0 var(--space-1) var(--space-2)" }}
                subheader={
                    <ListSubheader component="div" className="flex items-center" sx={{ gap: "var(--space-2)", paddingTop: "var(--space-3)", paddingBottom: "var(--space-2)" }}>
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
                    [
                        treeRoot !== "" ? (
                            <li
                                key="back"
                                className="flex items-center"
                                style={{ gap: "var(--space-2)", padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}
                            >
                                <Tooltip title={<Tip title="Back to the directory above" detail={`Key: ${DIRECTORY_KEYS.up.toUpperCase()} or Escape`} />}>
                                    <IconButton size="small" aria-label="Back to the directory above" onClick={onDrillOut}>
                                        <FontAwesomeIcon icon={faArrowLeft} />
                                    </IconButton>
                                </Tooltip>
                                <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: "var(--icon-sm)" }} />
                                <span className="min-w-0 truncate" style={{ color: "var(--color-text)" }}>
                                    {treeRoot}
                                </span>
                            </li>
                        ) : undefined,
                        ...withoutCollapsed(treeRows(commit.files, treeRoot), collapsedFolders).map((row, index, rows) => {
                        const guides = treeGuides(rows)[index];
                        return row.kind === "folder" ? (
                            <ListItemButton
                                key={`folder-${row.path}`}
                                component="li"
                                aria-label={`Directory ${row.path}`}
                                ref={selectedPath === `${FOLDER_PREFIX}${row.path}` ? selectedRef : undefined}
                                selected={selectedPath === `${FOLDER_PREFIX}${row.path}`}
                                onClick={() => onSelectFile(`${FOLDER_PREFIX}${row.path}`)}
                                onDoubleClick={() => onDrillIn(row.path)}
                                sx={{
                                    gap: "var(--space-2)",
                                    fontSize: "var(--text-sm)",
                                    color: "var(--color-text-muted)",
                                    "& .file-path-menu": { opacity: 0 },
                                    "&:hover .file-path-menu, &.Mui-selected .file-path-menu, &:focus-within .file-path-menu": { opacity: 1 },
                                    "& .folder-open": { display: "none" },
                                    "&:hover .folder-open, &.Mui-selected .folder-open, &:focus-within .folder-open": { display: "inline-flex" },
                                }}
                            >
                                <TreeGuides guides={guides} />
                                <FolderToggle path={row.path} isCollapsed={collapsedFolders.has(row.path)} onToggle={() => onToggleFolder(row.path)} />
                                <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: "var(--icon-sm)", flex: "none" }} />
                                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                                <span className="folder-open">
                                    <Tooltip title={<Tip title="Focus on this directory" detail={`Key: ${DIRECTORY_KEYS.focus.toUpperCase()}, Enter or a double click. ${DIRECTORY_KEYS.up.toUpperCase()} goes back up.`} />}>
                                        <IconButton
                                            size="small"
                                            aria-label={`Focus on ${row.path}`}
                                            onClick={event => {
                                                event.stopPropagation();
                                                onDrillIn(row.path);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faArrowRightToBracket} />
                                        </IconButton>
                                    </Tooltip>
                                </span>
                                <FilePathMenu path={row.path} />
                            </ListItemButton>
                        ) : (
                            <FileRow key={row.file.path} {...rowState(row.file)} file={row.file} depth={0} guides={guides} label={<span className="truncate">{row.name}</span>} />
                        );
                    }),
                    ]
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

//
// What the full commit pane shows and reports.
//
export interface ICommitInfoPaneProps {
    //
    // The open commit.
    //
    commit: ICommit;

    //
    // True while the pane is the one the keys act on.
    //
    isActive: boolean;

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
    // Called by the close button.
    //
    onClose: () => void;
}

//
// Renders the full commit pane, which opens to the right of the commit details pane in place of a
// file's diff and grows to fill the width left, as the diff does: the commit's title and its whole
// description, each with a copy button, its refs, who wrote and made it and when, showing the
// committer apart only when they differ from the author, its hash with a copy button and its
// parents.
//
export function CommitInfoPane({ commit, isActive, isMaximised, onToggleMaximise, isCollapsed, onToggleCollapse, onClose }: ICommitInfoPaneProps): ReactNode {
    const isSamePerson = commit.authorName === commit.committerName && commit.authorDate.getTime() === commit.committerDate.getTime();
    return (
        <div style={isCollapsed ? { flex: "none", height: "100%" } : { flex: "1 1 600px", minWidth: "min(360px, calc(100vw - var(--space-8) * 2))", height: "100%" }}>
        <Pane
            label="Full commit details"
            width="100%"
            fillsHeight
            isActive={isActive}
            isMaximised={isMaximised}
            onToggleMaximise={onToggleMaximise}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            railTitle="Commit details"
            title="Commit details"
            onClose={onClose}
        >
            <div className="flex flex-col" style={{ gap: "var(--space-4)", padding: "var(--space-4)" }}>
                <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                    <div className="flex items-start" style={{ gap: "var(--space-2)" }}>
                        <h3 className="min-w-0 flex-1" style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", lineHeight: "var(--leading-tight)" }}>
                            {commit.title}
                        </h3>
                        <CopyButton text={commit.title} label="Copy summary" />
                    </div>
                    {commit.description !== "" ? (
                        <div className="flex items-start" style={{ gap: "var(--space-2)" }}>
                            <p className="min-w-0 flex-1" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", whiteSpace: "pre-wrap" }}>
                                {commit.description}
                            </p>
                            <CopyButton text={commit.description} label="Copy description" />
                        </div>
                    ) : undefined}
                </div>
                <dl className="grid items-baseline" style={{ gridTemplateColumns: "auto minmax(0, 1fr)", gap: "var(--space-2) var(--space-4)" }}>
                    {commit.refs.length > 0 ? (
                        <Fact label={commit.refs.length === 1 ? "Ref" : "Refs"}>
                            <span className="flex flex-wrap" style={{ gap: "var(--space-1)" }}>
                                {commit.refs.map(gitRef => {
                                    const badge = refBadge(gitRef);
                                    return <RefBadge key={gitRef} kind={badge.kind} name={badge.name} />;
                                })}
                            </span>
                        </Fact>
                    ) : undefined}
                    <Fact label={isSamePerson ? "Author" : "Authored"}>
                        <PersonAndDate name={commit.authorName} email={commit.authorEmail} date={commit.authorDate} />
                    </Fact>
                    {isSamePerson ? undefined : (
                        <Fact label="Committed">
                            <PersonAndDate name={commit.committerName} email={commit.committerEmail} date={commit.committerDate} />
                        </Fact>
                    )}
                    <Fact label="Hash">
                        <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
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
        </Pane>
        </div>
    );
}
