//
// The maximise button: a small icon button in a pane's header that makes the pane fill its
// explorer, and puts the panes back as they were when clicked again.
//

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownLeftAndUpRightToCenter, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons";
import { Tip } from "./tip";

//
// The key that maximises and restores the pane the keys are on, as the tooltip names it.
//
export const MAXIMISE_KEY = "M";

//
// Renders the button: arrows pointing out while the pane is at its usual size, and in while it is
// maximised. The tooltip says what a click does and names the key that does the same.
//
export function MaximiseButton({ isMaximised, onClick }: { isMaximised: boolean; onClick: () => void }): ReactNode {
    const label = isMaximised ? "Restore the pane" : "Maximise the pane";
    return (
        <Tooltip title={<Tip title={label} detail={`Key: ${MAXIMISE_KEY}`} />}>
            <IconButton size="small" aria-label={label} aria-pressed={isMaximised} onClick={onClick}>
                <FontAwesomeIcon icon={isMaximised ? faDownLeftAndUpRightToCenter : faUpRightAndDownLeftFromCenter} />
            </IconButton>
        </Tooltip>
    );
}
