//
// The preview for the sidebar current item choice: a group of branches with the current one
// marked in the style of each option. A uses the selected background the theme draws now, B
// adds an accent bar down its left edge and C marks it with accent text only.
//

import type { ReactNode } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Paper from "@mui/material/Paper";
import type { SxProps, Theme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";

//
// The ListItemButton styles of the current item in options B and C. Option A and the "Spot
// it" option use the theme as it stands.
//
const currentStyles: Record<string, SxProps<Theme>> = {
    B: {
        "&.Mui-selected, &.Mui-selected:hover": {
            boxShadow: "inset 2px 0 0 var(--color-accent)",
        },
    },
    C: {
        "&.Mui-selected, &.Mui-selected:hover": {
            backgroundColor: "transparent",
            color: "var(--color-accent)",
            "& .MuiListItemIcon-root": {
                color: "var(--color-accent)",
            },
            "& .MuiListItemText-primary": {
                fontWeight: "var(--weight-bold)",
            },
        },
    },
};

//
// Renders the branch group in the style of option `optionId`, with "main" current.
//
export function SidebarPreview({ optionId }: { optionId: string }): ReactNode {
    return (
        <Paper variant="outlined" sx={{ padding: "var(--space-2)" }}>
            <List disablePadding subheader={<ListSubheader component="div">Branches</ListSubheader>}>
                {["main", "feature/commit-graph", "fix/merge-base"].map(branch => (
                    <ListItemButton key={branch} selected={branch === "main"} sx={currentStyles[optionId]}>
                        <ListItemIcon>
                            <FontAwesomeIcon icon={faCodeBranch} />
                        </ListItemIcon>
                        <ListItemText primary={branch} slotProps={{ primary: { sx: { fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" } } }} />
                    </ListItemButton>
                ))}
            </List>
        </Paper>
    );
}
