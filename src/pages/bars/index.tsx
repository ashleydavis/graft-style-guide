//
// The toolbar and status bar page: the row of actions along the top of Graft's window and the
// strip of repository state along the bottom.
//

import type { ReactNode } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";

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
// Renders the toolbar: the branch, the Git actions in a group, a divider and the settings
// button at the far end. On a narrow screen the items wrap onto a second line.
//
export function Toolbar(): ReactNode {
    return (
        <Paper variant="outlined">
            <MuiToolbar variant="dense" disableGutters role="toolbar" aria-label="Repository actions">
                <Button variant="text" size="small" startIcon={<FontAwesomeIcon icon={faCodeBranch} />} sx={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>
                    main
                </Button>
                <Divider orientation="vertical" flexItem sx={{ margin: "var(--space-1) var(--space-1)" }} />
                <ToolbarIconButton label="Fetch" icon={faArrowsRotate} />
                <ToolbarIconButton label="Pull" icon={faArrowDown} />
                <ToolbarIconButton label="Push" icon={faArrowUp} />
                <ToolbarIconButton label="Stash" icon={faBoxArchive} />
                <span className="flex-1" />
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
// Renders one section per bar, each shown in the themes of the current mode.
//
export function BarsPage(): ReactNode {
    return (
        <div>
            <Section
                title="Toolbar"
                description="The current branch, then the Git actions as icon buttons with tooltips, and settings at the far end. A divider separates groups."
            >
                <Toolbar />
            </Section>

            <Section title="Status bar" description="The state of the repository in small muted text, with a coloured dot for each state that needs attention.">
                <StatusBar />
            </Section>
        </div>
    );
}
