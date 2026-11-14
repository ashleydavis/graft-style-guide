//
// The preview for the status text choice: changed files with their status letters on a plain,
// a hovered and a selected row, and a menu with its danger item hovered.
//

import type { ReactNode } from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { StatusLetter, type FileStatus } from "../../tree";

//
// The files of the preview, with the state each row is drawn in.
//
const files: { name: string; status: FileStatus; state: "plain" | "hover" | "selected" }[] = [
    {
        name: "lanes.ts",
        status: "M",
        state: "selected",
    },
    {
        name: "curves.ts",
        status: "A",
        state: "hover",
    },
    {
        name: "old-graph.ts",
        status: "D",
        state: "selected",
    },
    {
        name: "README.md",
        status: "M",
        state: "plain",
    },
    {
        name: "themes.ts",
        status: "R",
        state: "selected",
    },
];

//
// Renders the preview. The option's tokens come from the card around it.
//
export function StatusTextPreview(): ReactNode {
    return (
        <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
            <Paper variant="outlined" sx={{ padding: "var(--space-1)" }}>
                {files.map(file => (
                    <ListItemButton
                        key={file.name}
                        selected={file.state === "selected"}
                        sx={file.state === "hover" ? { backgroundColor: "var(--color-hover)" } : undefined}
                    >
                        <ListItemText primary={file.name} />
                        <StatusLetter status={file.status} />
                    </ListItemButton>
                ))}
            </Paper>
            <Paper variant="overlay">
                <MenuList sx={{ padding: "var(--space-2) var(--space-1)" }}>
                    <MenuItem sx={{ color: "var(--color-danger)", backgroundColor: "var(--color-hover)", "& .MuiListItemIcon-root": { color: "var(--color-danger)" } }}>
                        <ListItemIcon>
                            <FontAwesomeIcon icon={faTrash} />
                        </ListItemIcon>
                        <ListItemText>Reset to here</ListItemText>
                    </MenuItem>
                </MenuList>
            </Paper>
        </div>
    );
}
