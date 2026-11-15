//
// The tree lines of a row in a tree of files: one indent column per folder the row sits inside,
// each drawing its piece of line, so the rows read as an ASCII tree; and the button that collapses
// or expands a folder.
//

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Tip } from "./tip";
import type { TreeGuide } from "../pages/commit-explorer/file-views";

//
// The width of one indent column.
//
const COLUMN_WIDTH = "var(--space-4)";

//
// Renders a row's tree lines in the border colour: a line down the middle of a column for a folder
// above whose rows carry on, a line down with a branch to the right for a junction, and a line
// from the top to the middle with a branch to the right for a corner. The lines run the row's full
// height, past the row's padding of `--space-1` above and below, so they join the rows above
// and below.
//
export function TreeGuides({ guides }: { guides: TreeGuide[] }): ReactNode {
    if (guides.length === 0) {
        return undefined;
    }
    const line = "1px solid var(--color-border-control)";
    return (
        <span aria-hidden="true" className="flex flex-none self-stretch" style={{ margin: "calc(var(--space-1) * -1) 0" }}>
            {guides.map((guide, index) => (
                <span key={index} className="relative flex-none" style={{ width: COLUMN_WIDTH }}>
                    {guide === "line" || guide === "tee" || guide === "corner" ? (
                        <span style={{ position: "absolute", left: "50%", top: 0, bottom: guide === "corner" ? "50%" : 0, borderLeft: line }} />
                    ) : undefined}
                    {guide === "tee" || guide === "corner" ? <span style={{ position: "absolute", left: "50%", right: 0, top: "50%", borderTop: line }} /> : undefined}
                </span>
            ))}
        </span>
    );
}

//
// The keys for a directory in a tree of files while the file list has the keys: E expands or
// collapses the selected directory, F focuses the list on it and U goes back up to the directory
// above.
//
export const DIRECTORY_KEYS = { toggle: "e", focus: "f", up: "u" };

//
// Returns the directory action `key` asks for, or undefined when it names none. A key with Ctrl,
// Alt or Meta held names none.
//
export function directoryKeyAction(event: { key: string; ctrlKey: boolean; altKey: boolean; metaKey: boolean; shiftKey: boolean }): keyof typeof DIRECTORY_KEYS | undefined {
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return undefined;
    }
    const lower = event.key.toLowerCase();
    return (Object.keys(DIRECTORY_KEYS) as (keyof typeof DIRECTORY_KEYS)[]).find(action => DIRECTORY_KEYS[action] === lower);
}

//
// Renders the button at the start of a folder's row that collapses the folder, hiding the rows
// inside it, or expands it again: a chevron pointing down while open and right while collapsed.
//
export function FolderToggle({ path, isCollapsed, onToggle }: { path: string; isCollapsed: boolean; onToggle: () => void }): ReactNode {
    return (
        <Tooltip title={<Tip title={isCollapsed ? "Expand the directory" : "Collapse the directory"} detail={`Key: ${DIRECTORY_KEYS.toggle.toUpperCase()}`} />}>
            <IconButton
                size="small"
                aria-label={isCollapsed ? `Expand ${path}` : `Collapse ${path}`}
                aria-expanded={!isCollapsed}
                onClick={event => {
                    event.stopPropagation();
                    onToggle();
                }}
                sx={{ width: "calc(var(--icon-sm) + var(--space-2))", height: "calc(var(--icon-sm) + var(--space-2))", fontSize: "var(--icon-sm)" }}
            >
                <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronDown} />
            </IconButton>
        </Tooltip>
    );
}
