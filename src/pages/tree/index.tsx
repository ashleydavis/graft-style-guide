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
import { Section } from "../../components/section";

//
// How a file differs from the last commit, as Git's one-letter status.
//
export type FileStatus = "M" | "A" | "D";

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
// Returns the colour token of a file status.
//
export function statusColour(status: FileStatus): string {
    if (status === "A") {
        return "var(--color-success)";
    }
    if (status === "D") {
        return "var(--color-danger)";
    }
    return "var(--color-warning)";
}

//
// Renders a file's status letter in its status colour.
//
export function StatusLetter({ status }: { status: FileStatus }): ReactNode {
    return (
        <span
            aria-label={{ M: "modified", A: "added", D: "deleted" }[status]}
            style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-bold)",
                color: statusColour(status),
            }}
        >
            {status}
        </span>
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
// Renders the file tree with every folder open and one file selected. Clicking a folder opens
// or closes it, and clicking a file selects it.
//
export function FileTree(): ReactNode {
    const [openFolders, setOpenFolders] = useState(new Set(["/src", "/src/graph"]));
    const [selectedPath, setSelectedPath] = useState("/src/graph/lanes.ts");

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
            <List role="tree" aria-label="Changed files" dense sx={{ padding: "var(--space-1)" }}>
                <TreeRows
                    nodes={fileTree}
                    depth={0}
                    path=""
                    openFolders={openFolders}
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
// Renders the flat list of branches with the checked-out branch selected.
//
export function BranchList(): ReactNode {
    const [selected, setSelected] = useState("main");

    return (
        <Paper variant="outlined" sx={{ maxWidth: "360px" }}>
            <List aria-label="Branches" sx={{ padding: "var(--space-1)" }}>
                {branches.map(branch => (
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
// Renders one section per kind of list, each shown in the themes of the current mode.
//
export function TreePage(): ReactNode {
    return (
        <div>
            <Section title="List" description="A flat list of rows with a second line of detail. The selected row has the selected background and the row under the pointer has the hover background.">
                <BranchList />
            </Section>

            <Section
                title="Tree"
                description="Changed files by folder. Click a folder to open or close it. Each file shows its status letter: modified in the warning colour, added in the success colour and deleted in the danger colour, struck through."
            >
                <FileTree />
            </Section>
        </div>
    );
}
