//
// Configures the Vite dev server and build for the style explorer.
//

import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

//
// A default export, because Vite reads its config only from the default export.
//
export default defineConfig({
    plugins: [
        //
        // Tailwind's optimiser is off so MUI's CSS layer keeps its order against Tailwind's,
        // the same as in Graft.
        //
        tailwindcss({
            optimize: false,
        }),
    ],
    server: {
        //
        // A fixed port so the explorer's URL stays the same between runs.
        //
        port: 5199,
        strictPort: true,
    },
});
