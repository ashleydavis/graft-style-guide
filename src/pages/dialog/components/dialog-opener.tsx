//
// A button that opens the example dialog as a real MUI Dialog, mounted inside the panel the
// button sits in so the dialog and its backdrop take that panel's theme.
//

import { useRef, useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import { CreateBranchContent } from "./create-branch-content";

//
// Renders the "Open dialog" button and, while open, the dialog. The dialog mounts into a
// wrapper inside the panel, so the panel's light or dark class applies to it.
//
export function DialogOpener(): ReactNode {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    function closeDialog(): void {
        setIsOpen(false);
    }

    return (
        <div ref={wrapperRef}>
            <Button variant="outlined" onClick={() => setIsOpen(true)}>
                Open dialog
            </Button>
            <Dialog
                open={isOpen}
                onClose={closeDialog}
                container={() => wrapperRef.current}
                maxWidth="xs"
                fullWidth={true}
            >
                <CreateBranchContent onClose={closeDialog} />
            </Dialog>
        </div>
    );
}
