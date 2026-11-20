//
// The commit explorer's search boxes for the commits and for a commit's files: a box in a pane's
// toolbar that the search button or Ctrl+F shows, which searches once typing pauses, or at once on
// Enter, and which Escape or its close button ends, clearing the search and giving the keys back to the explorer.
//

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useDebouncedQuery, type ISearchMode } from "../../../components/search-box";

//
// Returns a search that starts closed and empty. Opening shows the box, whose input takes the
// focus as it mounts. Closing hides it, clears what was typed and applied and calls `onClose`,
// which gives the keys back to the explorer.
//
export function useExplorerSearch(onClose: () => void): ISearchMode {
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const debounced = useDebouncedQuery(draft);
    const inputRef = useRef<HTMLInputElement>(null);
    return {
        isOpen,
        draft,
        query: debounced.query,
        setDraft,
        inputRef,
        open: () => setIsOpen(true),
        close: () => {
            setIsOpen(false);
            setDraft("");
            onClose();
        },
        apply: debounced.applyNow,
    };
}

//
// Renders the box of `search` while it is open: the magnifier at its start, then `result` and
// the close button, named `closeLabel`, at its end. It searches once typing pauses or on Enter, and
// Escape closes the search.
//
export function ExplorerSearchBox({ search, label, placeholder, closeLabel, result }: { search: ISearchMode; label: string; placeholder: string; closeLabel: string; result: string | undefined }): ReactNode {
    function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            search.apply();
        }
        else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            search.close();
        }
    }
    return (
        <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder={placeholder}
            value={search.draft}
            onChange={event => search.setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            inputRef={search.inputRef}
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
                    endAdornment: (
                        <InputAdornment position="end" sx={{ gap: "var(--space-2)" }}>
                            {result !== undefined ? (
                                <span aria-live="polite" style={{ fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>
                                    {result}
                                </span>
                            ) : undefined}
                            <Tooltip title="Close the search">
                                <IconButton size="small" aria-label={closeLabel} onClick={search.close} edge="end">
                                    <FontAwesomeIcon icon={faXmark} />
                                </IconButton>
                            </Tooltip>
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
}
