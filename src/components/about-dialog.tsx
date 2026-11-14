//
// The about popup: what the style explorer is for, with links to Graft on GitHub and to the
// YouTube channel where the series about building Graft is published.
//

import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Link from "@mui/material/Link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

//
// Props for the about popup.
//
export interface IAboutDialogProps {
    //
    // True while the popup is shown.
    //
    open: boolean;

    //
    // Called when the popup asks to close: the close button, Escape or a click outside it.
    //
    onClose: () => void;
}

//
// Renders the about popup centred on the page, sized to its text up to 600px wide. The page
// keeps its scrollbar while the popup is open, so nothing behind it moves.
//
export function AboutDialog({ open, onClose }: IAboutDialogProps): ReactNode {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" disableScrollLock>
            <DialogTitle className="flex items-center justify-between gap-4">
                About
                <Tooltip title="Close">
                    <IconButton aria-label="Close" size="small" onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </IconButton>
                </Tooltip>
            </DialogTitle>
            <DialogContent
                className="flex flex-col"
                style={{
                    gap: "var(--space-3)",
                }}
            >
                <p>
                    This explorer shows the style guide of Graft, a Git client with a web interface. Every colour, size
                    and component style comes from the design tokens in graft.css, shown in the light and the dark theme.
                </p>
                <p>
                    Graft on GitHub:{" "}
                    <Link href="https://github.com/ashleydavis/Graft" target="_blank" rel="noreferrer">
                        github.com/ashleydavis/Graft
                    </Link>
                </p>
                <p>
                    The series about building Graft on YouTube:{" "}
                    <Link href="https://www.youtube.com/@CodeCapers" target="_blank" rel="noreferrer">
                        Code Capers
                    </Link>
                </p>
            </DialogContent>
        </Dialog>
    );
}
