//
// The about page: what the style explorer is for, with links to Graft on GitHub and to the
// YouTube channel where the series about building Graft is published.
//

import type { ReactNode } from "react";
import Link from "@mui/material/Link";

//
// Renders a short description of the explorer and the two links.
//
export function AboutPage(): ReactNode {
    return (
        <div
            className="flex flex-col"
            style={{
                gap: "var(--space-4)",
                maxWidth: "640px",
            }}
        >
            <p>
                This explorer shows the style guide of Graft, a Git client with a web interface. Every colour, size and
                component style comes from the design tokens in graft.css, shown in the light and the dark theme.
            </p>
            <p>
                Graft on GitHub:{" "}
                <Link href="https://github.com/ashleydavis/Graft" target="_blank" rel="noreferrer">
                    github.com/ashleydavis/Graft
                </Link>
            </p>
            <p>
                The series about building Graft on YouTube:{" "}
                <Link href="https://www.youtube.com/@CodeCapers" target="_blank" rel="noreferrer">
                    Code Capers
                </Link>
            </p>
        </div>
    );
}
