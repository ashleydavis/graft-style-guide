//
// Shows an example in the theme or themes of the current component mode: light, dark or light
// next to dark.
//

import type { ReactNode } from "react";
import { useSearch } from "@tanstack/react-router";
import { modeThemes } from "../lib/explorer-mode";
import { PanelThemeContext } from "../lib/panel-theme";

//
// Renders `children` once per theme of the component mode in the URL. Each panel sets data-theme, so the
// role tokens in graft.css resolve to that theme's values inside it.
//
export function ThemePanels({ children }: { children: ReactNode }): ReactNode {
    const { components } = useSearch({
        strict: false,
    });
    const themes = modeThemes(components);

    return (
        <div className={themes.length === 2 ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : "grid grid-cols-1"}>
            {themes.map(theme => (
                <ThemePanel key={theme} theme={theme}>
                    {children}
                </ThemePanel>
            ))}
        </div>
    );
}

//
// Renders one themed panel with its theme name above the example.
//
export function ThemePanel({ theme, children }: { theme: string; children: ReactNode }): ReactNode {
    return (
        <div
            data-theme={theme}
            className="p-4"
            style={{
                background: "var(--color-bg)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
            }}
        >
            <div
                className="mb-3 uppercase tracking-wider"
                style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-bold)",
                    color: "var(--color-text-muted)",
                }}
            >
                {theme}
            </div>
            <PanelThemeContext.Provider value={theme}>{children}</PanelThemeContext.Provider>
        </div>
    );
}
