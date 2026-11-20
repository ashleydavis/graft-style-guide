//
// The body of a tooltip that lists fields, such as a commit's title, author and hash, each with a
// button that copies it. A tooltip stays open while the pointer moves into it, so its buttons can
// be clicked.
//

import { useEffect, useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";

//
// One field a tooltip shows.
//
export interface ICopyField {
    //
    // The field's name, shown small above its value, or "" for a field that needs no name.
    //
    label: string;

    //
    // The field's value, shown and copied as it is.
    //
    value: string;

    //
    // Whether the value shows in the monospaced font, as a hash or a path does.
    //
    isCode: boolean;

    //
    // Whether the value keeps its line breaks, as a commit's description does.
    //
    isMultiline: boolean;
}

//
// How long a copy button shows its tick after copying, in milliseconds.
//
const COPIED_DURATION_MS = 1500;

//
// Renders one field: its name above, then a light dotted line across the field, which joins the
// value to its copy button, then the value with the button beside it, centred on the value's
// first line.
//
export function CopyFieldRow({ field, action }: { field: ICopyField; action: ReactNode | undefined }): ReactNode {
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!isCopied) {
            return undefined;
        }
        const timer = setTimeout(() => setIsCopied(false), COPIED_DURATION_MS);
        return () => clearTimeout(timer);
    }, [isCopied]);

    function copy(): void {
        navigator.clipboard
            .writeText(field.value)
            .then(() => setIsCopied(true))
            .catch(error => {
                console.error(`Could not copy "${field.value}" to the clipboard: ${String(error)}. Nothing was copied, so look at whether the page is allowed to use the clipboard.`);
            });
    }

    return (
        <span className="flex flex-col" style={{ gap: "1px" }}>
            {field.label || action ? (
                <span className="flex items-center" style={{ gap: "var(--space-2)" }}>
                    <span className="min-w-0 flex-1" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-normal)", color: "var(--color-tooltip-muted)" }}>
                        {field.label}
                    </span>
                    {action}
                </span>
            ) : undefined}
            <span className="flex items-start" style={{ gap: "var(--space-2)", borderTop: "1px dotted var(--color-tooltip-border)", paddingTop: "calc(var(--space-1) * 1.5 + 1px)" }}>
                <span className="min-w-0 flex-1" style={{ fontFamily: field.isCode ? "var(--font-mono)" : undefined, whiteSpace: field.isMultiline ? "pre-wrap" : undefined, overflowWrap: "anywhere" }}>
                    {field.value}
                </span>
                <IconButton
                    size="small"
                    aria-label={isCopied ? "Copied" : `Copy ${field.label || field.value}`}
                    onClick={event => {
                        event.stopPropagation();
                        copy();
                    }}
                    sx={{
                        flex: "none",
                        //
                        // The button is a little taller than a line of the value, so it is centred
                        // on the value's first line: level with a one-line value, and at the top of
                        // a longer one.
                        //
                        width: "calc(var(--space-4) + var(--space-1))",
                        height: "calc(var(--space-4) + var(--space-1))",
                        fontSize: "var(--icon-sm)",
                        marginTop: "calc(var(--space-1) / -2)",
                        color: "var(--color-text)",
                        background: "var(--color-tooltip-button)",
                        boxShadow: "none",
                        "&:hover": {
                            background: "var(--color-tooltip-button-hover)",
                            color: "var(--color-text)",
                        },
                    }}
                >
                    <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
                </IconButton>
            </span>
        </span>
    );
}

//
// Renders a tooltip's fields one under another, each with its copy button, and `action`, such as
// the pin button, at the end of the first field's name, above the copy buttons.
//
export function CopyTip({ fields, action }: { fields: ICopyField[]; action: ReactNode | undefined }): ReactNode {
    return (
        <span className="flex flex-col" style={{ gap: "var(--space-2)", padding: "var(--space-1) 0" }}>
            {fields.map((field, index) => (
                <CopyFieldRow key={`${field.label}:${field.value}`} field={field} action={index === 0 ? action : undefined} />
            ))}
        </span>
    );
}

//
// Returns a field shown in the body font on one line.
//
export function textField(label: string, value: string): ICopyField {
    return {
        label,
        value,
        isCode: false,
        isMultiline: false,
    };
}

//
// Returns a field shown in the monospaced font, as a hash or a path is.
//
export function codeField(label: string, value: string): ICopyField {
    return {
        label,
        value,
        isCode: true,
        isMultiline: false,
    };
}
