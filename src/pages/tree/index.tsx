//
// The list and tree page: a flat list of branches and a file tree with directories that open and
// close, built from MUI's List parts, with the hover, selected and focus states of each row.
//

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import Tooltip from "@mui/material/Tooltip";
import { FilePathMenu } from "../../components/file-path-menu";
import { FileIcon } from "../../components/file-icon";
import { Tip } from "../../components/tip";
import { Section } from "../../components/section";
import { FilterBox, matchesSearch } from "../../components/search-box";
import { directoryKeyAction } from "../../components/tree-guides";
import { collapsedAfterAllKey, TreeBar, TreeDirectoryRow, TreeFileRow } from "../../components/tree-rows";
import { parentDirectory, treeGuides, treeRows, withoutCollapsed } from "../commit-explorer/file-views";
import { PinnableTooltip } from "../../components/pinnable-tooltip";
import { FileTip } from "../../components/file-tip";

//
// How a file differs from the last commit, as Git's one-letter status.
//
export type FileStatus = "M" | "A" | "D" | "R" | "C" | "T" | "U";

//
// One file or directory in the tree.
//
export interface ITreeNode {
    //
    // The file or directory name.
    //
    name: string;

    //
    // The directory's contents, absent for a file.
    //
    children?: ITreeNode[];

    //
    // The file's status, absent for an unchanged file or a directory.
    //
    status?: FileStatus;
}

//
// The example tree of changed files.
//
export const fileTree: ITreeNode[] = [
    {
        name: "src",
        children: [
            {
                name: "graph",
                children: [
                    {
                        name: "lanes.ts",
                        status: "M",
                    },
                    {
                        name: "curves.ts",
                        status: "A",
                    },
                ],
            },
            {
                name: "commit-list.tsx",
                status: "M",
            },
            {
                name: "old-graph.ts",
                status: "D",
            },
        ],
    },
    {
        name: "README.md",
        status: "M",
    },
];

//
// Returns the colour token of a file status: success for added, danger for deleted and for a
// conflict, info for renamed and copied and warning for the rest.
//
export function statusColour(status: FileStatus): string {
    if (status === "A") {
        return "var(--color-success)";
    }
    if (status === "D" || status === "U") {
        return "var(--color-danger)";
    }
    if (status === "R" || status === "C") {
        return "var(--color-info)";
    }
    return "var(--color-warning)";
}

//
// The name and meaning of each file status, for the status letter's tooltip and the file tooltip.
//
export const statusTips: Record<FileStatus, { title: string; detail: string }> = {
    M: { title: "Modified", detail: "The file's lines changed." },
    A: { title: "Added", detail: "The file is new." },
    D: { title: "Deleted", detail: "The file was removed." },
    R: { title: "Renamed", detail: "The file moved to a new path." },
    C: { title: "Copied", detail: "The file is a copy of another file." },
    T: { title: "Type changed", detail: "The file changed kind, such as to a symbolic link." },
    U: { title: "Conflict", detail: "The file has a merge conflict." },
};

//
// Renders a file's status letter in its status colour inside a thin border, like the line counts
// beside it, with space to its right and a tooltip naming the change.
//
export function StatusLetter({ status }: { status: FileStatus }): ReactNode {
    return (
        <Tooltip title={<Tip title={statusTips[status].title} detail={statusTips[status].detail} />}>
            <span
                aria-label={statusTips[status].title}
                className="inline-flex flex-none items-center justify-center"
                style={{
                    minWidth: "calc(var(--space-4) + var(--space-2))",
                    marginRight: "var(--space-1)",
                    padding: "calc(var(--space-1) * 0.75) var(--space-1) 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-bold)",
                    lineHeight: "var(--leading-normal)",
                    color: statusColour(status),
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "default",
                }}
            >
                {status}
            </span>
        </Tooltip>
    );
}

//
// One file of the tree, as the shared tree rows draw it: its path from the top of the tree and its
// status.
//
export interface ITreeFile {
    //
    // The file's path, its directories joined with "/".
    //
    path: string;

    //
    // The file's change, or undefined for an unchanged file.
    //
    status: FileStatus | undefined;
}

//
// Returns the files of `nodes` with their full paths, so the shared tree rows can lay them out by
// directory. `path` is the directory `nodes` sit in.
//
export function treeFiles(nodes: ITreeNode[], path: string): ITreeFile[] {
    return nodes.flatMap(node => {
        const nodePath = path === "" ? node.name : `${path}/${node.name}`;
        if (node.children === undefined) {
            return [
                {
                    path: nodePath,
                    status: node.status,
                },
            ];
        }
        return treeFiles(node.children, nodePath);
    });
}

//
// Returns the row the keys move to from `selected`, `step` rows up or down among `paths`, staying
// on the first or last row at the ends. With nothing selected the first row is chosen.
//
export function rowAfterMove(paths: string[], selected: string, step: number): string | undefined {
    const index = paths.indexOf(selected);
    if (index < 0) {
        return paths[0];
    }
    return paths[Math.min(Math.max(index + step, 0), paths.length - 1)];
}

//
// Renders the file tree with the shared tree rows under a filter box, with every directory open
// and one file selected. The bar above the tree expands or collapses every directory, and goes
// back up from a directory the tree is focused on. A click selects a row, and a directory opens
// and closes with its +/- button. With the keys in the tree, Up and Down move the selection, E or
// Space opens or closes the selected directory, F focuses the tree on it, U goes back up and A
// expands or collapses every directory. Typing in the filter box keeps only the files whose path
// holds the text and the directories that hold them, every one of them open.
//
export function FileTree(): ReactNode {
    const [collapsedDirectories, setCollapsedDirectories] = useState<ReadonlySet<string>>(new Set());
    const [selectedPath, setSelectedPath] = useState("src/graph/lanes.ts");
    const [treeRoot, setTreeRoot] = useState("");
    const [filter, setFilter] = useState("");
    const listRef = useRef<HTMLUListElement>(null);
    const isFiltering = filter.trim() !== "";
    const shownFiles = treeFiles(fileTree, "").filter(file => matchesSearch(file.path, filter));
    const allRows = treeRows(shownFiles, treeRoot);
    const directories = allRows.flatMap(row => (row.kind === "directory" ? [row.path] : []));
    const rows = withoutCollapsed(allRows, isFiltering ? new Set() : collapsedDirectories);
    const guides = treeGuides(rows);

    //
    // Collapses the directory `path`, hiding the rows inside it, or expands it again.
    //
    function toggleDirectory(path: string): void {
        setCollapsedDirectories(current => {
            const next = new Set(current);
            if (next.has(path)) {
                next.delete(path);
            }
            else {
                next.add(path);
            }
            return next;
        });
    }

    //
    // Shows only the directory `path` and what is inside it. The keys move to the tree, as the
    // directory's row that held them no longer shows.
    //
    function focusDirectory(path: string): void {
        listRef.current?.focus();
        setTreeRoot(path);
        setSelectedPath("");
    }

    //
    // Goes back from the directory the tree is focused on to the directory above, with the
    // directory it was focused on selected.
    //
    function focusParent(): void {
        if (treeRoot === "") {
            return;
        }
        listRef.current?.focus();
        setSelectedPath(treeRoot);
        setTreeRoot(parentDirectory(treeRoot));
    }

    //
    // Moves the selection with Up and Down and acts on the selected directory with the directory
    // keys.
    //
    function onKeyDown(event: KeyboardEvent): void {
        if (event.target instanceof HTMLInputElement) {
            return;
        }
        if ((event.key === "ArrowUp" || event.key === "ArrowDown") && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            const paths = rows.map(row => (row.kind === "directory" ? row.path : row.file.path));
            setSelectedPath(rowAfterMove(paths, selectedPath, event.key === "ArrowUp" ? -1 : 1) ?? "");
            return;
        }
        const action = directoryKeyAction(event);
        if (!action) {
            return;
        }
        event.preventDefault();
        const isDirectorySelected = directories.includes(selectedPath);
        if (action === "up") {
            focusParent();
        }
        else if (action === "all") {
            setCollapsedDirectories(collapsedAfterAllKey(directories, collapsedDirectories));
        }
        else if (isDirectorySelected && action === "toggle") {
            toggleDirectory(selectedPath);
        }
        else if (isDirectorySelected && action === "focus") {
            focusDirectory(selectedPath);
        }
    }

    return (
        <Paper variant="outlined" sx={{ maxWidth: "360px" }}>
            <div style={{ padding: "var(--space-2)", borderBottom: "1px solid var(--color-border)" }}>
                <FilterBox value={filter} onChange={setFilter} label="Filter the files" placeholder="Filter by path" />
            </div>
            {rows.length === 0 ? <p style={{ padding: "var(--space-3)", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No files match the filter.</p> : undefined}
            <List ref={listRef} aria-label="Changed files" tabIndex={0} onKeyDown={onKeyDown} sx={{ padding: "0 0 var(--space-1)", outline: "none", "&:focus-visible": { boxShadow: "inset 0 0 0 var(--focus-ring-width) var(--color-focus)" } }}>
                <TreeBar focusedPath={treeRoot} onBack={focusParent} onExpandAll={() => setCollapsedDirectories(new Set())} onCollapseAll={() => setCollapsedDirectories(new Set(directories))} />
                {rows.map((row, index) => {
                    if (row.kind === "directory") {
                        return (
                            <TreeDirectoryRow
                                key={`directory-${row.path}`}
                                path={row.path}
                                name={row.name}
                                guides={guides[index]}
                                isCollapsed={!isFiltering && collapsedDirectories.has(row.path)}
                                isSelected={row.path === selectedPath}
                                isHighlighted={false}
                                isOpen={false}
                                icon={undefined}
                                tint={undefined}
                                isDiscarded={false}
                                lead={undefined}
                                menu={<FilePathMenu path={row.path} kind="directory" />}
                                trail={undefined}
                                rowRef={undefined}
                                onSelect={() => setSelectedPath(row.path)}
                                onToggle={isFiltering ? undefined : () => toggleDirectory(row.path)}
                                onFocus={() => focusDirectory(row.path)}
                            />
                        );
                    }
                    const status = row.file.status;
                    return (
                        <TreeFileRow
                            key={row.file.path}
                            path={row.file.path}
                            label={<span style={{ textDecoration: status === "D" ? "line-through" : undefined }}>{row.name}</span>}
                            icon={<FileIcon path={row.file.path} />}
                            guides={guides[index]}
                            isSelected={row.file.path === selectedPath}
                            isOpen={false}
                            isDiscarded={false}
                            lead={undefined}
                            extra={undefined}
                            wrapLabel={
                                status
                                    ? label => (
                                          <PinnableTooltip enterDelayMs={500} maxWidth="calc(var(--space-8) * 12)" tip={pinButton => <FileTip file={{ path: row.file.path, status }} pinButton={pinButton} />}>
                                              {label}
                                          </PinnableTooltip>
                                      )
                                    : undefined
                            }
                            menu={<FilePathMenu path={row.file.path} />}
                            trail={undefined}
                            rowRef={undefined}
                            onSelect={() => setSelectedPath(row.file.path)}
                        />
                    );
                })}
            </List>
        </Paper>
    );
}

//
// The branches of the flat list example.
//
const branches = [
    {
        name: "main",
        detail: "Up to date",
    },
    {
        name: "feature/commit-graph",
        detail: "2 ahead, 1 behind",
    },
    {
        name: "fix/merge-base",
        detail: "Merged",
    },
];

//
// Renders the flat list of branches with the checked-out branch selected, under a filter box that
// keeps only the branches whose name or detail holds the typed text.
//
export function BranchList(): ReactNode {
    const [selected, setSelected] = useState("main");
    const [filter, setFilter] = useState("");
    const shown = branches.filter(branch => matchesSearch(branch.name, filter) || matchesSearch(branch.detail, filter));

    return (
        <Paper variant="outlined" sx={{ maxWidth: "360px" }}>
            <div style={{ padding: "var(--space-2)", borderBottom: "1px solid var(--color-border)" }}>
                <FilterBox value={filter} onChange={setFilter} label="Filter the branches" placeholder="Filter by name" />
            </div>
            {shown.length === 0 ? <p style={{ padding: "var(--space-3)", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No branches match the filter.</p> : undefined}
            <List aria-label="Branches" sx={{ padding: "var(--space-1)" }}>
                {shown.map(branch => (
                    <ListItemButton key={branch.name} selected={branch.name === selected} onClick={() => setSelected(branch.name)}>
                        <ListItemIcon>
                            <FontAwesomeIcon icon={faCodeBranch} />
                        </ListItemIcon>
                        <ListItemText
                            primary={branch.name}
                            secondary={branch.detail}
                            slotProps={{
                                primary: {
                                    sx: {
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "var(--text-sm)",
                                    },
                                },
                            }}
                        />
                    </ListItemButton>
                ))}
            </List>
        </Paper>
    );
}

//
// Renders the list example, shown in the themes of the current mode.
//
export function ListPage(): ReactNode {
    return (
        <div>
            <Section title="List" description="Rows with a second line of detail, under a filter box.">
                <BranchList />
            </Section>
        </div>
    );
}

//
// Renders the tree example, shown in the themes of the current mode.
//
export function TreePage(): ReactNode {
    return (
        <div>
            <Section
                title="Tree"
                description="Changed files by directory, under a filter box."
            >
                <FileTree />
            </Section>
        </div>
    );
}
