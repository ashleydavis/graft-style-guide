//
// Shows an example in the theme or themes of the current component mode: light, dark or light
// next to dark.
//

import type { ReactNode } from "react";
import { ThemeProvider, type Theme } from "@mui/material/styles";
import { modeThemes, useExplorerSettings } from "../lib/explorer-mode";
import { PanelThemeContext } from "../lib/panel-theme";

//
// Renders `children` once per theme of the component mode in the URL. Each panel sets the light
// or dark class, so the role tokens in graft.css resolve to that theme's values inside it.
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
// Returns `outer`, the page's MUI theme, with `panelTheme`, "light" or "dark", as the class of
// every tooltip, popper, popover and menu root. A menu is a popover that sets its own class, so it
// needs the class given to it as well. Popups mount at the end of the page, outside the panel,
// so the class is what makes the role tokens inside a popup resolve to its panel's theme rather
// than the page's.
//
export function panelPopupTheme(outer: Theme, panelTheme: string): Theme {
    const components = outer.components ?? {};
    const tooltipProps = components.MuiTooltip?.defaultProps ?? {};
    const tooltipSlotProps = tooltipProps.slotProps ?? {};
    const popperSlotProps = typeof tooltipSlotProps.popper === "object" ? tooltipSlotProps.popper : {};
    return {
        ...outer,
        components: {
            ...components,
            MuiTooltip: {
                ...components.MuiTooltip,
                defaultProps: {
                    ...tooltipProps,
                    slotProps: {
                        ...tooltipSlotProps,
                        popper: {
                            ...popperSlotProps,
                            className: panelTheme,
                        },
                    },
                },
            },
            MuiPopper: {
                ...components.MuiPopper,
                defaultProps: {
                    ...components.MuiPopper?.defaultProps,
                    className: panelTheme,
                },
            },
            MuiPopover: {
                ...components.MuiPopover,
                defaultProps: {
                    ...components.MuiPopover?.defaultProps,
                    className: panelTheme,
                },
            },
            MuiMenu: {
                ...components.MuiMenu,
                defaultProps: {
                    ...components.MuiMenu?.defaultProps,
                    className: panelTheme,
                },
            },
        },
    };
}

//
// Renders one themed panel on its theme's background, with no border or label. Its popups take
// the panel's theme through panelPopupTheme.
//
export function ThemePanel({ theme, children }: { theme: string; children: ReactNode }): ReactNode {
    return (
        <div
            className={theme}
            style={{
                background: "var(--color-bg)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-lg)",
            }}
        >
            <ThemeProvider theme={(outer: Theme) => panelPopupTheme(outer, theme)}>
                <PanelThemeContext.Provider value={theme}>{children}</PanelThemeContext.Provider>
            </ThemeProvider>
        </div>
    );
}
