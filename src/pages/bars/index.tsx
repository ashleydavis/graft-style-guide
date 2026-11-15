//
// The toolbar and status bar page: the row of actions along the top of Graft's window and the
// strip of repository state along the bottom.
//

import { useState, type ReactNode } from "react";
import Popover from "@mui/material/Popover";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import MuiToolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowDown,
    faArrowUp,
    faArrowsRotate,
    faBoxArchive,
    faCircle,
    faCodeBranch,
    faGear,
    type IconDefinition,
    faSliders,
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";
import { Tip } from "../../components/tip";
import { OptionRow } from "../diff/components/file-diff-card";

//
// Renders an icon button with a tooltip naming it.
//
export function ToolbarIconButton({ label, icon }: { label: string; icon: IconDefinition }): ReactNode {
    return (
        <Tooltip title={label}>
            <IconButton aria-label={label} size="small">
                <FontAwesomeIcon icon={icon} />
            </IconButton>
        </Tooltip>
    );
}

//
// Renders a toolbar action as an outlined button with its icon and its name, for a toolbar set to
// show names on its buttons.
//
export function ToolbarLabelledButton({ label, icon }: { label: string; icon: IconDefinition }): ReactNode {
    return (
        <Button variant="outlined" size="small" startIcon={<FontAwesomeIcon icon={icon} />}>
            {label}
        </Button>
    );
}

//
// What the toolbar's configuration dropdown sets.
//
interface IToolbarOptions {
    //
    // True to show each action's name beside its icon.
    //
    showNames: boolean;

    //
    // True to show the Stash button.
    //
    showStash: boolean;

    //
    // True to fetch in the background.
    //
    fetchInBackground: boolean;
}

//
// Renders the toolbar's configuration button, which opens a dropdown dialog under it with the
// toolbar's settings, each with a switch that takes effect straight away.
//
export function ToolbarOptions({ options, onChange }: { options: IToolbarOptions; onChange: (options: IToolbarOptions) => void }): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    return (
        <>
            <Tooltip title={<Tip title="Toolbar options" detail="How the toolbar shows and what it does." />}>
                <IconButton size="small" aria-label="Toolbar options" aria-haspopup="dialog" aria-expanded={anchor !== undefined} onClick={event => setAnchor(event.currentTarget)}>
                    <FontAwesomeIcon icon={faSliders} />
                </IconButton>
            </Tooltip>
            <Popover
                open={anchor !== undefined}
                anchorEl={anchor}
                onClose={() => setAnchor(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { role: "dialog", "aria-label": "Toolbar options" } }}
            >
                <div className="flex flex-col" style={{ gap: "var(--space-3)", padding: "var(--space-4)", width: "min(calc(var(--space-8) * 11), calc(100vw - var(--space-8)))" }}>
                    <OptionRow
                        label="Button names"
                        detail="Show each action's name beside its icon."
                        control={<Switch checked={options.showNames} onChange={event => onChange({ ...options, showNames: event.target.checked })} slotProps={{ input: { "aria-label": "Button names" } }} />}
                    />
                    <OptionRow
                        label="Stash button"
                        detail="Show the button that stashes the changes."
                        control={<Switch checked={options.showStash} onChange={event => onChange({ ...options, showStash: event.target.checked })} slotProps={{ input: { "aria-label": "Stash button" } }} />}
                    />
                    <OptionRow
                        label="Fetch in the background"
                        detail="Fetch from the remotes every few minutes."
                        control={<Switch checked={options.fetchInBackground} onChange={event => onChange({ ...options, fetchInBackground: event.target.checked })} slotProps={{ input: { "aria-label": "Fetch in the background" } }} />}
                    />
                </div>
            </Popover>
        </>
    );
}

//
// Renders the toolbar: the branch, the Git actions in a group, a divider and, at the far end,
// the configuration button that opens the toolbar's options and the settings button. The options
// take effect straight away. On a narrow screen the items wrap onto a second line.
//
export function Toolbar(): ReactNode {
    const [options, setOptions] = useState<IToolbarOptions>({ showNames: false, showStash: true, fetchInBackground: true });
    const ActionButton = options.showNames ? ToolbarLabelledButton : ToolbarIconButton;
    return (
        <Paper variant="outlined">
            <MuiToolbar variant="dense" disableGutters role="toolbar" aria-label="Repository actions">
                <Button variant="text" size="small" startIcon={<FontAwesomeIcon icon={faCodeBranch} />} sx={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>
                    main
                </Button>
                <Divider orientation="vertical" flexItem sx={{ margin: "var(--space-1) var(--space-1)" }} />
                <ActionButton label="Fetch" icon={faArrowsRotate} />
                <ActionButton label="Pull" icon={faArrowDown} />
                <ActionButton label="Push" icon={faArrowUp} />
                {options.showStash ? <ActionButton label="Stash" icon={faBoxArchive} /> : undefined}
                <span className="flex-1" />
                <ToolbarOptions options={options} onChange={setOptions} />
                <ToolbarIconButton label="Settings" icon={faGear} />
            </MuiToolbar>
        </Paper>
    );
}

//
// One item of the status bar.
//
interface IStatusBarItem {
    //
    // The words shown.
    //
    label: string;

    //
    // The colour token of the dot before the words, absent for no dot.
    //
    colour?: string;
}

//
// The items of the status bar, left to right.
//
const statusBarItems: IStatusBarItem[] = [
    {
        label: "main",
    },
    {
        label: "2 ahead, 1 behind",
        colour: "var(--color-warning)",
    },
    {
        label: "1 conflict",
        colour: "var(--color-danger)",
    },
    {
        label: "Fetched 2 minutes ago",
        colour: "var(--color-success)",
    },
];

//
// Renders the status bar: small muted text with a coloured dot for each state that needs one.
//
export function StatusBar(): ReactNode {
    return (
        <Paper
            variant="outlined"
            role="status"
            className="flex flex-wrap items-center"
            sx={{
                gap: "var(--space-1) var(--space-4)",
                padding: "var(--space-1) var(--space-3)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
            }}
        >
            {statusBarItems.map(item => (
                <span key={item.label} className="inline-flex items-center" style={{ gap: "var(--space-1)" }}>
                    {item.colour ? <FontAwesomeIcon icon={faCircle} style={{ fontSize: "var(--space-2)", color: item.colour }} /> : undefined}
                    {item.label}
                </span>
            ))}
        </Paper>
    );
}

//
// Renders the toolbar examples, each shown in the themes of the current mode.
//
export function ToolbarPage(): ReactNode {
    return (
        <div>
            <Section
                title="Toolbar"
                description="The branch, the Git actions and a configuration dropdown."
            >
                <Toolbar />
            </Section>
        </div>
    );
}

//
// Renders the status bar example, shown in the themes of the current mode.
//
export function StatusBarPage(): ReactNode {
    return (
        <div>
            <Section title="Status bar" description="The repository's state, with a coloured dot for each state that needs attention.">
                <StatusBar />
            </Section>
        </div>
    );
}
