//
// The tree lines of a row in a tree of files: one indent column per directory the row sits inside,
// each drawing its piece of line, so the rows read as an ASCII tree; and the button that collapses
// or expands a directory.
//

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Tip } from "./tip";
import type { TreeGuide } from "../pages/commit-explorer/file-views";

//
// The width of one indent column.
//
const COLUMN_WIDTH = "var(--space-4)";

//
// The size of the +/- box of a directory's toggle, which sits over the tree line.
//
const BOX_SIZE = "11px";

//
// The directory a row's tree lines end in: its toggle sits in the last column.
//
export interface ITreeDirectory {
    //
    // The directory's path, which names its toggle for assistive technology.
    //
    path: string;

    //
    // Whether the directory's rows are hidden, which the toggle shows as a plus.
    //
    isCollapsed: boolean;

    //
    // Called by the toggle, to collapse or expand the directory.
    //
    onToggle(): void;
}

//
// Renders a row's tree lines in the border colour: a line down the middle of a column for a
// directory above whose rows carry on, a line down with a branch to the right for a junction, and a
// line from the top to the middle with a branch to the right for a corner. The lines run the row's
// full height, past the row's padding of `--space-1` above and below, so they join the rows above
// and below. A directory's row ends in one more column holding its toggle on the line, with the
// line running on down to the directory's rows while it is open.
//
export function TreeGuides({ guides, directory }: { guides: TreeGuide[]; directory?: ITreeDirectory }): ReactNode {
    if (guides.length === 0 && !directory) {
        return undefined;
    }
    const line = "1px solid var(--color-border-control)";
    return (
        <span className="flex flex-none self-stretch" style={{ margin: "calc(var(--space-1) * -1) 0" }}>
            {guides.map((guide, index) => (
                <span key={index} aria-hidden="true" className="relative flex-none" style={{ width: COLUMN_WIDTH }}>
                    {guide === "line" || guide === "tee" || guide === "corner" ? (
                        <span style={{ position: "absolute", left: "50%", top: 0, bottom: guide === "corner" ? "50%" : 0, borderLeft: line }} />
                    ) : undefined}
                    {guide === "tee" || guide === "corner" ? <span style={{ position: "absolute", left: "50%", right: 0, top: "50%", borderTop: line }} /> : undefined}
                </span>
            ))}
            {directory ? (
                <span className="relative flex-none" style={{ width: COLUMN_WIDTH }}>
                    {guides.length > 0 ? <span aria-hidden="true" style={{ position: "absolute", left: 0, right: "50%", top: "50%", borderTop: line }} /> : undefined}
                    {directory.isCollapsed ? undefined : <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", bottom: 0, borderLeft: line }} />}
                    <DirectoryToggle path={directory.path} isCollapsed={directory.isCollapsed} onToggle={directory.onToggle} />
                </span>
            ) : undefined}
        </span>
    );
}

//
// The keys for a directory in a tree of files while the file list has the keys: E or Space expands
// or collapses the selected directory, F focuses the list on it, U goes back up to the directory
// above and A expands or collapses every directory at once.
//
export const DIRECTORY_KEYS = { toggle: "e", focus: "f", up: "u", all: "a" };

//
// Returns the directory action `key` asks for, or undefined when it names none. A key with Ctrl,
// Alt or Meta held names none.
//
export function directoryKeyAction(event: { key: string; ctrlKey: boolean; altKey: boolean; metaKey: boolean; shiftKey: boolean }): keyof typeof DIRECTORY_KEYS | undefined {
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return undefined;
    }
    if (event.key === " ") {
        return "toggle";
    }
    const lower = event.key.toLowerCase();
    return (Object.keys(DIRECTORY_KEYS) as (keyof typeof DIRECTORY_KEYS)[]).find(action => DIRECTORY_KEYS[action] === lower);
}

//
// Renders the button on a directory's tree line that collapses the directory, hiding the rows
// inside it, or expands it again: a box with a minus while open and a plus while collapsed, its
// solid background hiding the line under it. The button is larger than the box so it is easy to
// hit.
//
export function DirectoryToggle({ path, isCollapsed, onToggle }: { path: string; isCollapsed: boolean; onToggle: () => void }): ReactNode {
    return (
        <Tooltip title={<Tip title={isCollapsed ? "Expand the directory" : "Collapse the directory"} detail={`Key: Space or ${DIRECTORY_KEYS.toggle.toUpperCase()}`} />}>
            <IconButton
                size="small"
                aria-label={isCollapsed ? `Expand ${path}` : `Collapse ${path}`}
                aria-expanded={!isCollapsed}
                onClick={event => {
                    event.stopPropagation();
                    onToggle();
                }}
                sx={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "calc(var(--space-4) + var(--space-1))",
                    height: "calc(var(--space-4) + var(--space-1))",
                    padding: 0,
                    boxShadow: "none",
                    background: "none",
                    color: "var(--color-text-muted)",
                    "&:hover": { background: "none", color: "var(--color-text)" },
                }}
            >
                <span
                    className="flex items-center justify-center"
                    style={{ width: BOX_SIZE, height: BOX_SIZE, fontSize: "7px", background: "var(--color-raised)", border: "1px solid var(--color-border)", borderRadius: "2px" }}
                >
                    <FontAwesomeIcon icon={isCollapsed ? faPlus : faMinus} />
                </span>
            </IconButton>
        </Tooltip>
    );
}
