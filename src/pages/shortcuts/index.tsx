//
// The shortcuts overlay page: a searchable list of every keyboard shortcut in Graft, in groups,
// that opens over the main screen when you press "?". Built from MUI's Dialog, InputBase, List
// and ListSubheader.
//

import { useContext, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Paper from "@mui/material/Paper";
import { useSearch } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";
import { KeyCaps } from "../../components/shortcut";
import { modeThemes } from "../../lib/explorer-mode";
import { PanelThemeContext } from "../../lib/panel-theme";

//
// One group of shortcuts.
//
interface IShortcutGroup {
    //
    // The group's heading.
    //
    title: string;

    //
    // The shortcuts in the group: what each does and its keys, joined with "+".
    //
    shortcuts: { action: string; keys: string }[];
}

//
// Every shortcut in the example overlay, by group.
//
const shortcutGroups: IShortcutGroup[] = [
    {
        title: "General",
        shortcuts: [
            { action: "Show keyboard shortcuts", keys: "?" },
            { action: "Open the command palette", keys: "Ctrl+K" },
            { action: "Open settings", keys: "Ctrl+," },
            { action: "Switch repository", keys: "Ctrl+O" },
        ],
    },
    {
        title: "Repository",
        shortcuts: [
            { action: "Fetch", keys: "F5" },
            { action: "Pull", keys: "Ctrl+Shift+L" },
            { action: "Push", keys: "Ctrl+Shift+P" },
            { action: "Stash changes", keys: "Ctrl+Shift+S" },
            { action: "New branch", keys: "B" },
            { action: "New tag", keys: "T" },
        ],
    },
    {
        title: "Commit list",
        shortcuts: [
            { action: "Next commit", keys: "J" },
            { action: "Previous commit", keys: "K" },
            { action: "Copy hash", keys: "Ctrl+C" },
            { action: "Filter commits", keys: "/" },
        ],
    },
    {
        title: "Changes",
        shortcuts: [
            { action: "Stage the selected file", keys: "S" },
            { action: "Unstage the selected file", keys: "U" },
            { action: "Commit", keys: "Ctrl+Enter" },
            { action: "Next change in the diff", keys: "N" },
        ],
    },
];

//
// Returns the groups with only the shortcuts whose action or keys contain `search`, ignoring
// case, and without groups left empty.
//
export function filterShortcuts(search: string): IShortcutGroup[] {
    const needle = search.trim().toLowerCase();
    return shortcutGroups
        .map(group => ({
            ...group,
            shortcuts: group.shortcuts.filter(shortcut => shortcut.action.toLowerCase().includes(needle) || shortcut.keys.toLowerCase().includes(needle)),
        }))
        .filter(group => group.shortcuts.length > 0);
}

//
// Renders a faint dotted line along the text's baseline that fills the space between an action
// and its keys, so the eye follows the row across.
//
export function ShortcutLeader(): ReactNode {
    return (
        <span
            aria-hidden="true"
            style={{
                flex: "1 1 var(--space-4)",
                minWidth: "var(--space-4)",
                height: 0,
                display: "inline-block",
                borderBottom: "1px dotted var(--color-border)",
            }}
        />
    );
}

//
// Renders the overlay's contents, for a surface to hold: a title with an optional close button,
// a search box and the shortcuts that match it, in groups. `inputRef` reaches the search box,
// so the overlay's opener can give it the keyboard.
//
export function ShortcutsList({ onClose, inputRef }: { onClose?: () => void; inputRef?: Ref<HTMLInputElement> }): ReactNode {
    const [search, setSearch] = useState("");
    const groups = filterShortcuts(search);

    return (
        <div>
            <div
                className="flex items-center"
                style={{
                    gap: "var(--space-2)",
                    padding: "var(--space-3) var(--space-3) var(--space-2) var(--space-4)",
                }}
            >
                <span className="flex-1" style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)" }}>
                    Keyboard shortcuts
                </span>
                {onClose ? (
                    <IconButton aria-label="Close" size="small" onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </IconButton>
                ) : undefined}
            </div>
            <div
                className="flex items-center"
                style={{
                    gap: "var(--space-2)",
                    margin: "0 var(--space-4) var(--space-2)",
                    padding: "var(--space-1) var(--space-3)",
                    border: "1px solid var(--color-border-control)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-text-muted)",
                }}
            >
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-md)" }} />
                <InputBase
                    fullWidth
                    placeholder="Search shortcuts"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    inputRef={inputRef}
                    slotProps={{
                        input: {
                            "aria-label": "Search shortcuts",
                        },
                    }}
                    sx={{
                        color: "var(--color-text)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-md)",
                        "& input::placeholder": {
                            color: "var(--color-text-muted)",
                            opacity: 1,
                        },
                    }}
                />
            </div>
            {groups.length === 0 ? (
                <div style={{ padding: "var(--space-4)", color: "var(--color-text-muted)" }}>No shortcut matches "{search}".</div>
            ) : (
                <div style={{ maxHeight: "360px", overflowY: "auto", padding: "0 var(--space-1) var(--space-2)" }}>
                    {groups.map(group => (
                        <List key={group.title} dense disablePadding aria-label={group.title} subheader={<ListSubheader component="div">{group.title}</ListSubheader>}>
                            {group.shortcuts.map(shortcut => (
                                <ListItem key={shortcut.action} sx={{ padding: "var(--space-1) var(--space-3)", gap: "var(--space-2)", alignItems: "baseline" }}>
                                    <ListItemText primary={shortcut.action} sx={{ flex: "0 1 auto" }} />
                                    <ShortcutLeader />
                                    <KeyCaps keys={shortcut.keys} />
                                </ListItem>
                            ))}
                        </List>
                    ))}
                </div>
            )}
        </div>
    );
}

//
// Returns true when `target` is a place where typing enters text, so a "?" typed there is a
// character and not the shortcut.
//
function isTextEntry(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

//
// Renders a button that opens the overlay over the page, and listens for "?" anywhere outside a
// text box to open it too. Only the first panel on the page listens, so one "?" opens one
// overlay. The overlay mounts inside the panel, so it takes the panel's theme.
//
export function ShortcutsOverlayOpener(): ReactNode {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const panelTheme = useContext(PanelThemeContext);
    const { components } = useSearch({
        strict: false,
    });
    const isFirstPanel = modeThemes(components)[0] === panelTheme;

    useEffect(() => {
        if (!isFirstPanel) {
            return undefined;
        }
        function onKeyDown(event: KeyboardEvent): void {
            if (event.key === "?" && !isTextEntry(event.target)) {
                event.preventDefault();
                setIsOpen(true);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isFirstPanel]);

    return (
        <div ref={wrapperRef}>
            <Button variant="outlined" onClick={() => setIsOpen(true)}>
                Show shortcuts
            </Button>
            <Dialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
                container={() => wrapperRef.current}
                maxWidth={false}
                slotProps={{
                    //
                    // The search box takes the keyboard once the overlay has opened, after the
                    // dialog has moved focus inside itself.
                    //
                    transition: {
                        onEntered: () => searchRef.current?.focus(),
                    },
                    paper: {
                        "aria-label": "Keyboard shortcuts",
                        sx: {
                            width: "520px",
                            maxWidth: "calc(100% - var(--space-8))",
                        },
                    },
                }}
            >
                <ShortcutsList onClose={() => setIsOpen(false)} inputRef={searchRef} />
            </Dialog>
        </div>
    );
}

//
// Renders one section per view of the overlay, each shown in the themes of the current mode.
//
export function ShortcutsPage(): ReactNode {
    return (
        <div>
            <Section
                title="Overlay"
                description="Every shortcut in groups, each action with its keys drawn as key caps. Type in the search box to narrow the list by action or key."
            >
                <Paper variant="overlay" sx={{ width: "520px", maxWidth: "100%", overflow: "hidden" }}>
                    <ShortcutsList />
                </Paper>
            </Section>

            <Section
                title="Opened over the page"
                description='Press "?" anywhere outside a text box, or the button, to open the overlay over the page. The search box takes the keyboard. Escape, the close button or a click outside closes it.'
            >
                <ShortcutsOverlayOpener />
            </Section>
        </div>
    );
}
