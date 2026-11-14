//
// A keyboard shortcut shown beside a command, as in a tooltip, a menu or the command palette,
// and the row style that lines it up with the command's words.
//

import type { ReactNode } from "react";

//
// The style of a menu item or list row with a shortcut. The row's words and the shortcut sit on
// the same baseline, because the code font draws its letters higher in the line than the
// interface font and centring the two leaves the shortcut high. The icon stays centred.
//
export const shortcutRowStyle = {
    alignItems: "baseline",
    "& .MuiListItemIcon-root": {
        alignSelf: "center",
    },
};

//
// Renders the keys of a shortcut in the code font, small and muted, after the command's words.
//
export function Shortcut({ keys }: { keys: string }): ReactNode {
    return (
        <span
            style={{
                marginLeft: "var(--space-6)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-muted)",
                whiteSpace: "nowrap",
            }}
        >
            {keys}
        </span>
    );
}
