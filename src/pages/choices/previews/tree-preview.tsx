//
// The preview for the tree guide choice: a file tree three levels deep in the style of each
// option. A indents with no lines, as the theme draws it now, and B draws a guide line down
// each open directory's contents.
//

import type { ReactNode } from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faFile, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import { fileTree, StatusLetter, type ITreeNode } from "../../tree";

//
// Renders `nodes` and the contents of every directory below them. With `showGuides` each
// directory's contents sit beside a guide line in the border colour.
//
export function GuideRows({ nodes, showGuides }: { nodes: ITreeNode[]; showGuides: boolean }): ReactNode {
    return nodes.map(node => (
        <div key={node.name}>
            <ListItemButton sx={{ gap: "var(--space-1)", paddingLeft: "var(--space-2)" }}>
                <span style={{ width: "var(--space-3)", color: "var(--color-text-muted)", fontSize: "var(--icon-sm)" }}>
                    {node.children ? <FontAwesomeIcon icon={faChevronDown} /> : undefined}
                </span>
                <ListItemIcon sx={{ minWidth: "var(--space-4)" }}>
                    <FontAwesomeIcon icon={node.children ? faFolderOpen : faFile} />
                </ListItemIcon>
                <ListItemText primary={node.name} />
                {node.status ? <StatusLetter status={node.status} /> : undefined}
            </ListItemButton>
            {node.children ? (
                <div
                    style={{
                        marginLeft: "calc(var(--space-2) + var(--space-3) / 2)",
                        paddingLeft: "calc(var(--space-4) - var(--space-3) / 2)",
                        borderLeft: showGuides ? "1px solid var(--color-border)" : "1px solid transparent",
                    }}
                >
                    <GuideRows nodes={node.children} showGuides={showGuides} />
                </div>
            ) : undefined}
        </div>
    ));
}

//
// Renders the tree in the style of option `optionId`.
//
export function TreePreview({ optionId }: { optionId: string }): ReactNode {
    return (
        <Paper variant="outlined" sx={{ padding: "var(--space-1)" }}>
            <GuideRows nodes={fileTree} showGuides={optionId !== "A"} />
        </Paper>
    );
}
