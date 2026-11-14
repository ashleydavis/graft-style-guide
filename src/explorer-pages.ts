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
import { CommitGraphPage } from "./pages/commit-graph";
import { SelectPage } from "./pages/select";
import { TogglesPage } from "./pages/toggles";
import { TabsPage } from "./pages/tabs";
import { MenuPage } from "./pages/menu";
import { TooltipPage } from "./pages/tooltip";
import { TreePage } from "./pages/tree";
import { TablePage } from "./pages/table";
import { BarsPage } from "./pages/bars";
import { SidebarPage } from "./pages/sidebar";
import { NotificationsPage } from "./pages/notifications";
import { ProgressPage } from "./pages/progress";
import { BadgesPage } from "./pages/badges";
import { CommandPalettePage } from "./pages/command-palette";

//
// One page in the explorer.
//
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
        id: "commit-graph",
        title: "Commit graph",
        keywords: ["lanes", "branch", "merge", "history", "commits"],
        component: CommitGraphPage,
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
    },
    {
        id: "text-box",
        title: "Text box",
        keywords: ["input", "text field", "search"],
        component: TextBoxPage,
    },
    {
        id: "select",
        title: "Select",
        keywords: ["dropdown", "drop-down", "combo", "picker", "options"],
        component: SelectPage,
    },
    {
        id: "toggles",
        title: "Checkbox, radio and switch",
        keywords: ["checkbox", "radio", "switch", "toggle", "option"],
        component: TogglesPage,
    },
    {
        id: "tabs",
        title: "Tabs",
        keywords: ["tab", "views", "switcher"],
        component: TabsPage,
    },
    {
        id: "menu",
        title: "Menu",
        keywords: ["context menu", "right-click", "actions", "dropdown"],
        component: MenuPage,
    },
    {
        id: "tooltip",
        title: "Tooltip",
        keywords: ["hint", "hover", "title"],
        component: TooltipPage,
    },
    {
        id: "dialog",
        title: "Dialog",
        keywords: ["modal", "popup", "confirm", "form"],
        component: DialogPage,
    },
    {
        id: "list-and-tree",
        title: "List and tree",
        keywords: ["file tree", "folders", "rows", "branches"],
        component: TreePage,
    },
    {
        id: "table",
        title: "Table",
        keywords: ["commit list", "grid", "rows", "columns"],
        component: TablePage,
    },
    {
        id: "toolbar-and-status-bar",
        title: "Toolbar and status bar",
        keywords: ["toolbar", "status", "actions", "footer"],
        component: BarsPage,
    },
    {
        id: "sidebar",
        title: "Sidebar navigation",
        keywords: ["navigation", "branches", "remotes", "tags", "stashes"],
        component: SidebarPage,
    },
    {
        id: "notifications",
        title: "Notifications and banners",
        keywords: ["alert", "toast", "snackbar", "banner", "message", "error"],
        component: NotificationsPage,
    },
    {
        id: "progress",
        title: "Progress and loading",
        keywords: ["spinner", "loading", "progress bar", "skeleton"],
        component: ProgressPage,
    },
    {
        id: "badges",
        title: "Badges and chips",
        keywords: ["chip", "badge", "ref", "branch", "tag", "remote", "label"],
        component: BadgesPage,
    },
    {
        id: "command-palette",
        title: "Command palette",
        keywords: ["commands", "search", "ctrl+k", "launcher"],
        component: CommandPalettePage,
    },
];
