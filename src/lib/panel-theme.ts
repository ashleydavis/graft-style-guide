//
// The theme of the panel an example sits in, so a component can pick light or dark values for
// tokens it sets itself.
//

import { createContext } from "react";

//
// Holds "light" or "dark" for the nearest ThemePanel. The choices page reads it to apply the
// light or the dark values of a candidate option.
//
export const PanelThemeContext = createContext("light");
