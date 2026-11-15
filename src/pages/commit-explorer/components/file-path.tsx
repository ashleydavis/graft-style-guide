//
// A file path drawn with its folder muted and its name in the main text colour, so the eye finds
// the file name first.
//

import type { ReactNode } from "react";

//
// Renders `path`, cut short with an ellipsis at the start of the folder when it is wider than its
// space, so the file name stays in view; only when the folder has gone does the file name itself
// get cut short at its end. The full path shows in the browser's tooltip. With `tint`, a colour,
// the folder and the name take a slight tinge of it, mixed into their own colours.
//
export function FilePath({ path, tint }: { path: string; tint?: string }): ReactNode {
    const slash = path.lastIndexOf("/");
    const folder = slash >= 0 ? path.slice(0, slash + 1) : "";
    const name = path.slice(slash + 1);
    return (
        <span title={path} className="flex min-w-0" style={{ whiteSpace: "nowrap" }}>
            {folder ? (
                <span className="min-w-0 truncate" style={{ flex: "0 1000 auto", color: tint ? `color-mix(in srgb, var(--color-text-muted) 70%, ${tint})` : "var(--color-text-muted)", direction: "rtl", textAlign: "left" }}>
                    <bdi>{folder}</bdi>
                </span>
            ) : undefined}
            <span className="min-w-0 truncate" style={{ flex: "0 1 auto", color: tint ? `color-mix(in srgb, var(--color-text) 70%, ${tint})` : undefined }}>
                {name}
            </span>
        </span>
    );
}
