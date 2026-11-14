//
// The menu page: the menu a button opens and the context menu a right-click opens, built from
// MUI's Menu, with icons, keyboard shortcuts, dividers, a danger item and a disabled item.
//

import { useState, type MouseEvent, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faCodeBranch,
    faCopy,
    faRotateLeft,
    faTag,
    faTrash,
    type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";
import { Shortcut, shortcutRowStyle } from "../../components/shortcut";

//
// One item of the commit menu.
//
interface ICommitMenuItem {
    //
    // The words on the item.
    //
    label: string;

    //
    // The icon before the words.
    //
    icon: IconDefinition;

    //
    // The keys that do the same thing, shown at the right.
    //
    shortcut?: string;

    //
    // True for an item that loses work, drawn in the danger colour.
    //
    isDanger?: boolean;

    //
    // True for an item that cannot be used right now.
    //
    isDisabled?: boolean;

    //
    // True when a divider comes before the item.
    //
    startsGroup?: boolean;
}

//
// The items of the commit menu, in order.
//
const commitMenuItems: ICommitMenuItem[] = [
    {
        label: "New branch here",
        icon: faCodeBranch,
        shortcut: "B",
    },
    {
        label: "New tag here",
        icon: faTag,
        shortcut: "T",
    },
    {
        label: "Copy hash",
        icon: faCopy,
        shortcut: "Ctrl+C",
        startsGroup: true,
    },
    {
        label: "Revert (uncommitted changes)",
        icon: faRotateLeft,
        isDisabled: true,
        startsGroup: true,
    },
    {
        label: "Reset to here",
        icon: faTrash,
        isDanger: true,
    },
];

//
// Renders the items of the commit menu, with an optional `onPick` that runs when one is chosen.
//
export function CommitMenuItems({ onPick }: { onPick?: () => void }): ReactNode[] {
    return commitMenuItems.flatMap(item => [
        ...(item.startsGroup ? [<Divider key={`${item.label}-divider`} />] : []),
        <MenuItem
            key={item.label}
            disabled={item.isDisabled}
            onClick={onPick}
            sx={{
                ...shortcutRowStyle,
                ...(item.isDanger ? { color: "var(--color-danger)", "& .MuiListItemIcon-root": { color: "var(--color-danger)" } } : {}),
            }}
        >
            <ListItemIcon>
                <FontAwesomeIcon icon={item.icon} />
            </ListItemIcon>
            <ListItemText>{item.label}</ListItemText>
            {item.shortcut ? <Shortcut keys={item.shortcut} /> : undefined}
        </MenuItem>,
    ]);
}

//
// Renders a button that opens the commit menu below it.
//
export function MenuButton(): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);

    return (
        <div>
            <Button variant="outlined" endIcon={<FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "var(--icon-sm)" }} />} onClick={event => setAnchor(event.currentTarget)}>
                Commit actions
            </Button>
            <Menu anchorEl={anchor} open={anchor !== undefined} onClose={() => setAnchor(undefined)}>
                {CommitMenuItems({ onPick: () => setAnchor(undefined) })}
            </Menu>
        </div>
    );
}

//
// Renders a commit row that opens the commit menu at the pointer when right-clicked.
//
export function ContextMenuRow(): ReactNode {
    const [position, setPosition] = useState<{ left: number; top: number } | undefined>(undefined);

    function openMenu(event: MouseEvent): void {
        event.preventDefault();
        setPosition({ left: event.clientX, top: event.clientY });
    }

    return (
        <div>
            <Paper
                variant="outlined"
                onContextMenu={openMenu}
                className="flex"
                sx={{
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    cursor: "context-menu",
                }}
            >
                <span className="flex-1 truncate">Right-click this commit: Fixed the merge base lookup</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>e4f5a6b</span>
            </Paper>
            <Menu
                open={position !== undefined}
                onClose={() => setPosition(undefined)}
                anchorReference="anchorPosition"
                anchorPosition={position}
            >
                {CommitMenuItems({ onPick: () => setPosition(undefined) })}
            </Menu>
        </div>
    );
}

//
// Renders one section per kind of menu, each shown in the themes of the current mode.
//
export function MenuPage(): ReactNode {
    return (
        <div>
            <Section
                title="Menu"
                description="The menu drawn open: icons, keyboard shortcuts at the right, dividers between groups, an item that cannot be used and an item that loses work in the danger colour."
            >
                <Paper variant="overlay" sx={{ display: "inline-block", maxWidth: "100%" }}>
                    <MenuList aria-label="Commit actions" sx={{ padding: "var(--space-2) var(--space-1)" }}>
                        {CommitMenuItems({})}
                    </MenuList>
                </Paper>
            </Section>

            <Section title="Opened from a button" description="A button that opens the menu below it. Choosing an item, pressing Escape or clicking away closes it.">
                <MenuButton />
            </Section>

            <Section title="Context menu" description="The same menu opened at the pointer by a right-click.">
                <ContextMenuRow />
            </Section>
        </div>
    );
}
