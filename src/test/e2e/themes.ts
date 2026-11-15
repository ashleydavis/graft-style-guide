//
// Opening explorer pages in tests with chosen settings, which the explorer keeps in the browser's
// storage rather than the URL.
//

import type { Page } from "@playwright/test";
import { SETTINGS_KEY, type IExplorerSettings } from "../../lib/explorer-mode";

//
// Puts the settings `themes` in the browser's storage before the page's first load in this test, so the page
// opens with them. Later loads in the same test keep whatever the page changed them to.
//
export async function setThemes(page: Page, themes: Partial<IExplorerSettings>): Promise<void> {
    await page.addInitScript(
        ([key, value]) => {
            if (sessionStorage.getItem("test-themes-set") === null) {
                localStorage.setItem(key, value);
                sessionStorage.setItem("test-themes-set", "true");
            }
        },
        [SETTINGS_KEY, JSON.stringify(themes)],
    );
}

//
// Opens the explorer at `path` with `themes` in place, the settings it leaves out taking their
// defaults.
//
export async function openPage(page: Page, path: string, themes: Partial<IExplorerSettings>): Promise<void> {
    await setThemes(page, themes);
    await page.goto(path);
}
