//
// A titled section of an explorer page, with its example shown in the themes of the current
// mode.
//

import type { ReactNode } from "react";
import { ThemePanels } from "./theme-panels";

//
// Renders a heading, a short description and the example in one panel per theme of the
// current mode, so every page lays its examples out the same way.
//
export function Section({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}): ReactNode {
    return (
        <section className="mb-10">
            <h2
                className="mb-1"
                style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: "var(--weight-bold)",
                }}
            >
                {title}
            </h2>
            <p
                className="mb-4"
                style={{
                    color: "var(--color-text-muted)",
                }}
            >
                {description}
            </p>
            <ThemePanels>{children}</ThemePanels>
        </section>
    );
}
