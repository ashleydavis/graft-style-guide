//
// Starts the style explorer: loads the explorer's styles, sets up MUI and renders the router.
// index.html loads the tokens in graft.css.
//

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import GlobalStyles from "@mui/material/GlobalStyles";
import "./main.css";
import { graftTheme } from "./lib/mui-theme";
import { STYLES_UPDATED_EVENT } from "./lib/use-css-variable";
import { router } from "./router";

//
// Tells every component that shows a token value to read it again after Vite applies an
// edit, such as a change to graft.css.
//
if (import.meta.hot) {
    import.meta.hot.on("vite:afterUpdate", () => {
        window.dispatchEvent(new Event(STYLES_UPDATED_EVENT));
    });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
    console.error("The page has no element with the id root, so the explorer cannot start.");
}
else {
    createRoot(rootElement).render(
        <StrictMode>
            <StyledEngineProvider enableCssLayer={true}>
                {/*
                  MUI inserts its styles at the top of the page head, ahead of main.css, so the
                  layer order is declared here as well. The first declaration of the order wins,
                  and this one puts Tailwind's base styles under MUI's.
                */}
                <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
                <ThemeProvider theme={graftTheme}>
                    <RouterProvider router={router} />
                </ThemeProvider>
            </StyledEngineProvider>
        </StrictMode>,
    );
}
