//
// The explorer's two display settings and the reading of them from the URL: the theme the
// component examples are shown in and the theme of the explorer's own frame.
//

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
// The search part of the explorer's URL, as in ?components=dark&explorer=light.
//
export interface IExplorerSearch {
    //
    // How component examples are shown. Absent means "both".
    //
    components?: ComponentMode;

    //
    // The theme of the explorer's frame. Absent means "light".
    //
    explorer?: ExplorerTheme;
}

//
// Reads both settings from the URL's search values, so a link to
// /page/button?components=dark&explorer=dark opens with both set. A value outside the known
// settings reads as absent.
//
export function readExplorerSearch(search: Record<string, unknown>): IExplorerSearch {
    const result: IExplorerSearch = {};
    const components = search.components;
    if (components === "light" || components === "dark" || components === "both") {
        result.components = components;
    }
    const explorer = search.explorer;
    if (explorer === "light" || explorer === "dark") {
        result.explorer = explorer;
    }
    return result;
}

//
// Returns the themes a section shows in component mode `mode`, in the order the panels are
// drawn.
//
export function modeThemes(mode: ComponentMode | undefined): string[] {
    if (mode === "light") {
        return ["light"];
    }
    if (mode === "dark") {
        return ["dark"];
    }
    return ["light", "dark"];
}
