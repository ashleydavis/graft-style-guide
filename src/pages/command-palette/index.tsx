//
// The command palette page: a search box over a list of every command, opened with Ctrl+K,
// that narrows as you type and runs the highlighted command on Enter. Built from MUI's Dialog,
// InputBase and List parts.
//

import { useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowDown,
    faArrowUp,
    faArrowsRotate,
    faBoxArchive,
    faCodeBranch,
    faMagnifyingGlass,
    faTag,
    type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";
import { Shortcut, shortcutRowStyle } from "../../components/shortcut";

//
// One command the palette can run.
//
interface ICommand {
    //
    // The command's name.
    //
    label: string;

    //
    // The icon before the name.
    //
    icon: IconDefinition;

    //
    // The keys that run it, shown at the right.
    //
    shortcut?: string;
}

//
// Every command in the example palette.
//
const commands: ICommand[] = [
    {
        label: "Fetch",
        icon: faArrowsRotate,
        shortcut: "F5",
    },
    {
        label: "Pull",
        icon: faArrowDown,
        shortcut: "Ctrl+Shift+L",
    },
    {
        label: "Push",
        icon: faArrowUp,
        shortcut: "Ctrl+Shift+P",
    },
    {
        label: "New branch",
        icon: faCodeBranch,
        shortcut: "B",
    },
    {
        label: "Check out branch",
        icon: faCodeBranch,
    },
    {
        label: "New tag",
        icon: faTag,
        shortcut: "T",
    },
    {
        label: "Stash changes",
        icon: faBoxArchive,
        shortcut: "Ctrl+Shift+S",
    },
];

//
// Renders the palette's contents, for a surface to hold: the search box and the commands whose
// names contain the search, with
// the first match highlighted. Up and Down move the highlight and Enter runs the highlighted
// command, which here calls `onRun` with its name. `inputRef` reaches the search box, so the
// palette's opener can give it the keyboard.
//
export function CommandPalette({ onRun, inputRef }: { onRun: (label: string) => void; inputRef?: Ref<HTMLInputElement> }): ReactNode {
    const [search, setSearch] = useState("");
    const [highlighted, setHighlighted] = useState(0);
    const matches = commands.filter(command => command.label.toLowerCase().includes(search.toLowerCase()));

    function onKeyDown(event: KeyboardEvent): void {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlighted(Math.min(highlighted + 1, matches.length - 1));
        }
        else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted(Math.max(highlighted - 1, 0));
        }
        else if (event.key === "Enter" && matches[highlighted]) {
            event.preventDefault();
            onRun(matches[highlighted].label);
        }
    }

    return (
        <div>
            <div
                className="flex items-center"
                style={{
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    borderBottom: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                }}
            >
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-md)" }} />
                <InputBase
                    inputRef={inputRef}
                    fullWidth
                    placeholder="Type a command"
                    value={search}
                    onChange={event => {
                        setSearch(event.target.value);
                        setHighlighted(0);
                    }}
                    onKeyDown={onKeyDown}
                    slotProps={{
                        input: {
                            "aria-label": "Command",
                        },
                    }}
                    sx={{
                        color: "var(--color-text)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-lg)",
                        "& input::placeholder": {
                            color: "var(--color-text-muted)",
                            opacity: 1,
                        },
                    }}
                />
            </div>
            {matches.length === 0 ? (
                <div style={{ padding: "var(--space-4) var(--space-3)", color: "var(--color-text-muted)" }}>No command matches "{search}".</div>
            ) : (
                <List aria-label="Commands" sx={{ padding: "var(--space-1)", maxHeight: "280px", overflowY: "auto" }}>
                    {matches.map((command, index) => (
                        <ListItemButton
                            key={command.label}
                            selected={index === highlighted}
                            onClick={() => onRun(command.label)}
                            onMouseMove={() => setHighlighted(index)}
                            sx={shortcutRowStyle}
                        >
                            <ListItemIcon>
                                <FontAwesomeIcon icon={command.icon} />
                            </ListItemIcon>
                            <ListItemText primary={command.label} />
                            {command.shortcut ? <Shortcut keys={command.shortcut} /> : undefined}
                        </ListItemButton>
                    ))}
                </List>
            )}
        </div>
    );
}

//
// Renders a button that opens the palette over the page near the top, as Ctrl+K does in Graft.
// Running a command closes it. The palette mounts inside the panel, so it takes the panel's
// theme.
//
export function CommandPaletteOpener(): ReactNode {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [lastRun, setLastRun] = useState("");

    function run(label: string): void {
        setLastRun(label);
        setIsOpen(false);
    }

    return (
        <div ref={wrapperRef} className="flex flex-wrap items-center" style={{ gap: "var(--space-3)" }}>
            <Button variant="outlined" onClick={() => setIsOpen(true)}>
                Open command palette
            </Button>
            {lastRun ? <span style={{ color: "var(--color-text-muted)" }}>Ran: {lastRun}</span> : undefined}
            <Dialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
                container={() => wrapperRef.current}
                maxWidth={false}
                sx={{
                    "& .MuiDialog-container": {
                        alignItems: "flex-start",
                    },
                }}
                slotProps={{
                    //
                    // The search box takes the keyboard once the palette has opened, after the
                    // dialog has moved focus inside itself.
                    //
                    transition: {
                        onEntered: () => searchRef.current?.focus(),
                    },
                    paper: {
                        "aria-label": "Command palette",
                        sx: {
                            marginTop: "15vh",
                            width: "480px",
                            maxWidth: "calc(100% - var(--space-8))",
                            overflow: "hidden",
                        },
                    },
                }}
            >
                <CommandPalette onRun={run} inputRef={searchRef} />
            </Dialog>
        </div>
    );
}

//
// Renders one section per view of the palette, each shown in the themes of the current mode.
//
export function CommandPalettePage(): ReactNode {
    const [lastRun, setLastRun] = useState("");

    return (
        <div>
            <Section
                title="Palette"
                description="Commands with their shortcuts, narrowed by a search box."
            >
                <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                    <Paper variant="overlay" sx={{ width: "480px", maxWidth: "100%", overflow: "hidden" }}>
                        <CommandPalette onRun={setLastRun} />
                    </Paper>
                    {lastRun ? <span style={{ color: "var(--color-text-muted)" }}>Ran: {lastRun}</span> : undefined}
                </div>
            </Section>

            <Section title="Opened over the page" description="The palette over a backdrop.">
                <CommandPaletteOpener />
            </Section>
        </div>
    );
}
