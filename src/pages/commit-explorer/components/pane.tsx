//
// A pane of the commit explorer: a card in a column, with an optional header that holds its title
// and a close button, marked with the accent while it is the pane the keys act on.
//

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

//
// What a pane shows.
//
export interface IPaneProps {
    //
    // The pane's name, for assistive technology, as in "Commits".
    //
    label: string;

    //
    // The pane's width, as a CSS length.
    //
    width: string;

    //
    // True while the pane is the one the keys act on, which its accent border shows.
    //
    isActive: boolean;

    //
    // What the header shows at the left, absent for a pane with no header.
    //
    title?: ReactNode;

    //
    // What the header shows between the title and the close button.
    //
    headerExtra?: ReactNode;

    //
    // Called by the close button, absent for a pane that cannot close.
    //
    onClose?: () => void;

    //
    // The pane's content, which scrolls inside the pane when it is taller than the pane.
    //
    children: ReactNode;
}

//
// Renders the pane: an outlined card whose border turns the accent colour and gains an accent
// ring while the pane is active. The header sits on the panel colour above a divider, with the
// title cut short when it is wider than the pane.
//
export function Pane({ label, width, isActive, title, headerExtra, onClose, children }: IPaneProps): ReactNode {
    return (
        <Paper
            component="section"
            variant="outlined"
            aria-label={label}
            data-active={isActive}
            className="flex flex-none flex-col"
            sx={{
                width,
                maxWidth: "calc(100vw - var(--space-8) * 2)",
                maxHeight: "100%",
                overflow: "hidden",
                borderRadius: "var(--radius-lg)",
                borderColor: isActive ? "var(--color-accent)" : "var(--color-border)",
                boxShadow: isActive ? "0 0 0 1px var(--color-accent), var(--shadow-raised)" : "var(--shadow-raised)",
                transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
            }}
        >
            {title !== undefined ? (
                <div
                    className="flex flex-none items-center"
                    style={{
                        gap: "var(--space-2)",
                        minHeight: "calc(var(--space-8) + var(--space-2))",
                        padding: "var(--space-1) var(--space-2) var(--space-1) var(--space-4)",
                        borderBottom: "1px solid var(--color-border)",
                    }}
                >
                    <div className="min-w-0 flex-1 truncate" style={{ fontWeight: "var(--weight-bold)" }}>
                        {title}
                    </div>
                    {headerExtra}
                    {onClose ? (
                        <Tooltip title="Close">
                            <IconButton size="small" aria-label={`Close ${label.toLowerCase()}`} onClick={onClose}>
                                <FontAwesomeIcon icon={faXmark} />
                            </IconButton>
                        </Tooltip>
                    ) : undefined}
                </div>
            ) : undefined}
            <div data-pane-scroll className="min-h-0 flex-1 overflow-auto">
                {children}
            </div>
        </Paper>
    );
}
