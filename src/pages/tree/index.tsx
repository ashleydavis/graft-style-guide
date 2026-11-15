//
// The list and tree page: a flat list of branches and a file tree with folders that open and
// close, built from MUI's List parts, with the hover, selected and focus states of each row.
//

import { useState, type ReactNode } from "react";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faChevronRight,
    faCodeBranch,
    faFile,
    faFolder,
    faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import Tooltip from "@mui/material/Tooltip";
import { FilePathMenu } from "../../components/file-path-menu";
import { Tip } from "../../components/tip";
import { Section } from "../../components/section";
import { FilterBox, matchesSearch } from "../../components/search-box";

//
// How a file differs from the last commit, as Git's one-letter status.
//
export type FileStatus = "M" | "A" | "D" | "R";

//
// One file or folder in the tree.
//
export interface ITreeNode {
    //
    // The file or folder name.
    //
    name: string;

    //
    // The folder's contents, absent for a file.
    //
    children?: ITreeNode[];

    //
    // The file's status, absent for an unchanged file or a folder.
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
// Returns the colour token of a file status: success for added, danger for deleted, info for
// renamed and warning for modified.
//
export function statusColour(status: FileStatus): string {
    if (status === "A") {
        return "var(--color-success)";
    }
    if (status === "D") {
        return "var(--color-danger)";
    }
    if (status === "R") {
        return "var(--color-info)";
    }
    return "var(--color-warning)";
}

//
// The name and meaning of each file status, for the status letter's tooltip.
//
const statusTips: Record<FileStatus, { title: string; detail: string }> = {
    M: { title: "Modified", detail: "The file's lines changed." },
    A: { title: "Added", detail: "The file is new." },
    D: { title: "Deleted", detail: "The file was removed." },
    R: { title: "Renamed", detail: "The file moved to a new path." },
};

//
// Renders a file's status letter in its status colour inside a thin border, like the line counts
// beside it, with space to its right and a tooltip naming the change.
//
export function StatusLetter({ status }: { status: FileStatus }): ReactNode {
    return (
        <Tooltip title={<Tip title={statusTips[status].title} detail={statusTips[status].detail} />}>
            <span
                aria-label={{ M: "modified", A: "added", D: "deleted", R: "renamed" }[status]}
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
// Renders the rows of `nodes` at `depth` and, for each open folder, its contents one level in.
// `path` is the folder path of `nodes`, so each row has a unique id.
//
export function TreeRows({
    nodes,
    depth,
    path,
    openFolders,
    selectedPath,
    onToggle,
    onSelect,
}: {
    nodes: ITreeNode[];
    depth: number;
    path: string;
    openFolders: Set<string>;
    selectedPath: string;
    onToggle: (path: string) => void;
    onSelect: (path: string) => void;
}): ReactNode {
    return nodes.map(node => {
        const nodePath = `${path}/${node.name}`;
        const isFolder = node.children !== undefined;
        const isOpen = openFolders.has(nodePath);
        return (
            <div key={nodePath} role="none">
                <ListItemButton
                    role="treeitem"
                    aria-expanded={isFolder ? isOpen : undefined}
                    aria-selected={nodePath === selectedPath}
                    selected={nodePath === selectedPath}
                    onClick={() => (isFolder ? onToggle(nodePath) : onSelect(nodePath))}
                    sx={{ paddingLeft: `calc(var(--space-3) + var(--space-4) * ${depth})`, gap: "var(--space-1)" }}
                >
                    <span style={{ width: "var(--space-3)", color: "var(--color-text-muted)", fontSize: "var(--icon-sm)" }}>
                        {isFolder ? <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} /> : undefined}
                    </span>
                    <ListItemIcon sx={{ minWidth: "var(--space-4)" }}>
                        <FontAwesomeIcon icon={isFolder ? (isOpen ? faFolderOpen : faFolder) : faFile} />
                    </ListItemIcon>
                    <ListItemText
                        primary={node.name}
                        slotProps={{
                            primary: {
                                sx: {
                                    textDecoration: node.status === "D" ? "line-through" : undefined,
                                },
                            },
                        }}
                    />
                    {isFolder ? undefined : <FilePathMenu path={nodePath.slice(1)} />}
                    {node.status ? <StatusLetter status={node.status} /> : undefined}
                </ListItemButton>
                {isFolder && isOpen ? (
                    <div role="group">
                        <TreeRows
                            nodes={node.children ?? []}
                            depth={depth + 1}
                            path={nodePath}
                            openFolders={openFolders}
                            selectedPath={selectedPath}
                            onToggle={onToggle}
                            onSelect={onSelect}
                        />
                    </div>
                ) : undefined}
            </div>
        );
    });
}

//
// Returns `nodes` with only the files whose path from the top, under `path`, holds `query`, and the
// directories that hold them. Every node stays for an empty query.
//
function filteredTree(nodes: ITreeNode[], query: string, path = ""): ITreeNode[] {
    if (query.trim() === "") {
        return nodes;
    }
    return nodes.flatMap(node => {
        const nodePath = `${path}/${node.name}`;
        if (node.children === undefined) {
            return matchesSearch(nodePath.slice(1), query) ? [node] : [];
        }
        const children = filteredTree(node.children, query, nodePath);
        return children.length > 0 ? [{ ...node, children }] : [];
    });
}

//
// Returns the paths of every directory in `nodes`, under `path`.
//
function directoryPaths(nodes: ITreeNode[], path = ""): string[] {
    return nodes.flatMap(node => (node.children === undefined ? [] : [`${path}/${node.name}`, ...directoryPaths(node.children, `${path}/${node.name}`)]));
}

//
// Renders the file tree with every folder open and one file selected, under a filter box. Clicking
// a folder opens or closes it, and clicking a file selects it. Typing in the filter box keeps only
// the files whose path holds the text and the directories that hold them, every one of them open.
//
export function FileTree(): ReactNode {
    const [openFolders, setOpenFolders] = useState(new Set(["/src", "/src/graph"]));
    const [selectedPath, setSelectedPath] = useState("/src/graph/lanes.ts");
    const [filter, setFilter] = useState("");
    const isFiltering = filter.trim() !== "";
    const shownTree = filteredTree(fileTree, filter);

    function toggle(path: string): void {
        const next = new Set(openFolders);
        if (next.has(path)) {
            next.delete(path);
        }
        else {
            next.add(path);
        }
        setOpenFolders(next);
    }

    return (
        <Paper variant="outlined" sx={{ maxWidth: "360px" }}>
            <div style={{ padding: "var(--space-2)", borderBottom: "1px solid var(--color-border)" }}>
                <FilterBox value={filter} onChange={setFilter} label="Filter the files" placeholder="Filter by path" />
            </div>
            {shownTree.length === 0 ? <p style={{ padding: "var(--space-3)", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No files match the filter.</p> : undefined}
            <List role="tree" aria-label="Changed files" dense sx={{ padding: "var(--space-1)" }}>
                <TreeRows
                    nodes={shownTree}
                    depth={0}
                    path=""
                    openFolders={isFiltering ? new Set(directoryPaths(shownTree)) : openFolders}
                    selectedPath={selectedPath}
                    onToggle={toggle}
                    onSelect={setSelectedPath}
                />
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
