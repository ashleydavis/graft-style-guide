//
// Configures the Playwright end-to-end tests of the style explorer. Each run starts its own
// Vite dev server on a free port, so runs in different worktrees can happen at the same time.
//

import { defineConfig } from "@playwright/test";

//
// A default export, because Playwright reads its config only from the default export.
//
export default defineConfig({
    testDir: "src/test/e2e",
    fullyParallel: true,
    forbidOnly: true,
    retries: 0,
    reporter: "list",
    outputDir: "tmp/test-results",
    use: {
        //
        // The port comes from the dev server's output, which the wait pattern below stores in
        // EXPLORER_PORT.
        //
        baseURL: `http://localhost:${process.env.EXPLORER_PORT}`,
        //
        // The Chrome installed on the machine, so the tests run in the browser already there.
        //
        channel: "chrome",
        headless: true,
    },
    webServer: {
        //
        // Port 0 lets the system pick a free port. Vite prints the port it got.
        //
        command: "bun node_modules/vite/bin/vite.js --port 0",
        wait: {
            stdout: /Local:\s+http:\/\/localhost:(?<explorer_port>\d+)/,
        },
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
