//
// The candidate values for each open choice in the style guide. Each option sets role tokens
// for the light and the dark theme. The chosen option's values move into graft.css, so these
// values live here only while the choice is open.
//

//
// One candidate for a choice.
//
export interface ITokenOption {
    //
    // The letter the developer picks it by.
    //
    id: string;

    //
    // A short name for the option.
    //
    name: string;

    //
    // What the option is like and what it aims for.
    //
    description: string;

    //
    // The tokens it sets in the light theme, by CSS variable name.
    //
    light: Record<string, string>;

    //
    // The tokens it sets in the dark theme, by CSS variable name.
    //
    dark: Record<string, string>;
}

//
// One open choice and its candidates.
//
export interface IChoice {
    //
    // The heading of the choice's section.
    //
    title: string;

    //
    // What the choice decides and what to look at in the previews.
    //
    description: string;

    //
    // The candidates, in the order they are shown.
    //
    options: ITokenOption[];

    //
    // True when the previews draw the focus ring on the Fetch button, as for a focus choice.
    //
    showFocus?: boolean;

    //
    // True when the previews draw the first commit row and the first menu item with the hover
    // background, as for a hover choice.
    //
    showHover?: boolean;

    //
    // True when the previews start with the commit menu closed, so it covers nothing the choice
    // changes.
    //
    menuStartsClosed?: boolean;

    //
    // The lane colours the previews' commit graph draws, from left to right. Absent means lanes
    // 1, 2 and 3.
    //
    lanes?: number[];
}

//
// Returns the light and dark token sets for tokens that have the same value in both themes,
// such as sizes.
//
function bothThemes(tokens: Record<string, string>): Pick<ITokenOption, "light" | "dark"> {
    return {
        light: tokens,
        dark: tokens,
    };
}

//
// The bright red of the last option of every choice.
//
const SPOT_RED = "#ff0000";

//
// Returns the last option of a choice: every token in `tokens` set to bright red in both
// themes, so the preview shows where the choice's tokens appear. Tokens in `overrides` take the
// value given there instead, as for text that sits on a red background.
//
function spotIt(tokens: string[], overrides: Record<string, string> = {}): ITokenOption {
    const values: Record<string, string> = {};
    for (const token of tokens) {
        values[token] = overrides[token] ?? SPOT_RED;
    }
    return {
        id: "D",
        name: "Spot it",
        description: "Not a candidate. Paints this choice in bright red to show where it appears.",
        ...bothThemes(values),
    };
}

//
// Every open choice, in the order of the todo list.
//
export const choices: IChoice[] = [];
