//
// The list of pages in the style explorer, which the sidebar searches and the router shows.
//

import type { ComponentType } from "react";
import { OverviewPage } from "./pages/overview";
import { ButtonPage } from "./pages/button";
import { TextBoxPage } from "./pages/text-box";
import { DialogPage } from "./pages/dialog";
import { AboutPage } from "./pages/about";
import { ChoicesPage } from "./pages/choices";
import { FontsPage } from "./pages/fonts";

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
// page the explorer opens on.
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
        id: "choices",
        title: "Choices",
        keywords: ["options", "pick", "decide", "grey", "accent", "status", "git", "fonts"],
        component: ChoicesPage,
    },
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
    {
        id: "about",
        title: "About",
        keywords: ["graft", "github", "youtube", "series", "links"],
        component: AboutPage,
    },
];
