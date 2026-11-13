//
// The title, fields and buttons of the example "Create branch" dialog, shared by the inline
// preview and the dialog that opens.
//

import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

//
// Renders the dialog's parts. `onClose` runs when either button is clicked, so the opened
// dialog closes and the preview's buttons do nothing.
//
export function CreateBranchContent({ onClose }: { onClose(): void }): ReactNode {
    return (
        <>
            <DialogTitle>Create branch</DialogTitle>
            <DialogContent>
                <DialogContentText>Creates a branch from the selected commit and switches to it.</DialogContentText>
                <Stack
                    sx={{
                        gap: "var(--space-3)",
                        paddingTop: "var(--space-1)",
                    }}
                >
                    <TextField label="Branch name" size="small" defaultValue="feature/dialogs" fullWidth />
                    <TextField label="Start point" size="small" defaultValue="a1b2c3d" fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant="text" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={onClose}>
                    Create
                </Button>
            </DialogActions>
        </>
    );
}
