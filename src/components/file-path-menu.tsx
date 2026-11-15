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
import { faCheck, faChevronDown, faCopy, faFile, faFolderOpen, faPenToSquare, faRoute } from "@fortawesome/free-solid-svg-icons";

//
// The folder the example repository sits in, which the full path starts with.
//
export const exampleRepoRoot = "/home/you/projects/graft";

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
// Renders the button and, while open, its menu below it. `path` is the file's path from the root
// of the repository, and `repoRoot` the folder the repository sits in. The copy items copy the
// full path, the path from the repository root or the file name, then the button shows a tick for
// a moment. The open items show the file in the file manager or open it in the editor, which the
// backend does in Graft; here they close the menu. A click on the button stays with it and never
// reaches a row the button sits in. The menu floats over the page without blocking it: a click
// anywhere outside it closes it and still reaches what was clicked, and Escape or Tab closes it.
// The button stays in view while its menu is open, even in a row that shows it only on hover.
//
export function FilePathMenu({ path, repoRoot = exampleRepoRoot }: { path: string; repoRoot?: string }): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    const [isCopied, setIsCopied] = useState(false);
    const name = path.slice(path.lastIndexOf("/") + 1);

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
                    sx={{ gap: "2px", color: isCopied ? "var(--color-success)" : undefined }}
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
                <MenuItem onClick={() => copy(`${repoRoot}/${path}`)}>
                    <ListItemIcon>
                        <FontAwesomeIcon icon={faCopy} />
                    </ListItemIcon>
                    <ListItemText>Copy full file path</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => copy(path)}>
                    <ListItemIcon>
                        <FontAwesomeIcon icon={faRoute} />
                    </ListItemIcon>
                    <ListItemText>Copy relative file path</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => copy(name)}>
                    <ListItemIcon>
                        <FontAwesomeIcon icon={faFile} />
                    </ListItemIcon>
                    <ListItemText>Copy file name</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={close}>
                    <ListItemIcon>
                        <FontAwesomeIcon icon={faFolderOpen} />
                    </ListItemIcon>
                    <ListItemText>{fileManagerLabel()}</ListItemText>
                </MenuItem>
                <MenuItem onClick={close}>
                    <ListItemIcon>
                        <FontAwesomeIcon icon={faPenToSquare} />
                    </ListItemIcon>
                    <ListItemText>Open in editor</ListItemText>
                </MenuItem>
                    </MenuList>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </span>
    );
}
