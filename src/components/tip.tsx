//
// The content of a tooltip that needs more than a name: a bold line saying what the thing is, and
// a quieter line or two explaining it.
//

import type { ReactNode } from "react";

//
// Renders `title` in the tooltip's own bold weight and `detail` below it, a little smaller and
// softer, so a reader takes in the name first and the explanation after.
//
export function Tip({ title, detail }: { title: ReactNode; detail?: ReactNode }): ReactNode {
    return (
        <span className="flex flex-col" style={{ gap: "2px", padding: "2px 0" }}>
            <span style={{ fontWeight: "var(--weight-bold)" }}>{title}</span>
            {detail ? <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-normal)", opacity: 0.8 }}>{detail}</span> : undefined}
        </span>
    );
}
