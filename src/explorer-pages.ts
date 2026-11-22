//
// The list of pages in the style explorer, which the sidebar searches and the router shows.
//

import type { ComponentType } from "react";
import { OverviewPage } from "./pages/overview";
import { ButtonPage } from "./pages/button";
import { TextBoxPage } from "./pages/text-box";
import { DialogPage } from "./pages/dialog";
import { ChoicesPage } from "./pages/choices";
import { choices } from "./pages/choices/options";
import { FontsPage } from "./pages/fonts";
import { IconsPage } from "./pages/icons";
import { CommitGraphPage } from "./pages/commit-graph";
import { SelectPage } from "./pages/select";
import { CheckboxPage, RadioPage, SwitchPage } from "./pages/toggles";
import { TabsPage } from "./pages/tabs";
import { MenuPage } from "./pages/menu";
import { TooltipPage } from "./pages/tooltip";
import { ListPage, TreePage } from "./pages/tree";
import { TablePage } from "./pages/table";
import { StatusBarPage, ToolbarPage } from "./pages/bars";
import { SidebarPage } from "./pages/sidebar";
import { BannersPage, NotificationsPage } from "./pages/notifications";
import { ProgressPage } from "./pages/progress";
import { BadgesPage } from "./pages/badges";
import { CommandPalettePage } from "./pages/command-palette";
import { ShortcutsPage } from "./pages/shortcuts";
import { CommitExplorerPage } from "./pages/commit-explorer";
import { GitCommandsPanelPage } from "./pages/git-commands-panel";
import { DiffPage } from "./pages/diff";
import { ChangesPage } from "./pages/changes";
import { DirectoryBrowserPage } from "./pages/directory-browser";

//
// One page in the explorer.
//
//
// The groups of the sidebar, in the order it lists them, with their headings.
//
export const PAGE_GROUPS = [
    { id: "app", heading: "App features" },
    { id: "components", heading: "Basic components" },
] as const;

//
// A sidebar group's id.
//
export type PageGroup = (typeof PAGE_GROUPS)[number]["id"];

export interface IExplorerPage {
    //
    // The page's part of the URL, as in /page/<id>.
    //
    id: string;

    //
    // The name shown in the sidebar and above the page.
    //
    title: string;

    //
    // Other words the search box matches, so a search for "input" finds the text box.
    //
    keywords: string[];

    //
    // The component that renders the page.
    //
    component: ComponentType;

    //
    // The sidebar group the page is listed under: a feature of the Graft app, or a basic component
    // the features are built from. A page about the style itself, such as the overview, has none
    // and is listed above the groups.
    //
    group?: PageGroup;
}

//
// Every page in the explorer, in sidebar order. The overview comes first because it is the
// page the explorer opens on. The choices page is listed only while a choice is open.
//
export const explorerPages: IExplorerPage[] = [
    {
        id: "overview",
        title: "Overview",
        keywords: ["colour", "color", "palette", "type", "spacing", "radius", "shadow", "motion"],
        component: OverviewPage,
    },
    {
        id: "fonts",
        title: "Fonts",
        keywords: ["type", "typography", "text", "mono", "monospace", "code", "mona", "monaspace"],
        component: FontsPage,
    },
    {
        id: "icons",
        title: "Icons",
        keywords: ["icon", "font awesome", "fontawesome", "glyph", "symbol", "brands", "solid"],
        component: IconsPage,
    },
    {
        id: "commit-explorer",
        title: "Commit explorer",
        keywords: ["commits", "history", "log", "diff", "panes", "columns", "keys"],
        component: CommitExplorerPage,
        group: "app",
    },
    {
        id: "changes",
        title: "Commit",
        keywords: ["staging", "stage", "unstage", "commit", "working tree", "amend", "no-verify"],
        component: ChangesPage,
        group: "app",
    },
    {
        id: "diff",
        title: "Diff",
        keywords: ["changes", "unified", "side by side", "split", "hunk", "patch", "word"],
        component: DiffPage,
        group: "app",
    },
    {
        id: "directory-browser",
        title: "Directory browser",
        keywords: ["open", "repository", "repo", "directories", "browse", "home", "path"],
        component: DirectoryBrowserPage,
        group: "app",
    },
    {
        id: "git-commands-panel",
        title: "Git command",
        keywords: ["help", "right sidebar", "context help", "terminal", "commands"],
        component: GitCommandsPanelPage,
        group: "app",
    },
    {
        id: "commit-graph",
        title: "Commit graph",
        keywords: ["lanes", "branch", "merge", "history", "commits"],
        component: CommitGraphPage,
        group: "app",
    },
    ...(choices.length > 0
        ? [
              {
                  id: "choices",
                  title: "Choices",
                  keywords: ["options", "pick", "decide"],
                  component: ChoicesPage,
              },
          ]
        : []),
    {
        id: "button",
        title: "Button",
        keywords: ["action", "click"],
        component: ButtonPage,
        group: "components",
    },
    {
        id: "text-box",
        title: "Text box",
        keywords: ["input", "text field", "search"],
        component: TextBoxPage,
        group: "components",
    },
    {
        id: "select",
        title: "Select",
        keywords: ["dropdown", "drop-down", "combo", "picker", "options"],
        component: SelectPage,
        group: "components",
    },
    {
        id: "checkbox",
        title: "Checkbox",
        keywords: ["checkbox", "tick", "mixed", "option"],
        component: CheckboxPage,
        group: "components",
    },
    {
        id: "radio",
        title: "Radio buttons",
        keywords: ["radio", "option", "choice"],
        component: RadioPage,
        group: "components",
    },
    {
        id: "switch",
        title: "Switch",
        keywords: ["switch", "toggle", "setting"],
        component: SwitchPage,
        group: "components",
    },
    {
        id: "tabs",
        title: "Tabs",
        keywords: ["tab", "views", "switcher"],
        component: TabsPage,
        group: "components",
    },
    {
        id: "menu",
        title: "Menu",
        keywords: ["context menu", "right-click", "actions", "dropdown"],
        component: MenuPage,
        group: "components",
    },
    {
        id: "tooltip",
        title: "Tooltip",
        keywords: ["hint", "hover", "title"],
        component: TooltipPage,
        group: "components",
    },
    {
        id: "dialog",
        title: "Dialog",
        keywords: ["modal", "popup", "confirm", "form"],
        component: DialogPage,
        group: "components",
    },
    {
        id: "list",
        title: "List",
        keywords: ["rows", "branches", "filter"],
        component: ListPage,
        group: "components",
    },
    {
        id: "tree",
        title: "Tree",
        keywords: ["file tree", "directories", "filter"],
        component: TreePage,
        group: "components",
    },
    {
        id: "table",
        title: "Table",
        keywords: ["commit list", "grid", "rows", "columns"],
        component: TablePage,
        group: "components",
    },
    {
        id: "toolbar",
        title: "Toolbar",
        keywords: ["toolbar", "actions", "configuration", "settings"],
        component: ToolbarPage,
        group: "components",
    },
    {
        id: "status-bar",
        title: "Status bar",
        keywords: ["status", "footer"],
        component: StatusBarPage,
        group: "components",
    },
    {
        id: "sidebar",
        title: "Sidebar",
        keywords: ["navigation", "branches", "remotes", "tags", "stashes"],
        component: SidebarPage,
        group: "components",
    },
    {
        id: "banners",
        title: "Banners",
        keywords: ["alert", "banner", "message", "error"],
        component: BannersPage,
        group: "components",
    },
    {
        id: "notifications",
        title: "Notifications",
        keywords: ["toast", "snackbar", "message", "notification"],
        component: NotificationsPage,
        group: "components",
    },
    {
        id: "progress",
        title: "Progress",
        keywords: ["spinner", "loading", "progress bar", "skeleton"],
        component: ProgressPage,
        group: "components",
    },
    {
        id: "badges",
        title: "Badges",
        keywords: ["chip", "badge", "ref", "branch", "tag", "remote", "label"],
        component: BadgesPage,
        group: "components",
    },
    {
        id: "command-palette",
        title: "Command palette",
        keywords: ["commands", "search", "ctrl+k", "launcher"],
        component: CommandPalettePage,
        group: "app",
    },
    {
        id: "shortcuts",
        title: "Shortcuts overlay",
        keywords: ["keyboard", "hotkeys", "keys", "help", "?"],
        component: ShortcutsPage,
        group: "app",
    },
];
