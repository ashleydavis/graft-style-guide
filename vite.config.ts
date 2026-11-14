//
// Configures the Vite dev server and the static build of the style explorer. The build writes
// the site to docs/, the folder GitHub Pages publishes from a branch.
//

import { copyFile, writeFile } from "node:fs/promises";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";

//
// Adds the files GitHub Pages needs next to the built site:
// - 404.html, a copy of index.html, so a link straight to /page/button loads the explorer,
//   which then shows that page.
// - .nojekyll, so GitHub Pages serves the files as they are.
// - graft.css, so any web page can link the tokens from the published site.
//
export function githubPagesFiles(): Plugin {
    return {
        name: "github-pages-files",
        apply: "build",
        async closeBundle(): Promise<void> {
            await copyFile("docs/index.html", "docs/404.html");
            await writeFile("docs/.nojekyll", "");
            await copyFile("graft.css", "docs/graft.css");
        },
    };
}

//
// A default export, because Vite reads its config only from the default export.
//
export default defineConfig(({ command, isPreview }) => ({
    //
    // GitHub Pages serves the site under the repo name, and the preview of the build matches
    // it. The dev server serves the site at the root.
    //
    base: command === "build" || isPreview ? "/graft-style-guide/" : "/",
    plugins: [
        //
        // Tailwind's optimiser is off so MUI's CSS layer keeps its order against Tailwind's,
        // the same as in Graft.
        //
        tailwindcss({
            optimize: false,
        }),
        githubPagesFiles(),
    ],
    build: {
        outDir: "docs",
        //
        // docs/ holds only the built site, so each build deletes it and writes it fresh. Vite's
        // default file names carry a hash of their content, so each deployment's index.html
        // points at new file names and browsers fetch the new files instead of cached ones.
        //
        emptyOutDir: true,
    },
    server: {
        //
        // A fixed port so the explorer's URL stays the same between runs.
        //
        port: 5199,
        strictPort: true,
        //
        // The dev server checks files for changes by polling every 300ms, which uses no inotify
        // file watches. Other programs on the machine can use up every watch the system allows,
        // and Vite then stops with ENOSPC.
        //
        watch: {
            usePolling: true,
            interval: 300,
        },
    },
}));
