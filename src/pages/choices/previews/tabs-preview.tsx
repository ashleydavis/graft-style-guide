//
// The preview for the tabs choice: a row of tabs in the style of each option. A is the
// underline the Tabs page uses now, B a segmented control and C tabs that join the panel below.
//

import { useState, type ReactNode } from "react";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import type { SxProps, Theme } from "@mui/material/styles";

//
// The Tabs styles of options B and C. Option A and the "Spot it" option use the theme as it
// stands.
//
const tabStyles: Record<string, SxProps<Theme>> = {
    B: {
        display: "inline-flex",
        borderBottom: "none",
        padding: "2px",
        backgroundColor: "var(--color-raised)",
        borderRadius: "var(--radius-md)",
        "& .MuiTabs-indicator": {
            display: "none",
        },
        "& .MuiTab-root": {
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-1) var(--space-3)",
        },
        "& .MuiTab-root.Mui-selected": {
            backgroundColor: "var(--color-panel)",
            boxShadow: "var(--shadow-raised)",
        },
    },
    C: {
        "& .MuiTabs-indicator": {
            display: "none",
        },
        "& .MuiTabs-flexContainer": {
            gap: "var(--space-1)",
        },
        "& .MuiTab-root": {
            border: "1px solid transparent",
            borderBottom: "none",
            borderRadius: "var(--radius-md) var(--radius-md) 0 0",
            marginBottom: "-1px",
        },
        "& .MuiTab-root.Mui-selected": {
            backgroundColor: "var(--color-panel)",
            borderColor: "var(--color-border)",
        },
        "& .MuiTabs-scroller": {
            overflow: "visible !important",
        },
    },
};

//
// Renders the tabs over a panel, in the style of option `optionId`.
//
export function TabsPreview({ optionId }: { optionId: string }): ReactNode {
    const [current, setCurrent] = useState(0);

    return (
        <div style={{ padding: "var(--space-3)", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <Tabs value={current} onChange={(_event, index: number) => setCurrent(index)} sx={tabStyles[optionId]} aria-label={`Tabs, option ${optionId}`}>
                <Tab label="Changes" />
                <Tab label="History" />
                <Tab label="Stashes" />
            </Tabs>
            <div
                style={{
                    padding: "var(--space-3)",
                    marginTop: optionId === "B" ? "var(--space-2)" : 0,
                    background: "var(--color-panel)",
                    border: "1px solid var(--color-border)",
                    borderRadius: optionId === "C" ? "0 var(--radius-md) var(--radius-md) var(--radius-md)" : "var(--radius-md)",
                    color: "var(--color-text-muted)",
                }}
            >
                {["3 changed files.", "128 commits.", "2 stashes."][current]}
            </div>
        </div>
    );
}
