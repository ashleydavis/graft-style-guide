//
// Shows an example in the theme or themes of the current component mode: light, dark or light
// next to dark.
//

import type { ReactNode } from "react";
import { modeThemes, useExplorerSettings } from "../lib/explorer-mode";
import { PanelThemeContext } from "../lib/panel-theme";

//
// Renders `children` once per theme of the component mode in the URL. Each panel sets data-theme, so the
// role tokens in graft.css resolve to that theme's values inside it.
//
export function ThemePanels({ children }: { children: ReactNode }): ReactNode {
    const { components } = useExplorerSettings();
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
// Renders one themed panel on its theme's background, with no border or label.
//
export function ThemePanel({ theme, children }: { theme: string; children: ReactNode }): ReactNode {
    return (
        <div
            data-theme={theme}
            style={{
                background: "var(--color-bg)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-lg)",
            }}
        >
            <PanelThemeContext.Provider value={theme}>{children}</PanelThemeContext.Provider>
        </div>
    );
}
