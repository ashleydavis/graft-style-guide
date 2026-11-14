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
}

//
// Every open choice, in the order of the todo list.
//
export const choices: IChoice[] = [];
