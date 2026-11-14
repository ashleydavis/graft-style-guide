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
        id: "dialog",
        title: "Dialog",
        keywords: ["modal", "popup", "confirm", "form"],
        component: DialogPage,
    },
];
