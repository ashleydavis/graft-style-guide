//
// The dialog page: a form dialog and a confirmation dialog built from MUI's Dialog parts, and a
// button that opens the form dialog for real.
//

import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Section } from "../../components/section";
import { CreateBranchContent } from "./components/create-branch-content";
import { DialogOpener } from "./components/dialog-opener";
import { DialogPreview } from "./components/dialog-preview";

//
// Renders one section per kind of dialog, each shown in both themes.
//
export function DialogPage(): ReactNode {
    return (
        <div>
            <Section
                title="Form dialog"
                description="A title, a line of explanation, text boxes and buttons."
            >
                <DialogPreview>
                    <CreateBranchContent onClose={() => {}} />
                </DialogPreview>
            </Section>

            <Section
                title="Confirmation dialog"
                description="A question before an action that loses work."
            >
                <DialogPreview>
                    <DialogTitle>Discard changes?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Discards the changes to 3 files in the working tree. Discarded changes are gone for good.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button variant="text">Keep changes</Button>
                        <Button variant="outlined" color="error">
                            Discard
                        </Button>
                    </DialogActions>
                </DialogPreview>
            </Section>

            <Section title="Opened" description="The form dialog over the page.">
                <DialogOpener />
            </Section>
        </div>
    );
}
