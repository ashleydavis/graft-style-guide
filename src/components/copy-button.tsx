//
// The copy button: a small icon button that copies a piece of text to the clipboard and shows a
// tick for a moment once it has.
//

import { useEffect, useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";

//
// How long the tick shows after a copy, in milliseconds.
//
const COPIED_DURATION = 1500;

//
// Renders the button. A click copies `text` to the clipboard, then the copy icon turns into a tick
// in the success colour and the button's name and tooltip say "Copied" for COPIED_DURATION. A copy
// the browser refuses is reported in the console, because the button has nowhere else to show it.
// `label` names what is copied, as in "Copy command".
//
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }): ReactNode {
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!isCopied) {
            return undefined;
        }
        const timer = setTimeout(() => setIsCopied(false), COPIED_DURATION);
        return () => clearTimeout(timer);
    }, [isCopied]);

    function copy(): void {
        navigator.clipboard
            .writeText(text)
            .then(() => setIsCopied(true))
            .catch(error => {
                console.error(`Could not copy "${text}" to the clipboard: ${String(error)}. Nothing was copied, so look at whether the page is allowed to use the clipboard.`);
            });
    }

    const name = isCopied ? "Copied" : label;
    return (
        <Tooltip title={name}>
            <IconButton size="small" aria-label={name} onClick={copy} sx={isCopied ? { color: "var(--color-success)" } : undefined}>
                <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
            </IconButton>
        </Tooltip>
    );
}
