//
// The search inputs of large content: a filter box that always shows and narrows the content as
// the person types, and a search box that shows only in search mode, which Ctrl+F or a search
// button starts, Enter applies and Escape ends.
//

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Tip } from "./tip";

//
// Returns true for Ctrl+F, or Cmd+F on a Mac, the keys that start search mode.
//
export function isSearchKey(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }): boolean {
    return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "f";
}

//
// Returns true when `text` holds `query`, ignoring case. An empty query matches everything.
//
export function matchesSearch(text: string, query: string): boolean {
    const words = query.trim().toLowerCase();
    return words === "" || text.toLowerCase().includes(words);
}

//
// Renders a filter box that always shows, with a magnifier at its start. It reports each change
// as it is typed, and Escape clears it.
//
export function FilterBox({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder: string }): ReactNode {
    return (
        <TextField
            size="small"
            fullWidth
            placeholder={placeholder}
            value={value}
            onChange={event => onChange(event.target.value)}
            onKeyDown={event => {
                if (event.key === "Escape" && value !== "") {
                    event.preventDefault();
                    event.stopPropagation();
                    onChange("");
                }
            }}
            slotProps={{
                htmlInput: {
                    "aria-label": label,
                },
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-md)" }} />
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
}

//
// The state of a search mode: whether the box shows, what is typed in it, the query Enter applied,
// and the calls that start and end the mode.
//
export interface ISearchMode {
    //
    // True while the search box shows.
    //
    isOpen: boolean;

    //
    // What is typed in the box.
    //
    draft: string;

    //
    // The query the content is searched for, set from the draft by Enter.
    //
    query: string;

    //
    // Sets what is typed in the box.
    //
    setDraft: (draft: string) => void;

    //
    // Shows the box and puts the keys in it, remembering where the keys were.
    //
    open: () => void;

    //
    // Hides the box, clears the query and gives the keys back to where they were.
    //
    close: () => void;

    //
    // Applies what is typed as the query.
    //
    apply: () => void;

    //
    // Holds the box's input, so the mode can put the keys in it.
    //
    inputRef: RefObject<HTMLInputElement | null>;
}

//
// Returns a search mode, closed and with no query.
//
export function useSearchMode(): ISearchMode {
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [query, setQuery] = useState("");
    const [openCount, setOpenCount] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const focusBefore = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (openCount > 0) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [openCount]);

    return {
        isOpen,
        draft,
        query,
        setDraft,
        inputRef,
        open: () => {
            if (document.activeElement instanceof HTMLElement && document.activeElement !== inputRef.current) {
                focusBefore.current = document.activeElement;
            }
            setIsOpen(true);
            setOpenCount(count => count + 1);
        },
        close: () => {
            setIsOpen(false);
            setDraft("");
            setQuery("");
            if (focusBefore.current?.isConnected) {
                focusBefore.current.focus();
            }
        },
        apply: () => setQuery(draft),
    };
}

//
// Renders a search mode's box while the mode is open: Enter applies what is typed, Escape or the
// close button ends the mode, and `result` says how many matches the query found.
//
export function SearchModeBox({ mode, label, placeholder, result }: { mode: ISearchMode; label: string; placeholder: string; result?: string }): ReactNode {
    if (!mode.isOpen) {
        return undefined;
    }
    function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            mode.apply();
        }
        else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            mode.close();
        }
    }
    return (
        <div className="flex flex-none items-center" style={{ gap: "var(--space-2)", padding: "var(--space-2)", background: "var(--color-panel)", borderBottom: "1px solid var(--color-border)" }}>
            <TextField
                size="small"
                fullWidth
                placeholder={placeholder}
                value={mode.draft}
                onChange={event => mode.setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                inputRef={mode.inputRef}
                slotProps={{
                    htmlInput: {
                        "aria-label": label,
                    },
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-md)" }} />
                            </InputAdornment>
                        ),
                        endAdornment:
                            result !== undefined && mode.query.trim() !== "" ? (
                                <InputAdornment position="end">
                                    <span aria-live="polite" style={{ fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>
                                        {result}
                                    </span>
                                </InputAdornment>
                            ) : undefined,
                    },
                }}
            />
            <Tooltip title={<Tip title="Close the search box" detail="Key: Escape" />}>
                <IconButton size="small" aria-label="Close the search box" onClick={mode.close}>
                    <FontAwesomeIcon icon={faXmark} />
                </IconButton>
            </Tooltip>
        </div>
    );
}

//
// Renders the button that starts a search mode, for a header beside the content it searches.
//
export function SearchModeButton({ mode, what }: { mode: ISearchMode; what: string }): ReactNode {
    return (
        <Tooltip title={<Tip title={`Search ${what}`} detail="Keys: Ctrl+F" />}>
            <IconButton size="small" aria-label={`Search ${what}`} aria-pressed={mode.isOpen} onClick={mode.open}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
            </IconButton>
        </Tooltip>
    );
}
