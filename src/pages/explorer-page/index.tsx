//
// The route page for /page/<id>: shows the explorer page whose id is in the URL.
//

import type { ReactNode } from "react";
import { useParams } from "@tanstack/react-router";
import { explorerPages } from "../../explorer-pages";

//
// Looks up the page id from the URL and renders that page under its title. For an unknown id
// it renders a message naming the id.
//
export function ExplorerPage(): ReactNode {
    const { pageId } = useParams({
        from: "/page/$pageId",
    });
    const page = explorerPages.find(candidate => candidate.id === pageId);
    if (!page) {
        return <p>There is no page called "{pageId}".</p>;
    }

    const PageComponent = page.component;
    return (
        <div>
            <h1
                className="mb-6"
                style={{
                    fontSize: "var(--text-2xl)",
                    fontWeight: "var(--weight-bold)",
                }}
            >
                {page.title}
            </h1>
            <PageComponent />
        </div>
    );
}
