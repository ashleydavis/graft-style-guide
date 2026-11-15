//
// The explorer's display settings, kept in this browser's storage and remembered between visits:
// the theme the component examples are shown in, the theme of the explorer's own frame and whether
// the sidebar is open.
//

import { useSyncExternalStore } from "react";

//
// How component examples are shown: in the light theme, in the dark theme or in both side by
// side.
//
export type ComponentMode = "light" | "dark" | "both";

//
// The theme of the explorer's frame: the sidebar, headings and page background.
//
export type ExplorerTheme = "light" | "dark";

//
// Whether the sidebar is shown, or minimised to a restore button floating over the page's
// top-left corner.
//
export type SidebarState = "open" | "minimised";

//
// Returns the themes the component examples are shown in, in the order their panels appear: the
// one theme, or dark then light for both.
//
export function modeThemes(mode: ComponentMode): string[] {
    if (mode === "light") {
        return ["light"];
    }
    if (mode === "dark") {
        return ["dark"];
    }
    return ["dark", "light"];
}

//
// The explorer's display settings.
//
export interface IExplorerSettings {
    //
    // The theme the component examples are shown in.
    //
    components: ComponentMode;

    //
    // The theme of the explorer's frame.
    //
    explorer: ExplorerTheme;

    //
    // Whether the sidebar is open beside the page on a wide screen. A narrow screen always starts
    // with it closed.
    //
    sidebar: SidebarState;
}

//
// The browser storage key that holds the settings.
//
export const SETTINGS_KEY = "graft-style-guide-settings";

//
// The settings a browser starts with: dark components in a dark explorer, with the sidebar open.
//
const DEFAULT_SETTINGS: IExplorerSettings = { components: "dark", explorer: "dark", sidebar: "open" };

//
// Returns the settings kept in this browser, each one it does not hold, or holds with a value
// outside the known ones, taking its default. A browser that keeps no storage, such as a private
// window, gets the defaults.
//
function readStoredSettings(): IExplorerSettings {
    try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Record<string, unknown>;
        return {
            components: stored.components === "light" || stored.components === "dark" || stored.components === "both" ? stored.components : DEFAULT_SETTINGS.components,
            explorer: stored.explorer === "light" || stored.explorer === "dark" ? stored.explorer : DEFAULT_SETTINGS.explorer,
            sidebar: stored.sidebar === "open" || stored.sidebar === "minimised" ? stored.sidebar : DEFAULT_SETTINGS.sidebar,
        };
    }
    catch {
        return DEFAULT_SETTINGS;
    }
}

let currentSettings = readStoredSettings();
const listeners = new Set<() => void>();

//
// Changes the settings named in `change`, keeps them in this browser and redraws every part of the
// explorer that shows them. A browser that keeps no storage keeps the change until the page
// reloads.
//
export function setExplorerSettings(change: Partial<IExplorerSettings>): void {
    currentSettings = { ...currentSettings, ...change };
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    }
    catch {
        //
        // The browser keeps no storage here, so the setting lasts until the page reloads.
        //
    }
    listeners.forEach(listener => listener());
}

//
// Returns the settings, redrawing the caller when any changes.
//
export function useExplorerSettings(): IExplorerSettings {
    return useSyncExternalStore(
        listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => currentSettings,
    );
}
