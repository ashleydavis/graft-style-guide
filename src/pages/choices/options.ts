import type { ComponentType } from "react";
import { BadgePreview } from "./previews/badge-preview";
import { BannerPreview } from "./previews/banner-preview";
import { SidebarPreview } from "./previews/sidebar-preview";
import { StatusTextPreview } from "./previews/status-text-preview";
import { SwitchPreview } from "./previews/switch-preview";
import { TablePreview } from "./previews/table-preview";
import { TabsPreview } from "./previews/tabs-preview";
import { TooltipPreview } from "./previews/tooltip-preview";
import { TreePreview } from "./previews/tree-preview";

//
// The candidate values for each open choice in the style guide. Each option sets role tokens
// for the light and the dark theme. The chosen option's values move into graft.css, so these
// values live here only while the choice is open.
//

//
// One candidate for a choice.
//
export interface ITokenOption {
    //
    // The letter the developer picks it by.
    //
    id: string;

    //
    // A short name for the option.
    //
    name: string;

    //
    // What the option is like and what it aims for.
    //
    description: string;

    //
    // The tokens it sets in the light theme, by CSS variable name.
    //
    light: Record<string, string>;

    //
    // The tokens it sets in the dark theme, by CSS variable name.
    //
    dark: Record<string, string>;
}

//
// One open choice and its candidates.
//
export interface IChoice {
    //
    // The heading of the choice's section.
    //
    title: string;

    //
    // What the choice decides and what to look at in the previews.
    //
    description: string;

    //
    // The candidates, in the order they are shown.
    //
    options: ITokenOption[];

    //
    // True when the previews draw the focus ring on the Fetch button, as for a focus choice.
    //
    showFocus?: boolean;

    //
    // True when the previews draw the first commit row and the first menu item with the hover
    // background, as for a hover choice.
    //
    showHover?: boolean;

    //
    // True when the previews start with the commit menu closed, so it covers nothing the choice
    // changes.
    //
    menuStartsClosed?: boolean;

    //
    // The lane colours the previews' commit graph draws, from left to right. Absent means lanes
    // 1, 2 and 3.
    //
    lanes?: number[];

    //
    // The preview each option is drawn on, given the option's letter, in place of the small
    // Graft screen. Absent means the small Graft screen.
    //
    Preview?: ComponentType<{ optionId: string }>;
}

//
// Returns the light and dark token sets for tokens that have the same value in both themes,
// such as sizes.
//
export function bothThemes(tokens: Record<string, string>): Pick<ITokenOption, "light" | "dark"> {
    return {
        light: tokens,
        dark: tokens,
    };
}

//
// The bright red of the last option of every choice.
//
const SPOT_RED = "#ff0000";

//
// Returns the last option of a choice: every token in `tokens` set to bright red in both
// themes, so the preview shows where the choice's tokens appear. Tokens in `overrides` take the
// value given there instead, as for text that sits on a red background.
//
export function spotIt(tokens: string[], overrides: Record<string, string> = {}): ITokenOption {
    const values: Record<string, string> = {};
    for (const token of tokens) {
        values[token] = overrides[token] ?? SPOT_RED;
    }
    return {
        id: "D",
        name: "Spot it",
        description: "Not a candidate. Paints this choice in bright red to show where it appears.",
        ...bothThemes(values),
    };
}

//
// Every open choice, in the order of the todo list.
//
export const choices: IChoice[] = [
    {
        title: "Status colours as text",
        description:
            "The new file tree and menus put status colours on rows as words: the M, A, D and R letters and the danger item of a menu. In light they fall to 3.8 to 1 on the selected row and 4.4 to 1 on the hover row, under the 4.5 to 1 text needs. Each option darkens the success, warning, danger and info colours in light, which also darkens their dots, icons and the danger button. Dark stays as it is, at 4.6 to 1 or more.",
        Preview: StatusTextPreview,
        options: [
            {
                id: "A",
                name: "Just past",
                description: "The least change: 4.6 to 1 on the selected row and 5.9 to 1 on the panel.",
                light: {
                    "--color-success": "#157439",
                    "--color-warning": "#a54a0b",
                    "--color-danger": "#c51f1f",
                    "--color-info": "#2159e2",
                },
                dark: {
                    "--color-success": "#4ade80",
                    "--color-warning": "#fbbf24",
                    "--color-danger": "#f87171",
                    "--color-info": "#60a5fa",
                },
            },
            {
                id: "B",
                name: "Deep",
                description: "The next shades down: 5.1 to 1 or more on the selected row and 6.5 to 1 or more on the panel.",
                light: {
                    "--color-success": "#166534",
                    "--color-warning": "#92400e",
                    "--color-danger": "#b91c1c",
                    "--color-info": "#1d4ed8",
                },
                dark: {
                    "--color-success": "#4ade80",
                    "--color-warning": "#fbbf24",
                    "--color-danger": "#f87171",
                    "--color-info": "#60a5fa",
                },
            },
            spotIt(["--color-success", "--color-warning", "--color-danger", "--color-info"]),
        ],
    },
    {
        title: "Tabs",
        description: "How the selected tab is marked. Click the tabs to switch them.",
        Preview: TabsPreview,
        options: [
            {
                id: "A",
                name: "Underline",
                description: "An accent line under the selected tab, on a rule across the row.",
                ...bothThemes({}),
            },
            {
                id: "B",
                name: "Segmented",
                description: "The tabs sit in a grey tray and the selected one is a raised panel.",
                ...bothThemes({}),
            },
            {
                id: "C",
                name: "Folder",
                description: "The selected tab joins the panel below it, like a folder tab.",
                ...bothThemes({}),
            },
            spotIt(["--color-accent"]),
        ],
    },
    {
        title: "Switch",
        description: "The look of an on and off switch. Click them to switch them.",
        Preview: SwitchPreview,
        options: [
            {
                id: "A",
                name: "Standard",
                description: "MUI's own shape: a slim track with a round knob that overhangs it.",
                ...bothThemes({}),
            },
            {
                id: "B",
                name: "Compact",
                description: "A rounded track with the knob inside it, 36px wide.",
                ...bothThemes({}),
            },
            {
                id: "C",
                name: "Square",
                description: "The compact switch with square corners, matching the buttons.",
                ...bothThemes({}),
            },
            spotIt(["--color-accent", "--color-border-control"]),
        ],
    },
    {
        title: "Tooltip",
        description: "The look of the label that appears beside a button. Main text on every option is 16 to 1 or more.",
        Preview: TooltipPreview,
        options: [
            {
                id: "A",
                name: "Inverted",
                description: "Dark in light and light in dark, so it stands apart from the page.",
                ...bothThemes({}),
            },
            {
                id: "B",
                name: "Panel",
                description: "The panel colour with a border and shadow, like a small menu.",
                ...bothThemes({}),
            },
            spotIt(["--color-text"]),
        ],
    },
    {
        title: "Banners",
        description: "How a banner shows its status. The text stays in the main text colour in every option, at 13 to 1 or more.",
        Preview: BannerPreview,
        options: [
            {
                id: "A",
                name: "Bar",
                description: "A bar in the status colour down the left edge and a coloured icon.",
                ...bothThemes({}),
            },
            {
                id: "B",
                name: "Tinted",
                description: "A background tinted with the status colour and a coloured icon. Adds a tint token for each status colour.",
                light: {
                    "--color-info-subtle": "#dbeafe",
                    "--color-success-subtle": "#dcfce7",
                    "--color-warning-subtle": "#fef3c7",
                    "--color-danger-subtle": "#fee2e2",
                },
                dark: {
                    "--color-info-subtle": "#172554",
                    "--color-success-subtle": "#0f2e1a",
                    "--color-warning-subtle": "#3a2a0c",
                    "--color-danger-subtle": "#3b1215",
                },
            },
            {
                id: "C",
                name: "Outlined",
                description: "A border all round in the status colour and a coloured icon.",
                ...bothThemes({}),
            },
            spotIt(["--color-info", "--color-success", "--color-warning", "--color-danger"]),
        ],
    },
    {
        title: "Ref badges",
        description: "How HEAD, branches, remote branches and tags are told apart on a commit. The checked-out branch stays filled with the accent in every option.",
        Preview: BadgePreview,
        options: [
            {
                id: "A",
                name: "Grey with coloured icons",
                description: "Every badge is grey and its icon takes the colour of its kind.",
                ...bothThemes({}),
            },
            {
                id: "B",
                name: "Tinted",
                description: "Each badge is tinted with the colour of its kind. Adds tint tokens for the accent and status colours.",
                light: {
                    "--color-accent-subtle": "#ede9fe",
                    "--color-info-subtle": "#dbeafe",
                    "--color-warning-subtle": "#fef3c7",
                },
                dark: {
                    "--color-accent-subtle": "#2d2640",
                    "--color-info-subtle": "#172554",
                    "--color-warning-subtle": "#3a2a0c",
                },
            },
            {
                id: "C",
                name: "Outlined",
                description: "Each badge has a border in the colour of its kind and no fill.",
                ...bothThemes({}),
            },
            spotIt(["--color-raised"]),
        ],
    },
    {
        title: "Table rows",
        description: "How rows of a table are told apart. Move the pointer over the rows to see the hover background.",
        Preview: TablePreview,
        options: [
            {
                id: "A",
                name: "Dividers",
                description: "A thin line between rows.",
                ...bothThemes({}),
            },
            {
                id: "B",
                name: "Striped",
                description: "Every other row on the raised grey, with no lines.",
                ...bothThemes({}),
            },
            {
                id: "C",
                name: "Plain",
                description: "No lines or stripes. Rows are told apart by their spacing alone.",
                ...bothThemes({}),
            },
            spotIt(["--color-border"]),
        ],
    },
    {
        title: "Sidebar current item",
        description: "How the sidebar marks the view you are on. Muted and accent text pass 4.5 to 1 on every option.",
        Preview: SidebarPreview,
        options: [
            {
                id: "A",
                name: "Selected background",
                description: "The selected row's grey, the same as a selected commit.",
                ...bothThemes({}),
            },
            {
                id: "B",
                name: "Background and bar",
                description: "The selected grey with an accent bar down its left edge, like the selected commit row.",
                ...bothThemes({}),
            },
            {
                id: "C",
                name: "Accent text",
                description: "No background. The icon and name turn the accent colour and bold.",
                ...bothThemes({}),
            },
            spotIt(["--color-selected"]),
        ],
    },
    {
        title: "Tree guides",
        description: "Whether a file tree draws lines down each folder's contents.",
        Preview: TreePreview,
        options: [
            {
                id: "A",
                name: "Indent only",
                description: "Each level is indented, with no lines.",
                ...bothThemes({}),
            },
            {
                id: "B",
                name: "Guide lines",
                description: "A line in the border colour runs down each open folder's contents.",
                ...bothThemes({}),
            },
            spotIt(["--color-border"]),
        ],
    },
];
