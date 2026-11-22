//
// The rows every tree in the style guide draws: a directory row and a file row with their tree
// lines, and the bar above a tree with the way back up from a focused directory and the expand all
// and collapse all buttons. The Tree page, the Commit page's staged and unstaged files, the commit
// details pane's file tree and the directory browser all draw their trees with these, so the trees
// look and behave the same. A click on a row only selects it. A directory opens and closes with
// its +/- button alone.
//

import type { ReactElement, ReactNode, Ref } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRightToBracket, faFolder, faFolderOpen, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { TreeGuide } from "../pages/commit-explorer/file-views";
import { DIRECTORY_KEYS, TreeGuides } from "./tree-guides";
import { Tip } from "./tip";

//
// The look the directory and file rows share. The path menu and a directory's focus button show
// on the row under the pointer, the selected row and a row with the keyboard in it, so the rest of
// the tree stays quiet. The path menu's space is kept, so nothing shifts when it shows. A Discard
// button inside an element with the file-discard class shows on the same rows and keeps its space.
//
const rowStyle = {
    gap: "var(--space-2)",
    fontSize: "var(--text-sm)",
    paddingLeft: "var(--space-2)",
    paddingRight: "var(--space-2)",
    "& .file-path-menu": {
        opacity: 0,
        transition: "opacity var(--duration-fast) var(--ease-standard)",
    },
    "&:hover .file-path-menu, &.Mui-selected .file-path-menu, &:focus-within .file-path-menu": {
        opacity: 1,
    },
    "& .directory-focus": {
        display: "none",
    },
    "& .file-discard": {
        visibility: "hidden",
    },
    "&:hover .file-discard, &.Mui-selected .file-discard, &:focus-within .file-discard": {
        visibility: "visible",
    },
    "&:hover .directory-focus, &.Mui-selected .directory-focus, &:focus-within .directory-focus": {
        display: "inline-flex",
    },
};

//
// Returns the bar a row draws at its left edge while what it stands for is open in the pane to
// the right, or none.
//
export function openBar(isOpen: boolean): string {
    if (isOpen) {
        return "inset 2px 0 0 var(--color-select-item)";
    }
    return "none";
}

//
// What a directory row shows and reports.
//
export interface ITreeDirectoryRowProps {
    //
    // The directory's path, which names the row and its buttons for assistive technology.
    //
    path: string;

    //
    // The name the row shows: the directory's name, or a run of names joined with "/".
    //
    name: string;

    //
    // The row's tree lines.
    //
    guides: TreeGuide[];

    //
    // Whether the directory's rows are hidden.
    //
    isCollapsed: boolean;

    //
    // Whether the row is selected.
    //
    isSelected: boolean;

    //
    // Whether the row's name shows in the text colour rather than dimmed, as a search's match does
    // among the directories above the matches.
    //
    isHighlighted: boolean;

    //
    // Whether what the row stands for is open in the pane to the right.
    //
    isOpen: boolean;

    //
    // The icon in place of the open or closed directory, such as the Git icon for a repository, or
    // undefined for the directory icon.
    //
    icon: ReactNode | undefined;

    //
    // A colour mixed into the icon and the name, such as the success colour for a staged
    // directory, or undefined for none.
    //
    tint: string | undefined;

    //
    // Whether everything in the directory is discarded, which fades the row apart from its
    // buttons.
    //
    isDiscarded: boolean;

    //
    // What shows before the tree lines, such as a stage button, or undefined.
    //
    lead: ReactNode | undefined;

    //
    // The path menu after the focus button, or undefined for none.
    //
    menu: ReactNode | undefined;

    //
    // What shows after the path menu, such as a Discard button, or undefined.
    //
    trail: ReactNode | undefined;

    //
    // Set on the selected row, so its tree can scroll it into view.
    //
    rowRef: Ref<HTMLLIElement> | undefined;

    //
    // Called when the row is clicked.
    //
    onSelect(): void;

    //
    // Called by the +/- button, or undefined for a row with no button, such as a search result.
    //
    onToggle: (() => void) | undefined;

    //
    // Called by the focus button and a double click, to show only this directory's contents.
    //
    onFocus(): void;
}

//
// Renders a directory row: what leads it, its tree lines ending in its +/- button, its icon, its
// name, the focus button, the path menu and what trails it.
//
export function TreeDirectoryRow(props: ITreeDirectoryRowProps): ReactNode {
    const { path, name, guides, isCollapsed, isSelected, isHighlighted, isOpen, icon, tint, isDiscarded, lead, menu, trail, rowRef, onSelect, onToggle, onFocus } = props;
    let directory = undefined;
    if (onToggle) {
        directory = {
            path,
            isCollapsed,
            onToggle,
        };
    }
    return (
        <ListItemButton
            component="li"
            ref={rowRef}
            aria-label={`Directory ${path}`}
            aria-expanded={onToggle ? !isCollapsed : undefined}
            selected={isSelected}
            aria-current={isOpen ? "true" : undefined}
            className={isDiscarded ? "graft-discarded" : undefined}
            data-discarded={isDiscarded || undefined}
            tabIndex={-1}
            onClick={onSelect}
            onDoubleClick={onFocus}
            sx={{ ...rowStyle, color: "var(--color-text-muted)", boxShadow: openBar(isOpen) }}
        >
            {lead}
            <TreeGuides guides={guides} directory={directory} />
            <span className="flex min-w-0 flex-1 items-center" style={{ gap: "var(--space-2)", color: tint ? `color-mix(in srgb, var(--color-text-muted) 70%, ${tint})` : undefined }}>
                {icon ?? <FontAwesomeIcon icon={isCollapsed ? faFolder : faFolderOpen} style={{ fontSize: "var(--icon-sm)", flex: "none" }} />}
                <span className="min-w-0 truncate" style={isHighlighted ? { color: "var(--color-text)", fontWeight: "var(--weight-medium)" } : undefined}>
                    {name}
                </span>
            </span>
            <span className="directory-focus">
                <Tooltip title={<Tip title="Focus on this directory" detail={`Key: ${DIRECTORY_KEYS.focus.toUpperCase()} or a double click. ${DIRECTORY_KEYS.up.toUpperCase()} goes back up.`} />}>
                    <IconButton
                        size="small"
                        aria-label={`Focus on ${path}`}
                        onClick={event => {
                            event.stopPropagation();
                            onFocus();
                        }}
                    >
                        <FontAwesomeIcon icon={faArrowRightToBracket} />
                    </IconButton>
                </Tooltip>
            </span>
            {menu}
            {trail}
        </ListItemButton>
    );
}

//
// What a file row shows and reports.
//
export interface ITreeFileRowProps {
    //
    // The file's path, which names the row for assistive technology.
    //
    path: string;

    //
    // What the row shows for the file: its name in a tree, or its path or its name beside its
    // directory in a flat list.
    //
    label: ReactNode;

    //
    // The file's icon.
    //
    icon: ReactNode;

    //
    // The row's tree lines, none in a flat list.
    //
    guides: TreeGuide[];

    //
    // Whether the row is selected.
    //
    isSelected: boolean;

    //
    // Whether the file's diff is open in the pane to the right.
    //
    isOpen: boolean;

    //
    // Whether the file is discarded, which fades the row apart from its buttons.
    //
    isDiscarded: boolean;

    //
    // What shows before the tree lines, such as a stage button, or undefined.
    //
    lead: ReactNode | undefined;

    //
    // What shows after the label, such as "untracked", or undefined.
    //
    extra: ReactNode | undefined;

    //
    // Wraps the label in the tooltip with the file's details, or undefined for no tooltip. The page
    // picks the tooltip, so every tree can show the same file details.
    //
    wrapLabel: ((label: ReactElement) => ReactNode) | undefined;

    //
    // The path menu after the label, or undefined for none.
    //
    menu: ReactNode | undefined;

    //
    // What shows after the path menu, such as the status letter and line counts or a Discard
    // button, or undefined.
    //
    trail: ReactNode | undefined;

    //
    // Set on the selected row, so its tree can scroll it into view.
    //
    rowRef: Ref<HTMLLIElement> | undefined;

    //
    // Called when the row is clicked.
    //
    onSelect(): void;
}

//
// Renders a file row: what leads it, its tree lines, its icon, its label with its tooltip, what
// follows the label, the path menu and what trails it.
//
export function TreeFileRow(props: ITreeFileRowProps): ReactNode {
    const { path, label, icon, guides, isSelected, isOpen, isDiscarded, lead, extra, wrapLabel, menu, trail, rowRef, onSelect } = props;
    const labelElement = <span className="min-w-0 flex-1 truncate">{label}</span>;
    return (
        <ListItemButton
            component="li"
            ref={rowRef}
            aria-label={path}
            selected={isSelected}
            aria-current={isOpen ? "true" : undefined}
            className={isDiscarded ? "graft-discarded" : undefined}
            data-discarded={isDiscarded || undefined}
            tabIndex={-1}
            onClick={onSelect}
            sx={{ ...rowStyle, boxShadow: openBar(isOpen) }}
        >
            {lead}
            <TreeGuides guides={guides} />
            {icon}
            {wrapLabel ? wrapLabel(labelElement) : labelElement}
            {extra}
            {menu}
            {trail}
        </ListItemButton>
    );
}

//
// What the bar above a tree shows and reports.
//
export interface ITreeBarProps {
    //
    // The directory the tree is focused on, shown with the way back up, or "" when the tree starts
    // at its top.
    //
    focusedPath: string;

    //
    // Called by the back button, to focus the tree on the directory above.
    //
    onBack(): void;

    //
    // Called by the expand all button.
    //
    onExpandAll(): void;

    //
    // Called by the collapse all button.
    //
    onCollapseAll(): void;

    //
    // True when the bar holds the expand all and collapse all buttons; false where the pane's
    // header holds them instead, so the bar shows only while the tree is focused on a directory.
    //
    hasAllButtons: boolean;
}

//
// Renders the bar above a tree: the back button and the focused directory while the tree is
// focused on one, then the expand all and collapse all buttons at the right.
//
export function TreeBar({ focusedPath, onBack, onExpandAll, onCollapseAll, hasAllButtons }: ITreeBarProps): ReactNode {
    const allKey = DIRECTORY_KEYS.all.toUpperCase();
    return (
        <li
            className="flex items-center"
            style={{ gap: "var(--space-2)", padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", listStyle: "none" }}
        >
            {focusedPath !== "" ? (
                <>
                    <Tooltip title={<Tip title="Back to the directory above" detail={`Key: ${DIRECTORY_KEYS.up.toUpperCase()} or Escape`} />}>
                        <IconButton size="small" aria-label="Back to the directory above" onClick={onBack}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </IconButton>
                    </Tooltip>
                    <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: "var(--icon-sm)" }} />
                    <span className="min-w-0 flex-1 truncate" style={{ color: "var(--color-text)" }}>
                        {focusedPath}
                    </span>
                </>
            ) : (
                <span className="flex-1" />
            )}
            {hasAllButtons ? (
                <>
                    <Tooltip title={<Tip title="Expand all" detail={`Key: ${allKey} expands every directory when all are collapsed and collapses them all otherwise.`} />}>
                        <IconButton size="small" aria-label="Expand all" onClick={onExpandAll}>
                            <FontAwesomeIcon icon={faPlus} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={<Tip title="Collapse all" detail={`Key: ${allKey} expands every directory when all are collapsed and collapses them all otherwise.`} />}>
                        <IconButton size="small" aria-label="Collapse all" onClick={onCollapseAll}>
                            <FontAwesomeIcon icon={faMinus} />
                        </IconButton>
                    </Tooltip>
                </>
            ) : undefined}
        </li>
    );
}

//
// Returns the directories collapsed after the expand all and collapse all key: every directory
// when any of `directories` is expanded, none when all are collapsed already.
//
export function collapsedAfterAllKey(directories: string[], collapsed: ReadonlySet<string>): ReadonlySet<string> {
    const isAnyExpanded = directories.some(directory => !collapsed.has(directory));
    if (isAnyExpanded) {
        return new Set(directories);
    }
    return new Set();
}
