//
// The file path menu: a small drop-down button beside any file path, with the ways to copy the
// path and to open the file outside Graft.
//

import { useEffect, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronDown, faCopy, faFile, faFolder, faFolderOpen, faPenToSquare, faRoute, faTerminal, type IconDefinition } from "@fortawesome/free-solid-svg-icons";

//
// The directory the example repository sits in, which the full path starts with.
//
export const exampleRepoRoot = "/home/you/projects/graft";

//
// What a path menu is for: a file in the repository, a directory in the repository, or the
// directory a command runs in, given as a full path.
//
export type PathKind = "file" | "directory" | "working-directory";

//
// One item of a path menu: its label and icon, and the text it copies, or no text for an item
// that opens the path.
//
interface IPathMenuItem {
    label: string;
    icon: IconDefinition;
    copies?: string;
}

//
// Returns the items of a path menu for a path of `kind`, with a divider between the copy items
// and the open items. A file can be copied as its full path, its path from the repository root or
// its name, and shown in the file manager or opened in the editor. A directory can be copied as its
// full path, its path from the repository root or its name, and opened in the file manager or the
// editor. The directory a command runs in can be copied as its full path, as a cd command into it
// or as its name, and opened in the file manager or the editor.
//
function menuItems(kind: PathKind, fullPath: string, path: string, name: string): (IPathMenuItem | "divider")[] {
    if (kind === "working-directory") {
        return [
            { label: "Copy full path", icon: faCopy, copies: fullPath },
            { label: "Copy cd command", icon: faTerminal, copies: `cd ${fullPath}` },
            { label: "Copy directory name", icon: faFolder, copies: name },
            "divider",
            { label: directoryManagerLabel(), icon: faFolderOpen },
            { label: "Open in editor", icon: faPenToSquare },
        ];
    }
    if (kind === "directory") {
        return [
            { label: "Copy full path", icon: faCopy, copies: fullPath },
            { label: "Copy relative path", icon: faRoute, copies: path },
            { label: "Copy directory name", icon: faFolder, copies: name },
            "divider",
            { label: directoryManagerLabel(), icon: faFolderOpen },
            { label: "Open in editor", icon: faPenToSquare },
        ];
    }
    return [
        { label: "Copy full file path", icon: faCopy, copies: fullPath },
        { label: "Copy relative file path", icon: faRoute, copies: path },
        { label: "Copy file name", icon: faFile, copies: name },
        "divider",
        { label: fileManagerLabel(), icon: faFolderOpen },
        { label: "Open in editor", icon: faPenToSquare },
    ];
}

//
// Returns the name of the menu item that opens a directory in the computer's file manager, as each
// platform names its own.
//
export function directoryManagerLabel(): string {
    const platform = navigator.userAgent;
    if (/Mac/.test(platform)) {
        return "Open in Finder";
    }
    if (/Win/.test(platform)) {
        return "Open in Explorer";
    }
    return "Open in file manager";
}

//
// How long the tick shows after a copy, in milliseconds.
//
const COPIED_DURATION = 1500;

//
// Returns the name of the menu item that shows a file in the computer's file manager, as each
// platform names its own: Finder on macOS, File Explorer on Windows and the file manager on Linux.
// In Graft the backend tells the frontend its platform; here the browser's own report stands for
// it.
//
export function fileManagerLabel(): string {
    const platform = navigator.userAgent;
    if (/Mac/.test(platform)) {
        return "Reveal in Finder";
    }
    if (/Win/.test(platform)) {
        return "Show in Explorer";
    }
    return "Open in file manager";
}

//
// Renders the button and, while open, its menu below it. `path` is the path from the root of the
// repository, or the full path of a working directory, and `repoRoot` the directory the repository
// sits in. `kind` picks the menu's items. A copy item copies its text, then the button shows a tick
// for a moment. The open items open the path in the file manager or the editor, which the backend
// does in Graft; here they close the menu. A click on the button stays with it and never
// reaches a row the button sits in. The menu floats over the page without blocking it: a click
// anywhere outside it closes it and still reaches what was clicked, and Escape or Tab closes it.
// The button stays in view while its menu is open, even in a row that shows it only on hover.
//
export function FilePathMenu({ path, repoRoot = exampleRepoRoot, kind = "file" }: { path: string; repoRoot?: string; kind?: PathKind }): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    const [isCopied, setIsCopied] = useState(false);
    const name = path.slice(path.lastIndexOf("/") + 1);
    const fullPath = kind === "working-directory" ? path : `${repoRoot}/${path}`;

    useEffect(() => {
        if (!isCopied) {
            return undefined;
        }
        const timer = setTimeout(() => setIsCopied(false), COPIED_DURATION);
        return () => clearTimeout(timer);
    }, [isCopied]);

    function open(event: MouseEvent<HTMLElement>): void {
        event.stopPropagation();
        setAnchor(anchor === undefined ? event.currentTarget : undefined);
    }

    function close(): void {
        setAnchor(undefined);
    }

    function onMenuKey(event: KeyboardEvent): void {
        if (event.key === "Escape" || event.key === "Tab") {
            event.preventDefault();
            event.stopPropagation();
            anchor?.focus();
            close();
        }
    }

    function copy(text: string): void {
        setAnchor(undefined);
        navigator.clipboard
            .writeText(text)
            .then(() => setIsCopied(true))
            .catch(error => {
                console.error(`Could not copy "${text}" to the clipboard: ${String(error)}. Nothing was copied, so look at whether the page is allowed to use the clipboard.`);
            });
    }

    const label = isCopied ? "Copied" : `Path actions for ${name}`;
    return (
        <span className="file-path-menu inline-flex flex-none" style={anchor !== undefined ? { opacity: 1 } : undefined} onClick={event => event.stopPropagation()}>
            <Tooltip title={isCopied ? "Copied" : "Copy or open"}>
                <IconButton
                    size="small"
                    aria-label={label}
                    aria-haspopup="menu"
                    aria-expanded={anchor !== undefined}
                    onClick={open}
                    //
                    // A drop-down button with two icons, so it takes their width with room either
                    // side instead of a single icon's square.
                    //
                    sx={{ width: "auto", paddingInline: "var(--space-1)", gap: "2px", color: isCopied ? "var(--color-success)" : undefined }}
                >
                    <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "calc(var(--icon-sm) * 0.75)" }} />
                </IconButton>
            </Tooltip>
            <Popper open={anchor !== undefined} anchorEl={anchor} placement="bottom-start" popperOptions={{ strategy: "fixed" }} style={{ zIndex: 1300 }}>
                <ClickAwayListener
                    mouseEvent="onMouseDown"
                    onClickAway={event => {
                        if (!(event.target instanceof Node && anchor?.contains(event.target))) {
                            close();
                        }
                    }}
                >
                    <Paper variant="overlay" sx={{ marginTop: "var(--space-1)" }}>
                    <MenuList autoFocusItem onKeyDown={onMenuKey} sx={{ padding: "var(--space-2) var(--space-1)" }}>
                {menuItems(kind, fullPath, path, name).map((item, index) =>
                    item === "divider" ? (
                        <Divider key={`divider-${index}`} />
                    ) : (
                        <MenuItem key={item.label} onClick={() => (item.copies === undefined ? close() : copy(item.copies))}>
                            <ListItemIcon>
                                <FontAwesomeIcon icon={item.icon} />
                            </ListItemIcon>
                            <ListItemText>{item.label}</ListItemText>
                        </MenuItem>
                    ),
                )}
                    </MenuList>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </span>
    );
}
