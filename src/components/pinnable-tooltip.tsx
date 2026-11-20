//
// A tooltip that can be pinned on screen, for the tooltips that list fields to copy. A pin button
// in its top right corner keeps it open after the pointer leaves, so its fields can be copied at
// leisure, and turns into a close button while it is pinned. P pins the tooltip open under the
// pointer, and P or Escape closes a pinned one.
//

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbtack, faXmark } from "@fortawesome/free-solid-svg-icons";

//
// The key that pins the tooltip open under the pointer, and closes a pinned one.
//
export const PIN_KEY = "p";

//
// What a pinnable tooltip shows and wraps.
//
export interface IPinnableTooltipProps {
    //
    // Returns the tooltip's body, such as its fields with their copy buttons, given the pin
    // button, which the body puts at the end of its first line so it takes no width of its own.
    //
    tip(pinButton: ReactNode): ReactNode;

    //
    // How long the pointer rests on the element before the tooltip opens, in milliseconds.
    //
    enterDelayMs: number;

    //
    // The widest the tooltip goes, as a CSS length.
    //
    maxWidth: string;

    //
    // The element the tooltip is for, which takes the tooltip's events and ref.
    //
    children: ReactElement;
}

//
// Returns whether a key press belongs to a text box, where P types a letter rather than pinning.
//
export function isTypingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']") !== null;
}

//
// Renders the tooltip to the right of its element, flipping to the left where there is no room,
// with its pin button at the end of its body's first line. While it is open under the pointer
// or pinned, it listens for its key on the window, ahead of the page's own keys, so P and
// Escape act on the tooltip rather than on the pane underneath.
//
export function PinnableTooltip({ tip, enterDelayMs, maxWidth, children }: IPinnableTooltipProps): ReactNode {
    const [isOpen, setIsOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    function close(): void {
        setIsPinned(false);
        setIsOpen(false);
    }

    useEffect(() => {
        if (!isOpen && !isPinned) {
            return undefined;
        }
        function onKey(event: KeyboardEvent): void {
            if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) {
                return;
            }
            const isPinKey = event.key.toLowerCase() === PIN_KEY;
            if (isPinned) {
                if (isPinKey || event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    close();
                }
                return;
            }
            if (isPinKey) {
                event.preventDefault();
                event.stopPropagation();
                setIsPinned(true);
            }
        }
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [isOpen, isPinned]);

    return (
        <Tooltip
            open={isOpen || isPinned}
            onOpen={() => setIsOpen(true)}
            onClose={() => setIsOpen(false)}
            enterDelay={enterDelayMs}
            placement="right"
            slotProps={{ tooltip: { sx: { maxWidth } }, popper: { disablePortal: false } }}
            title={tip(
                    <IconButton
                        size="small"
                        aria-label={isPinned ? "Close the tooltip (P or Escape)" : "Pin the tooltip (P)"}
                        title={isPinned ? "Close (P or Escape)" : "Pin (P)"}
                        aria-pressed={isPinned}
                        onClick={event => {
                            event.stopPropagation();
                            if (isPinned) {
                                close();
                            }
                            else {
                                setIsPinned(true);
                            }
                        }}
                        sx={{
                            flex: "none",
                            marginBottom: "var(--space-1)",
                            width: "calc(var(--space-4) + var(--space-1))",
                            height: "calc(var(--space-4) + var(--space-1))",
                            fontSize: "var(--icon-sm)",
                            color: "var(--color-text)",
                            background: isPinned ? "var(--color-tooltip-button-hover)" : "var(--color-tooltip-button)",
                            boxShadow: "none",
                            "&:hover": {
                                background: "var(--color-tooltip-button-hover)",
                                color: "var(--color-text)",
                            },
                        }}
                    >
                        <FontAwesomeIcon icon={isPinned ? faXmark : faThumbtack} />
                    </IconButton>,
            )}
        >
            {children}
        </Tooltip>
    );
}
