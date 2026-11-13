//
// The explorer's routes. The page being shown is the id in /page/<id>, so every page has its
// own URL.
//

import type { ReactNode } from "react";
import { createRootRoute, createRoute, createRouter, Navigate } from "@tanstack/react-router";
import { ExplorerLayout } from "./components/explorer-layout";
import { ExplorerPage } from "./pages/explorer-page";
import { readExplorerSearch } from "./lib/explorer-mode";

//
// Sends the bare URL to the overview, the page the explorer opens on.
//
export function OpenOverview(): ReactNode {
    return (
        <Navigate
            to="/page/$pageId"
            params={{
                pageId: "overview",
            }}
            search={true}
            replace={true}
        />
    );
}

//
// The root route, which draws the sidebar around every page.
//
export const rootRoute = createRootRoute({
    component: ExplorerLayout,
    validateSearch: readExplorerSearch,
});

//
// The bare URL, which opens the overview.
//
export const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: OpenOverview,
});

//
// One explorer page, chosen by the id in the URL.
//
export const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/page/$pageId",
    component: ExplorerPage,
});

//
// The router, using browser history so each page's URL can be bookmarked and reloaded.
//
export const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, pageRoute]),
});

//
// Registers the router's type with TanStack Router, so links and params are type checked.
// The interface is named Register because TanStack Router looks it up by that name.
//
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}
