//
// The commit details pane: the column that opens to the right of the commit pane, with one row for
// the commit itself, its message on one line and its short hash, then the files it changed with
// their line counts. Opening the commit's row shows the full commit pane to the right, with the
// whole message, who wrote and made it and when, its refs, hash and parents.
//

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListSubheader from "@mui/material/ListSubheader";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeCommit, faFolderTree, faHardDrive, faList, faMagnifyingGlass, faMessage, faSliders, faTableColumns, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { RefBadge } from "../../badges";
import { COMMIT_SUMMARY_PATH, DIRECTORY_PREFIX } from "../explorer-state";
import { refBadge } from "./commit-pane";
import { CopyButton } from "../../../components/copy-button";
import { FilePathMenu } from "../../../components/file-path-menu";
import { repoRoot, type CommitDiffKind, type IChangedFile, type ICommit } from "../data";
import { treeGuides, treeRows, withoutCollapsed, type FileListView, type TreeGuide } from "../file-views";
import { FileIcon } from "../../../components/file-icon";
import { matchesSearch, type ISearchMode } from "../../../components/search-box";
import { ExplorerSearchBox } from "./explorer-search";
import { TreeBar, TreeDirectoryRow, TreeFileRow } from "../../../components/tree-rows";
import { FilePath } from "./file-path";
import { Pane } from "./pane";
import { DIFF_PANE_WIDTH_MIN } from "./file-pane";
import { OptionRow } from "../../diff/components/file-diff-card";
import { Tip } from "../../../components/tip";
import { scrollSelectionIntoView } from "../scroll";
import { PinnableTooltip } from "../../../components/pinnable-tooltip";
import { FileTip } from "../../../components/file-tip";
import { longDate } from "../dates";

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
    // The row's tree lines, in the tree view.
    //
    guides?: TreeGuide[];

    //
    // What the row shows between the file icon and the path menu.
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
// Renders one changed file's row with the shared tree row: its icon, its label, the path menu, its
// status letter and its line counts.
//
export function FileRow({ file, guides = [], label, isSelected, isOpen, selectedRef, onSelectFile }: IFileRowProps): ReactNode {
    return (
        <TreeFileRow
            path={file.path}
            label={label}
            icon={<FileIcon path={file.path} />}
            guides={guides}
            isSelected={isSelected}
            isOpen={isOpen}
            isDiscarded={false}
            lead={undefined}
            extra={file.isUntracked ? <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>untracked</span> : undefined}
            wrapLabel={label => (
                <PinnableTooltip enterDelayMs={500} maxWidth="calc(var(--space-8) * 12)" tip={pinButton => <FileTip file={{ ...file, isBinary: file.binary !== undefined }} pinButton={pinButton} />}>
                    {label}
                </PinnableTooltip>
            )}
            menu={<FilePathMenu path={file.path} repoRoot={repoRoot} kind="file" />}
            trail={undefined}
            rowRef={isSelected ? selectedRef : undefined}
            onSelect={() => onSelectFile(file.path)}
        />
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
    // The commit's files, compared with its parent or with the files on disk as `diffKind` says.
    //
    files: IChangedFile[];

    //
    // What the files are compared with.
    //
    diffKind: CommitDiffKind;

    //
    // Called with what the files are to be compared with, picked in the options dropdown.
    //
    onChangeDiffKind: (kind: CommitDiffKind) => void;

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
    // The directory the tree shows its files from, or empty for the whole commit.
    //
    treeRoot: string;

    //
    // Called with a directory's path to show only the files inside it.
    //
    onDrillIn: (path: string) => void;

    //
    // Called by the back button to go back to the view the directory was focused from.
    //
    onDrillOut: () => void;

    //
    // The paths of the collapsed directories, whose rows inside the tree hides.
    //
    collapsedDirectories: ReadonlySet<string>;

    //
    // Called with a directory's path by its +/- button.
    //
    onToggleDirectory: (path: string) => void;

    //
    // Called by the expand all button above the tree.
    //
    onExpandAll: () => void;

    //
    // Called by the collapse all button above the tree.
    //
    onCollapseAll: () => void;

    //
    // The file list's search mode, whose query keeps only the files whose path holds it.
    //
    fileSearch: ISearchMode;

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
// Renders the commit details pane's options button and, while it is open, its dropdown with how the
// files are listed, laid out like the diff card's options: what the option does on the left and
// its control on the right.
//
export function FileListOptions({ fileView, onChangeFileView, diffKind, onChangeDiffKind }: { fileView: FileListView; onChangeFileView: (view: FileListView) => void; diffKind: CommitDiffKind; onChangeDiffKind: (kind: CommitDiffKind) => void }): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    return (
        <>
            <Tooltip title={<Tip title="Commit options" detail="What the files are compared with and how they are listed." />}>
                <IconButton size="small" aria-label="Commit options" aria-haspopup="dialog" aria-expanded={anchor !== undefined} onClick={event => setAnchor(event.currentTarget)}>
                    <FontAwesomeIcon icon={faSliders} />
                </IconButton>
            </Tooltip>
            <Popover
                open={anchor !== undefined}
                anchorEl={anchor}
                onClose={() => setAnchor(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { role: "dialog", "aria-label": "Commit options" } }}
            >
                <div className="flex flex-col" style={{ gap: "var(--space-3)", padding: "var(--space-4)", width: "min(calc(var(--space-8) * 11), calc(100vw - var(--space-8)))" }}>
                    <OptionRow
                        label="Compare with"
                        detail="The commit's parent, for the changes the commit made, or the files on disk now."
                        control={
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={diffKind}
                                onChange={(_event, kind: CommitDiffKind | null) => {
                                    if (kind) {
                                        onChangeDiffKind(kind);
                                    }
                                }}
                                aria-label="Compare with"
                                sx={{ "& .MuiToggleButton-root": { padding: "var(--space-1) var(--space-2)", fontSize: "var(--icon-sm)" } }}
                            >
                                <Tooltip title={<Tip title="Changes made by this commit" detail="Compares the commit with its parent." />}>
                                    <ToggleButton value="commit" aria-label="Changes made by this commit">
                                        <FontAwesomeIcon icon={faCodeCommit} />
                                    </ToggleButton>
                                </Tooltip>
                                <Tooltip title={<Tip title="Changes from this commit to the files on disk" detail="Compares the commit with the working tree as it is now." />}>
                                    <ToggleButton value="commitToDisk" aria-label="Changes from this commit to the files on disk">
                                        <FontAwesomeIcon icon={faHardDrive} />
                                    </ToggleButton>
                                </Tooltip>
                            </ToggleButtonGroup>
                        }
                    />
                    <OptionRow
                        label="List files as"
                        detail="Full paths, file names beside their directories, or a tree of directories."
                        control={
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
                        }
                    />
                </div>
            </Popover>
        </>
    );
}

//
// Renders the pane, headed "Commit" and the short hash, with the file search and options buttons
// in its header. The commit's row comes first, then the changed files, and the keys move through
// both as one list. The changed files list by full path, by file name and directory in two
// columns, or as a tree of directories, as the options dropdown picks. The selected file scrolls
// into view when the keys move the selection.
//
export function CommitDetailsPane({ commit, files: allFiles, diffKind, onChangeDiffKind, selectedPath, openPath, isActive, width, isMaximised, onToggleMaximise, isCollapsed, onToggleCollapse, fileView, onChangeFileView, onSelectFile, treeRoot, onDrillIn, onDrillOut, collapsedDirectories, onToggleDirectory, onExpandAll, onCollapseAll, fileSearch, onClose }: ICommitDetailsPaneProps): ReactNode {
    const files = allFiles.filter(file => matchesSearch(file.path, fileSearch.query));
    const selectedRef = useRef<HTMLLIElement>(null);

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
            headerExtra={
                <>
                    <Tooltip title={<Tip title="Search the files" detail="Keys: Ctrl+F" />}>
                        <IconButton size="small" aria-label="Search the files" aria-pressed={fileSearch.isOpen} onClick={() => (fileSearch.isOpen ? fileSearch.close() : fileSearch.open())}>
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </IconButton>
                    </Tooltip>
                    <FileListOptions fileView={fileView} onChangeFileView={onChangeFileView} diffKind={diffKind} onChangeDiffKind={onChangeDiffKind} />
                </>
            }
            toolbar={fileSearch.isOpen ? <ExplorerSearchBox search={fileSearch} label="Search the files" placeholder="Search the files" closeLabel="Close the file search" result={undefined} /> : undefined}
            onClose={onClose}
        >
            <List aria-label="Commit" sx={{ padding: "var(--space-1) var(--space-1) 0" }}>
                <ListItemButton
                    component="li"
                    ref={selectedPath === COMMIT_SUMMARY_PATH ? selectedRef : undefined}
                    selected={selectedPath === COMMIT_SUMMARY_PATH}
                    aria-current={openPath === COMMIT_SUMMARY_PATH ? "true" : undefined}
                    aria-label="Commit details"
                    onClick={() => onSelectFile(COMMIT_SUMMARY_PATH)}
                    sx={{
                        gap: "var(--space-2)",
                        fontSize: "var(--text-sm)",
                        boxShadow: openPath === COMMIT_SUMMARY_PATH ? "inset 2px 0 0 var(--color-select-item)" : "none",
                    }}
                >
                    <FontAwesomeIcon icon={faMessage} style={{ fontSize: "var(--icon-sm)", color: "var(--color-text-muted)" }} />
                    <span className="min-w-0 flex-1 truncate" style={{ fontWeight: "var(--weight-medium)" }}>
                        Commit details
                    </span>
                </ListItemButton>
            </List>
            <List
                aria-label="Files changed"
                sx={{ padding: "0 var(--space-1) var(--space-2)" }}
                subheader={
                    <ListSubheader component="div" className="flex items-center" sx={{ gap: "var(--space-2)", paddingTop: "var(--space-3)", paddingBottom: "var(--space-2)" }}>
                        <span className="flex-1">Files changed ({files.length})</span>
                    </ListSubheader>
                }
            >
                {files.length === 0 ? (
                    <li style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                        {fileSearch.query.trim() !== "" ? "No changed file matches the search." : diffKind === "commit" ? "No files changed. A merge commit's changes are in its parents." : "The files on disk are the same as in this commit."}
                    </li>
                ) : fileView === "tree" ? (
                    [
                        <TreeBar key="bar" focusedPath={treeRoot} onBack={onDrillOut} onExpandAll={onExpandAll} onCollapseAll={onCollapseAll} hasAllButtons />,
                        ...withoutCollapsed(treeRows(files, treeRoot), collapsedDirectories).map((row, index, rows) => {
                            const guides = treeGuides(rows)[index];
                            if (row.kind === "directory") {
                                const rowPath = `${DIRECTORY_PREFIX}${row.path}`;
                                return (
                                    <TreeDirectoryRow
                                        key={`directory-${row.path}`}
                                        path={row.path}
                                        name={row.name}
                                        guides={guides}
                                        isCollapsed={collapsedDirectories.has(row.path)}
                                        isSelected={selectedPath === rowPath}
                                        isHighlighted={false}
                                        isOpen={openPath === rowPath}
                                        icon={undefined}
                                        tint={undefined}
                                        isDiscarded={false}
                                        lead={undefined}
                                        menu={<FilePathMenu path={row.path} repoRoot={repoRoot} kind="directory" />}
                                        trail={undefined}
                                        rowRef={selectedPath === rowPath ? selectedRef : undefined}
                                        onSelect={() => onSelectFile(rowPath)}
                                        onToggle={() => onToggleDirectory(row.path)}
                                        onFocus={() => onDrillIn(row.path)}
                                    />
                                );
                            }
                            return <FileRow key={row.file.path} {...rowState(row.file)} file={row.file} guides={guides} label={row.name} />;
                        }),
                    ]
                ) : (
                    files.map(file =>
                        fileView === "columns" ? (
                            <FileRow
                                key={file.path}
                                {...rowState(file)}
                                file={file}
                               
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
                            <FileRow key={file.path} {...rowState(file)} file={file} label={<FilePath path={file.path} />} />
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
        <div style={isCollapsed ? { flex: "none", height: "100%" } : { flex: "1 1 0%", minWidth: DIFF_PANE_WIDTH_MIN, height: "100%" }}>
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
