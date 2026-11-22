//
// End-to-end tests of the style explorer. Goal: check that a person can find and open every
// page, that the page is in the URL and that every example is drawn in both themes from the
// tokens in graft.css. Method: open the explorer in Chrome against a dev server started by
// Playwright, then click, type and read computed styles the way a person would see them.
//

import { expect, test, type Locator, type Page } from "@playwright/test";
import { openPage } from "./themes";
import { choices } from "../../pages/choices/options";
import { graftHistory } from "../../pages/commit-explorer/data";
import { longBranchHistory, releaseHistory } from "../../pages/commit-explorer/histories";

//
// Returns the computed value of a CSS property on the element `locator` points at, so a test
// can check which token a style resolved to.
//
export async function computedStyle(locator: Locator, property: string): Promise<string> {
    return locator.evaluate(
        (element, name) => getComputedStyle(element).getPropertyValue(name),
        property,
    );
}

//
// Opens the Configuration dropdown at the page's top right, once, and returns it.
//
async function openConfiguration(page: Page): Promise<Locator> {
    const dialog = page.getByRole("dialog", { name: "Configuration" });
    if ((await dialog.count()) === 0) {
        await page.getByRole("button", { name: "Configuration" }).click();
    }
    return dialog;
}

//
// Switches a Changes area to the view with the unstaged and the staged changes apart, through its
// options dialog.
//
async function showStagedAndUnstaged(page: Page, area: Locator): Promise<void> {
    await area.getByRole("button", { name: "Changes options" }).click();
    await page.getByRole("dialog", { name: "Changes options" }).getByRole("button", { name: "Staged and unstaged" }).click();
    await page.keyboard.press("Escape");
}

test.describe("Opening pages", () => {
    test("the bare URL opens the commit explorer", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/page\/commit-explorer$/);
        await expect(page.getByRole("heading", { level: 1, name: "Commit explorer" })).toBeVisible();
    });

    test("choosing a page in the sidebar puts its id in the URL", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("navigation").getByRole("link", { name: "Button", exact: true }).click();
        await expect(page).toHaveURL(/\/page\/button$/);
        await expect(page.getByRole("heading", { level: 1, name: "Button" })).toBeVisible();
    });

    test("opening a page's URL shows that page", async ({ page }) => {
        await page.goto("/page/text-box");
        await expect(page.getByRole("heading", { level: 1, name: "Text box" })).toBeVisible();
    });

    test("an unknown page id says there is no such page", async ({ page }) => {
        await page.goto("/page/no-such-component");
        await expect(page.getByText('There is no page called "no-such-component".')).toBeVisible();
    });
});

test.describe("Sidebar", () => {
    test("minimising hides the page list, leaves the URL alone and is remembered on the next visit", async ({ page }) => {
        await page.goto("/page/button");
        const navigation = page.getByRole("navigation");
        await navigation.getByRole("button", { name: "Minimise sidebar" }).click();
        await expect(page).toHaveURL(/\/page\/button$/);
        await expect(navigation.getByRole("link")).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 1, name: "Button" })).toBeVisible();
        await page.goto("/page/text-box");
        await expect(page.getByRole("navigation").getByRole("button", { name: "Restore sidebar" })).toBeVisible();
    });

    test("restoring brings back the page list", async ({ page }) => {
        await openPage(page, "/page/button", { sidebar: "minimised" });
        const navigation = page.getByRole("navigation");
        await navigation.getByRole("button", { name: "Restore sidebar" }).click();
        await expect(page).toHaveURL(/\/page\/button$/);
        await expect(navigation.getByRole("link", { name: "Button", exact: true })).toBeVisible();
    });

    test("the sidebar stays minimised when changing a setting", async ({ page }) => {
        await openPage(page, "/page/button", { sidebar: "minimised", explorer: "dark" });
        await expect(page.getByRole("navigation").getByRole("button", { name: "Restore sidebar" })).toBeVisible();
        await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
    });
});

test.describe("Searching", () => {
    test("typing filters the page list by title", async ({ page }) => {
        await page.goto("/");
        const navigation = page.getByRole("navigation");
        await navigation.getByPlaceholder("Search components").fill("butt");
        await expect(navigation.getByRole("list", { name: "Pages" }).getByRole("link")).toHaveText(["Button", "Radio buttons"]);
    });

    test("typing matches keywords as well as titles", async ({ page }) => {
        await page.goto("/");
        const navigation = page.getByRole("navigation");
        await navigation.getByPlaceholder("Search components").fill("input");
        await expect(navigation.getByRole("list", { name: "Pages" }).getByRole("link")).toHaveText(["Text box"]);
    });

    test("pressing Enter opens the first match", async ({ page }) => {
        await page.goto("/");
        const searchBox = page.getByRole("navigation").getByPlaceholder("Search components");
        await searchBox.fill("input");
        await searchBox.press("Enter");
        await expect(page).toHaveURL(/\/page\/text-box$/);
    });

    test("a search with no match says so", async ({ page }) => {
        await page.goto("/");
        const navigation = page.getByRole("navigation");
        await navigation.getByPlaceholder("Search components").fill("zzzz");
        await expect(navigation.getByRole("list", { name: "Pages" }).getByRole("link")).toHaveCount(0);
        await expect(navigation.getByText("No components match.")).toBeVisible();
    });
});

test.describe("Themes", () => {
    test("every section shows a light and a dark panel", async ({ page }) => {
        await openPage(page, "/page/button", { components: "both" });
        const sections = page.locator("main section");
        const sectionCount = await sections.count();
        expect(sectionCount).toBeGreaterThan(0);
        for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
            const section = sections.nth(sectionIndex);
            await expect(section.locator('.light')).toHaveCount(1);
            await expect(section.locator('.dark')).toHaveCount(1);
        }
    });

    test("a button takes different colours from the light and dark tokens", async ({ page }) => {
        await openPage(page, "/page/button", { components: "both" });
        const kinds = page.locator("main section").first();
        const lightButton = kinds.locator('.light').getByRole("button", { name: "Commit" });
        const darkButton = kinds.locator('.dark').getByRole("button", { name: "Commit" });
        const lightBackground = await computedStyle(lightButton, "background-color");
        const darkBackground = await computedStyle(darkButton, "background-color");
        expect(lightBackground).not.toBe("");
        expect(darkBackground).not.toBe("");
        expect(lightBackground).not.toBe(darkBackground);
    });

    test("a swatch shows the value its token resolves to in each theme", async ({ page }) => {
        await openPage(page, "/page/overview", { components: "both" });
        const roleColours = page.locator("main section").nth(1);
        const lightValue = roleColours
            .locator('.light')
            .getByText("--color-bg", { exact: true })
            .locator("xpath=following-sibling::div[1]");
        const darkValue = roleColours
            .locator('.dark')
            .getByText("--color-bg", { exact: true })
            .locator("xpath=following-sibling::div[1]");
        await expect(lightValue).toHaveText(/^#[0-9a-f]{6}$/);
        await expect(darkValue).toHaveText(/^#[0-9a-f]{6}$/);
        expect(await lightValue.textContent()).not.toBe(await darkValue.textContent());
    });

});

test.describe("Component mode and explorer theme", () => {
    test("a first visit shows dark components in a dark explorer, with nothing in the URL", async ({ page }) => {
        await page.goto("/page/button");
        const configuration = await openConfiguration(page);
        await expect(configuration.getByRole("group", { name: "Components" }).getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(configuration.getByRole("group", { name: "Explorer" }).getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
        await expect(page.locator('main .light')).toHaveCount(0);
        await expect(page).toHaveURL(/\/page\/button$/);
    });

    test("dark next to light draws the dark panel on the left", async ({ page }) => {
        await openPage(page, "/page/button", { components: "both" });
        const panels = page.locator("main section").first().locator(".light, .dark");
        await expect(panels).toHaveCount(2);
        await expect(panels.nth(0)).toHaveClass(/(^|\s)dark(\s|$)/);
        await expect(panels.nth(1)).toHaveClass(/(^|\s)light(\s|$)/);
        const darkBox = await panels.nth(0).boundingBox();
        const lightBox = await panels.nth(1).boundingBox();
        expect(darkBox!.x).toBeLessThan(lightBox!.x);
    });

    test("light component mode shows only light panels and leaves the explorer and the URL as they were", async ({ page }) => {
        await page.goto("/page/button");
        await (await openConfiguration(page)).getByRole("group", { name: "Components" }).getByRole("button", { name: "Light", exact: true }).click();
        await expect(page).toHaveURL(/\/page\/button$/);
        await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
        await expect(page.locator('main .dark')).toHaveCount(0);
        await expect(page.locator('main .light').first()).toBeVisible();
    });

    test("the light explorer theme lightens the frame and leaves the component mode as it was", async ({ page }) => {
        await page.goto("/page/button");
        await (await openConfiguration(page)).getByRole("group", { name: "Explorer" }).getByRole("button", { name: "Light", exact: true }).click();
        await expect(page.locator("html")).toHaveClass(/(^|\s)light(\s|$)/);
        await expect(page.locator('main .light')).toHaveCount(0);
        await expect(page.locator('main .dark').first()).toBeVisible();
    });

    test("the settings are remembered on the next visit and when another page is chosen", async ({ page }) => {
        await page.goto("/page/button");
        const configuration = await openConfiguration(page);
        await configuration.getByRole("group", { name: "Components" }).getByRole("button", { name: "Light", exact: true }).click();
        await configuration.getByRole("group", { name: "Explorer" }).getByRole("button", { name: "Light", exact: true }).click();
        await page.keyboard.press("Escape");
        await page.getByRole("navigation").getByRole("link", { name: "Text box" }).click();
        await expect(page.locator('main .dark')).toHaveCount(0);
        await page.goto("/");
        await expect(page).toHaveURL(/\/page\/commit-explorer$/);
        await expect(page.locator("html")).toHaveClass(/(^|\s)light(\s|$)/);
        await expect(page.locator('main .dark')).toHaveCount(0);
    });

    test("the light explorer theme is in place before the app's script runs", async ({ page }) => {
        await page.goto("/page/button");
        const darkBackground = await computedStyle(page.locator("html"), "background-color");

        //
        // Blocking the app's script leaves the page as index.html draws it, which is what a
        // refresh shows before the app starts.
        //
        await page.route("**/src/main.tsx*", route => route.abort());
        await openPage(page, "/page/button", { explorer: "light" });
        await expect(page.locator("html")).toHaveClass(/(^|\s)light(\s|$)/);
        const lightBackground = await computedStyle(page.locator("html"), "background-color");
        expect(lightBackground).not.toBe("rgba(0, 0, 0, 0)");
        expect(lightBackground).not.toBe(darkBackground);
    });
});

test.describe("Dialog", () => {
    test("searching for modal finds the dialog page", async ({ page }) => {
        await page.goto("/");
        const navigation = page.getByRole("navigation");
        await navigation.getByPlaceholder("Search components").fill("modal");
        await expect(navigation.getByRole("list", { name: "Pages" }).getByRole("link")).toHaveText(["Dialog"]);
    });

    test("the danger button has red words and a red border on no fill", async ({ page }) => {
        await openPage(page, "/page/dialog", { components: "light" });
        const discard = page.getByRole("button", { name: "Discard", exact: true });
        const keep = page.getByRole("button", { name: "Keep changes" });
        const danger = await page.locator('.light').first().evaluate(element => {
            const probe = document.createElement("span");
            probe.style.color = "var(--color-danger)";
            element.appendChild(probe);
            const colour = getComputedStyle(probe).color;
            probe.remove();
            return colour;
        });
        expect(await computedStyle(discard, "color")).toBe(danger);
        expect(await computedStyle(discard, "background-color")).toBe("rgba(0, 0, 0, 0)");
        expect(await computedStyle(discard, "box-shadow")).toContain(danger);
        await expect(keep).toBeVisible();
    });

    test("the opened dialog takes the theme of the panel it opened from and closes on Cancel", async ({ page }) => {
        await openPage(page, "/page/dialog", { components: "both" });
        const opened = page.locator("main section").nth(2);

        await opened.locator('.dark').getByRole("button", { name: "Open dialog" }).click();
        const darkDialog = page.getByRole("dialog");
        await expect(darkDialog).toBeVisible();
        const darkBackground = await computedStyle(darkDialog, "background-color");
        await darkDialog.getByRole("button", { name: "Cancel" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);

        await opened.locator('.light').getByRole("button", { name: "Open dialog" }).click();
        const lightDialog = page.getByRole("dialog");
        await expect(lightDialog).toBeVisible();
        const lightBackground = await computedStyle(lightDialog, "background-color");
        expect(lightBackground).not.toBe(darkBackground);
        await lightDialog.getByRole("button", { name: "Create" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
    });
});

test.describe("About", () => {
    test("the info button in the top-right corner opens the about popup centred on the page", async ({ page }) => {
        await openPage(page, "/page/button", { explorer: "dark" });
        const info = page.getByRole("button", { name: "About" });
        const infoBox = await info.boundingBox();
        const viewport = page.viewportSize()!;
        expect(infoBox!.y).toBeLessThan(20);
        expect(infoBox!.x + infoBox!.width).toBeGreaterThan(viewport.width - 40);
        await info.click();
        const popup = page.getByRole("dialog", { name: "About" });
        await expect(popup).toBeVisible();
        await expect(page).toHaveURL(/\/page\/button$/);
        const popupBox = await popup.boundingBox();
        expect(popupBox!.width).toBeLessThanOrEqual(600);
        const centreX = popupBox!.x + popupBox!.width / 2;
        const centreY = popupBox!.y + popupBox!.height / 2;
        expect(Math.abs(centreX - viewport.width / 2)).toBeLessThan(20);
        expect(Math.abs(centreY - viewport.height / 2)).toBeLessThan(20);
    });

    test("the about popup links to Graft and the style guide on GitHub and to the YouTube channel and closes on Close", async ({ page }) => {
        await page.goto("/page/button");
        await page.getByRole("button", { name: "About" }).click();
        const popup = page.getByRole("dialog", { name: "About" });
        await expect(popup.getByRole("link", { name: "github.com/ashleydavis/Graft", exact: true })).toHaveAttribute("href", "https://github.com/ashleydavis/Graft");
        await expect(popup.getByRole("link", { name: "github.com/ashleydavis/graft-style-guide" })).toHaveAttribute("href", "https://github.com/ashleydavis/graft-style-guide");
        await expect(popup.getByRole("link", { name: "Code Capers" })).toHaveAttribute("href", "https://www.youtube.com/@CodeCapers");
        await popup.getByRole("button", { name: "Close" }).click();
        await expect(popup).toHaveCount(0);
    });

    test("the page keeps its scrollbar and the info button stays put while the about popup is open", async ({ page }) => {
        await page.goto("/page/overview");
        const info = page.getByRole("button", { name: "About", includeHidden: true });
        const scrollbarWidth = () => page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
        const widthBefore = await scrollbarWidth();
        expect(widthBefore).toBeGreaterThan(0);
        const boxBefore = await info.boundingBox();
        await info.click();
        await expect(page.getByRole("dialog", { name: "About" })).toBeVisible();
        expect(await scrollbarWidth()).toBe(widthBefore);
        expect(await info.boundingBox()).toEqual(boxBefore);
    });

    test("the info button stays when the sidebar is minimised", async ({ page }) => {
        await openPage(page, "/page/button", { sidebar: "minimised" });
        await expect(page.getByRole("button", { name: "About" })).toBeVisible();
    });

    test("the info button stays in the same place on a short page and a long page", async ({ page }) => {
        await page.goto("/page/no-such-component");
        const shortPageBox = await page.getByRole("button", { name: "About" }).boundingBox();
        await page.goto("/page/overview");
        const longPageBox = await page.getByRole("button", { name: "About" }).boundingBox();
        expect(longPageBox).toEqual(shortPageBox);
    });
});

test.describe("Choices", () => {
    test("every open choice shows each of its options in each theme panel", async ({ page }) => {
        await page.goto("/page/choices");
        const sections = page.locator("main section");
        await expect(sections).toHaveCount(choices.length);
        for (let choiceIndex = 0; choiceIndex < choices.length; choiceIndex++) {
            for (const theme of ["light", "dark"]) {
                const panel = sections.nth(choiceIndex).locator(`.${theme}`);
                await expect(panel.locator("[data-option]")).toHaveCount(choices[choiceIndex].options.length);
            }
        }
    });

    test("every option sets its own light or dark token values on its preview", async ({ page }) => {
        await page.goto("/page/choices");
        const sections = page.locator("main section");
        for (let choiceIndex = 0; choiceIndex < choices.length; choiceIndex++) {
            for (const option of choices[choiceIndex].options) {
                for (const theme of ["light", "dark"] as const) {
                    const card = sections.nth(choiceIndex).locator(`.${theme} [data-option="${option.id}"]`);
                    for (const [name, value] of Object.entries(option[theme])) {
                        expect(await computedStyle(card, name)).toBe(value);
                    }
                }
            }
        }
    });

    test("the choices page is listed only while a choice is open", async ({ page }) => {
        await page.goto("/page/overview");
        const choicesLink = page.getByRole("navigation").getByRole("link", { name: "Choices" });
        await page.goto("/page/choices");
        if (choices.length === 0) {
            await expect(choicesLink).toHaveCount(0);
            await expect(page.getByText('There is no page called "choices".')).toBeVisible();
        }
        else {
            await expect(choicesLink).toBeVisible();
            await expect(page.getByRole("heading", { level: 1, name: "Choices" })).toBeVisible();
        }
    });
});

test.describe("Tokens", () => {
    test("every role token has a light and a dark value", async ({ page }) => {
        await page.goto("/page/overview");
        const tokens = await page.evaluate(() => {
            const light = new Set<string>();
            const dark = new Set<string>();
            for (const sheet of Array.from(document.styleSheets)) {
                if (!sheet.href?.includes("graft.css")) {
                    continue;
                }
                for (const rule of Array.from(sheet.cssRules)) {
                    if (!(rule instanceof CSSStyleRule)) {
                        continue;
                    }
                    const selectors = rule.selectorText.split(",").map(selector => selector.trim());
                    const target = selectors.includes(".dark") ? dark : selectors.includes(".light") ? light : undefined;
                    for (const name of Array.from(rule.style)) {
                        target?.add(name);
                    }
                }
            }
            return {
                light: [...light].sort(),
                dark: [...dark].sort(),
            };
        });
        expect(tokens.light.length).toBeGreaterThan(0);
        expect(tokens.dark).toEqual(tokens.light);
    });
});

test.describe("Commit graph", () => {
    test("every lane runs unbroken from one commit row to the next", async ({ page }) => {
        await openPage(page, "/page/commit-graph", { components: "dark" });
        const graph = page.locator('main .dark [data-graph="Every lane colour"]');
        for (const lane of [1, 2, 3, 4, 5, 6]) {
            const segments = graph.locator(`line[data-lane="${lane}"]`);
            const boxes = [];
            for (let index = 0; index < (await segments.count()); index++) {
                boxes.push((await segments.nth(index).boundingBox())!);
            }
            expect(boxes.length).toBeGreaterThan(1);
            boxes.sort((a, b) => a.y - b.y);
            for (let index = 1; index < boxes.length; index++) {
                const previousBottom = boxes[index - 1].y + boxes[index - 1].height;
                expect(boxes[index].y).toBeLessThanOrEqual(previousBottom + 0.5);
            }
            expect(new Set(boxes.map(box => Math.round(box.x))).size).toBe(1);
        }
    });

    test("the page shows each history with every lane colour", async ({ page }) => {
        await openPage(page, "/page/commit-graph", { components: "light" });
        for (const title of ["Straight history", "Feature branch merged", "Branch not merged yet", "Two branches at once", "Every lane colour"]) {
            await expect(page.locator(`main [data-graph="${title}"]`)).toBeVisible();
        }
        const lastLane = page.locator('main [data-graph="Every lane colour"] line[data-lane="6"]').first();
        expect(await computedStyle(lastLane, "stroke")).toBe(await page.evaluate(() => {
            const probe = document.createElement("div");
            probe.style.color = "var(--color-lane-6)";
            document.querySelector('main .light')!.appendChild(probe);
            const colour = getComputedStyle(probe).color;
            probe.remove();
            return colour;
        }));
    });
});

test.describe("Fonts", () => {
    test("text and code use the chosen fonts and both fonts load", async ({ page }) => {
        await page.goto("/page/overview");
        await page.evaluate(() => document.fonts.ready);
        expect(await computedStyle(page.locator("body"), "font-family")).toContain("Mona Sans");
        const codeSample = page.getByText("a1b2c3d Fixed the merge base lookup").first();
        expect(await computedStyle(codeSample, "font-family")).toContain("Monaspace Neon");
        expect(await isFontLoaded(page, "Mona Sans")).toBe(true);
        expect(await isFontLoaded(page, "Monaspace Neon")).toBe(true);
    });

    test("the fonts page shows each font in use", async ({ page }) => {
        await openPage(page, "/page/fonts", { components: "light" });
        await expect(page.getByRole("heading", { level: 1, name: "Fonts" })).toBeVisible();
        const uiSample = page.getByText("Fixed the merge base lookup").first();
        const codeSample = page.getByText("a1b2c3d feature/style-guide src/lib/graph.ts").first();
        expect(await computedStyle(uiSample, "font-family")).toContain("Mona Sans");
        expect(await computedStyle(codeSample, "font-family")).toContain("Monaspace Neon");
    });
});

//
// Returns whether the page has loaded a font face of `family`, so a test can tell a font that
// downloaded from one the browser replaced with a fallback.
//
export async function isFontLoaded(page: Page, family: string): Promise<boolean> {
    return page.evaluate(
        name => Array.from(document.fonts).some(fontFace => fontFace.family.replace(/"/g, "") === name && fontFace.status === "loaded"),
        family,
    );
}

test.describe("Component pages", () => {
    test("the drop-down menu button opens its menu below it and choosing an item closes it", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 2400 });
        await openPage(page, "/page/button", { components: "light" });
        const merge = page.getByRole("button", { name: "Merge" });
        const buttonBox = await merge.boundingBox();
        await merge.click();
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        await expect.poll(async () => (await menu.boundingBox())!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height - 1);
        await menu.getByRole("menuitem", { name: "Rebase onto main" }).click();
        await expect(page.getByRole("menu")).toHaveCount(0);
        await expect(page.getByText("Chose: Rebase onto main")).toBeVisible();
    });

    test("the drop-down dialog button opens its settings below it, runs on Pull and closes on Cancel", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 2400 });
        await openPage(page, "/page/button", { components: "light" });
        const pull = page.getByRole("button", { name: "Pull", exact: true });
        const buttonBox = await pull.boundingBox();
        await pull.click();
        const settings = page.getByRole("dialog", { name: "Pull settings" });
        await expect(settings).toBeVisible();
        await expect.poll(async () => (await settings.boundingBox())!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height - 1);
        await settings.getByRole("button", { name: "Cancel" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await pull.click();
        await page.getByRole("dialog", { name: "Pull settings" }).getByRole("radio", { name: "Rebase" }).check();
        await page.getByRole("dialog", { name: "Pull settings" }).getByRole("button", { name: "Pull" }).click();
        await expect(page.getByText("Pulled from origin with rebase, auto-stash on.")).toBeVisible();
    });

    test("a menu takes the theme of the panel it opens from", async ({ page }) => {
        await openPage(page, "/page/button", { components: "both" });
        const dropDowns = page.locator("main section").filter({ hasText: "Drop-down buttons" });
        await dropDowns.locator('.dark').getByRole("button", { name: "Merge" }).click();
        const darkBackground = await computedStyle(page.getByRole("menu").locator(".."), "background-color");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("menu")).toHaveCount(0);
        await dropDowns.locator('.light').getByRole("button", { name: "Merge" }).click();
        const lightBackground = await computedStyle(page.getByRole("menu").locator(".."), "background-color");
        expect(lightBackground).not.toBe(darkBackground);
    });

    test("a select opens its list and shows the chosen item", async ({ page }) => {
        await openPage(page, "/page/select", { components: "light" });
        const select = page.getByRole("combobox").first();
        await select.click();
        await page.getByRole("option", { name: "upstream" }).click();
        await expect(select).toHaveText("upstream");
    });

    test("the stage all checkbox is mixed while some files are ticked and ticks them all when clicked", async ({ page }) => {
        await openPage(page, "/page/checkbox", { components: "light" });
        const stageAll = page.getByRole("checkbox", { name: "Stage all" });
        await expect(stageAll).toHaveAttribute("data-indeterminate", "true");
        await stageAll.click();
        await expect(page.getByRole("checkbox", { name: "src/lanes.ts" })).toBeChecked();
        await expect(stageAll).toBeChecked();
    });

    test("clicking a tab or pressing the arrow keys switches the view below", async ({ page }) => {
        await openPage(page, "/page/tabs", { components: "light" });
        const tabs = page.getByRole("tablist", { name: "Repository views" });
        await tabs.getByRole("tab", { name: /History/ }).click();
        await expect(page.getByText("128 commits on main.")).toBeVisible();
        await page.keyboard.press("ArrowRight");
        await expect(tabs.getByRole("tab", { name: /Stashes/ })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.getByText("2 stashed sets of changes.")).toBeVisible();
    });

    test("right-clicking a commit opens the context menu", async ({ page }) => {
        await openPage(page, "/page/menu", { components: "light" });
        await page.getByText("Right-click this commit").click({ button: "right" });
        await expect(page.getByRole("menu")).toBeVisible();
        await expect(page.getByRole("menuitem", { name: /Reset to here/ })).toBeVisible();
    });

    test("a tooltip shows when the pointer rests on its button", async ({ page }) => {
        await openPage(page, "/page/tooltip", { components: "light" });
        const section = page.locator("main section").filter({ hasText: "On hover and focus" });
        await section.getByRole("button", { name: "Push" }).hover();
        await expect(page.getByRole("tooltip").filter({ hasText: "Push" })).toBeVisible();
    });

    test("a directory in the tree closes and opens with its +/- button, and a click only selects it", async ({ page }) => {
        await openPage(page, "/page/tree", { components: "light" });
        const tree = page.getByRole("list", { name: "Changed files" }).first();
        await expect(tree.getByText("lanes.ts")).toBeVisible();
        await tree.getByRole("button", { name: "Directory src/graph", exact: true }).click();
        await expect(tree.getByRole("button", { name: "Directory src/graph", exact: true })).toHaveClass(/Mui-selected/);
        await expect(tree.getByText("lanes.ts")).toBeVisible();
        await tree.getByRole("button", { name: "Collapse src/graph" }).click();
        await expect(tree.getByText("lanes.ts")).toHaveCount(0);
        await tree.getByRole("button", { name: "Expand src/graph" }).click();
        await expect(tree.getByText("lanes.ts")).toBeVisible();
    });

    test("the command palette narrows as you type and runs the highlighted command on Enter", async ({ page }) => {
        await openPage(page, "/page/command-palette", { components: "light" });
        await page.getByRole("button", { name: "Open command palette" }).click();
        const search = page.getByRole("textbox", { name: "Command" }).last();
        await expect(search).toBeFocused();
        await page.keyboard.type("pu");
        await expect(page.getByRole("dialog", { name: "Command palette" }).getByRole("button")).toHaveText([/Pull/, /Push/]);
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.getByText("Ran: Push")).toBeVisible();
    });

    test("toasts of each kind stack up at the bottom of the screen and close on Dismiss", async ({ page }) => {
        await openPage(page, "/page/notifications", { components: "light" });
        for (const label of ["Plain", "Info", "Success", "Warning", "Error"]) {
            await page.getByRole("button", { name: label, exact: true }).click();
        }
        const liveToasts = page.locator('[aria-live="polite"]');
        const success = liveToasts.getByRole("alert").filter({ hasText: "Pushed 2 commits to origin/main." });
        const error = liveToasts.getByRole("alert").filter({ hasText: "Push rejected. Pull first, then push again." });
        await expect(success).toBeVisible();
        await expect(error).toBeVisible();
        await expect.poll(async () => (await error.boundingBox())!.y).toBeGreaterThan((await success.boundingBox())!.y);
        await success.getByRole("button", { name: "Dismiss" }).click();
        await expect(success).toHaveCount(0);
        await expect(error).toBeVisible();
    });

    test("pressing ? opens the shortcuts overlay, typing narrows the list and Escape closes it", async ({ page }) => {
        await openPage(page, "/page/shortcuts", { components: "light" });
        await page.locator("main h1").click();
        await page.keyboard.press("?");
        const overlay = page.getByRole("dialog", { name: "Keyboard shortcuts" });
        await expect(overlay).toHaveCount(1);
        await expect(overlay.getByRole("textbox", { name: "Search shortcuts" })).toBeFocused();
        await page.keyboard.type("push");
        await expect(overlay.getByRole("listitem")).toHaveCount(1);
        await expect(overlay.getByRole("listitem")).toContainText("Push");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
    });
});

test.describe("Commit explorer", () => {
    test("the arrow keys, Enter and Escape move through the commit, details and file panes", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.focus();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        const details = explorer.getByRole("region", { name: "Commit details" });
        await expect(details.getByRole("button", { name: "Commit details", exact: true })).toBeVisible();
        await expect(details).toHaveAttribute("data-active", "true");
        await page.keyboard.press("ArrowDown");
        await expect(explorer.getByRole("region", { name: "Full commit details" })).toContainText("Sam Lee");
        await page.keyboard.press("ArrowDown");
        await expect(details.getByRole("button", { name: "Directory frontend/src/lib", exact: true })).toHaveClass(/Mui-selected/);
        await page.keyboard.press("ArrowDown");
        const file = explorer.getByRole("region", { name: "File diff" });
        await expect(file).toContainText("frontend/src/lib/commit-explorer.ts");
        await expect(details).toHaveAttribute("data-active", "true");
        await page.keyboard.press("Enter");
        await expect(file).toHaveAttribute("data-active", "true");
        await expect(file.locator('[data-line="added"]')).toHaveCount(8);
        await page.keyboard.press("ArrowLeft");
        await expect(details).toHaveAttribute("data-active", "true");
        await page.keyboard.press("Escape");
        await expect(file).toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(details).toHaveCount(0);
        await expect(explorer.getByRole("region", { name: "Commits" })).toHaveAttribute("data-active", "true");
    });

    test("clicking a commit opens it and its close button closes it", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.getByText("Initial commit").click();
        const details = explorer.getByRole("region", { name: "Commit details" });
        await details.getByRole("button", { name: "Commit details", exact: true }).click();
        await expect(explorer.getByRole("region", { name: "Full commit details" })).toContainText("None, this is the first commit");
        await details.getByRole("button", { name: "Close commit details" }).click();
        await expect(details).toHaveCount(0);
    });

    test("the main lane runs unbroken from the newest commit to the first, with the feature branch beside it", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const commitPane = page.getByRole("application", { name: "Commit explorer" }).first().getByRole("region", { name: "Commits" });
        const segments = commitPane.locator('line[data-lane="1"]');
        const boxes = [];
        for (let index = 0; index < (await segments.count()); index++) {
            boxes.push((await segments.nth(index).boundingBox())!);
        }
        boxes.sort((a, b) => a.y - b.y);
        expect(boxes.length).toBeGreaterThan(graftHistory.commits.length);
        for (let index = 1; index < boxes.length; index++) {
            expect(boxes[index].y).toBeLessThanOrEqual(boxes[index - 1].y + boxes[index - 1].height + 0.5);
        }
        await expect(commitPane.locator('line[data-lane="2"]')).toHaveCount(2);
        await expect(commitPane.locator('svg[preserveAspectRatio="none"] path')).toHaveCount(2);
    });

    test("every example file's added and deleted counts match its diff", () => {
        for (const commit of [graftHistory, releaseHistory, longBranchHistory].flatMap(history => history.commits)) {
            for (const file of commit.files) {
                const lines = file.diff.split("\n").filter(line => !line.startsWith("@@"));
                expect(lines.filter(line => line.startsWith("+")).length, `${file.path} added`).toBe(file.linesAdded);
                expect(lines.filter(line => line.startsWith("-")).length, `${file.path} deleted`).toBe(file.linesDeleted);
            }
        }
    });

    test("opening a pane scrolls only inside the explorer, never the page", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
});

test.describe("Git commands panel", () => {
    test("the panel shows no commands, one command or two commands, with no recent or earlier labels", async ({ page }) => {
        await openPage(page, "/page/git-commands-panel", { components: "light" });
        const panels = page.getByRole("region", { name: "Git commands" });
        await expect(panels.nth(0)).toContainText("This page ran no Git commands.");
        await expect(panels.nth(1).getByRole("listitem")).toHaveCount(1);
        await expect(panels.nth(1)).toContainText("git log --max-count=50");
        await expect(panels.nth(2).getByRole("listitem")).toHaveCount(2);
        await expect(panels.nth(2).getByRole("listitem").first()).toContainText("git log --max-count=1");
        await expect(panels.nth(2)).not.toContainText("Most recent");
        await expect(panels.nth(2)).not.toContainText("Before that");
    });

    test("a copy button copies its command and shows a tick for a moment", async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await openPage(page, "/page/git-commands-panel", { components: "light" });
        const panel = page.getByRole("region", { name: "Git commands" }).nth(1);
        await panel.getByRole("button", { name: "Copy command" }).click();
        await expect(panel.getByRole("button", { name: "Copied" })).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("git log --max-count=50");
        await expect(panel.getByRole("button", { name: "Copy command" })).toBeVisible({ timeout: 4000 });
    });
});

test.describe("Diff", () => {
    test("the unified view marks changed words and shows the unchanged lines between hunks on request", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        const diff = card.getByRole("table", { name: "Unified diff" });
        await expect(diff.locator('mark[data-word-change="deleted"]')).toContainText(["body"]);
        await expect(diff.locator('mark[data-word-change="added"]').filter({ hasText: "documentElement" })).toHaveCount(1);
        const contextRows = diff.locator('[data-line="context"]');
        const before = await contextRows.count();
        await card.getByRole("button", { name: "Show 24 unchanged lines" }).click();
        await expect(contextRows).toHaveCount(before + 24);
    });

    test("the layout switch shows the old and new files side by side, striping a side with no line", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Side by side" }).click();
        await page.keyboard.press("Escape");
        const diff = card.getByRole("table", { name: "Side-by-side diff" });
        await expect(diff.locator('[data-side="old"][data-line="deleted"]')).toHaveCount(3);
        await expect(diff.locator('[data-side="new"][data-line="added"]')).toHaveCount(5);
        await expect(diff.locator('[data-side="old"][data-empty="true"]')).toHaveCount(2);
    });

    test("the wrap switch wraps long lines inside the view", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").filter({ has: page.getByRole("heading", { name: "Long lines" }) }).getByRole("region", { name: "docs/user-guide.md" }).first();
        const row = card.locator('[data-line="added"]');
        const oneRowHeight = (await row.boundingBox())!.height;
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByLabel("Wrap long lines").click();
        await page.keyboard.press("Escape");
        await expect.poll(async () => (await row.boundingBox())!.height).toBeGreaterThan(oneRowHeight * 1.5);
    });

    test("a deleted file starts folded and a large diff waits behind a button", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const kinds = page.locator("main section.mb-10").filter({ has: page.getByRole("heading", { name: "Diff explorer" }) });
        const deleted = kinds.getByRole("region", { name: "frontend/src/lib/old-theme.ts" });
        await expect(deleted.getByRole("table")).toHaveCount(0);
        await deleted.getByRole("button", { name: "Show the diff" }).click();
        await expect(deleted.locator('[data-line="deleted"]')).toHaveCount(3);
        const lock = kinds.getByRole("region", { name: "bun.lock" });
        await expect(lock).toContainText("1,240 changed lines");
        await lock.getByRole("button", { name: "Show the diff" }).click();
        await expect(lock.locator('[data-line="added"]')).toHaveCount(1240);
    });
});

test.describe("Commit explorer search and file views", () => {
    test("the search lists only the matching commits, without the graph's lanes", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        const commitPane = explorer.getByRole("region", { name: "Commits" });
        const lanesBefore = await commitPane.locator("line[data-lane]").count();
        await commitPane.getByRole("button", { name: "Search commits" }).click();
        await explorer.getByRole("textbox", { name: "Search commits" }).fill("pane");
        await page.keyboard.press("Enter");
        const rows = commitPane.getByRole("list", { name: "Commits" }).locator(":scope > li.MuiListItemButton-root");
        //
        // The search matches descriptions as well as titles, authors, hashes and refs.
        //
        await expect(rows).toHaveCount(5);
        await expect(commitPane).toContainText("5 of 7");
        await expect(commitPane.locator("line[data-lane]")).toHaveCount(0);
        await explorer.getByRole("button", { name: "Close the commit search" }).click();
        await expect(rows).toHaveCount(7);
        await expect(commitPane.locator("line[data-lane]")).toHaveCount(lanesBefore);
    });

    test("the tree view lists files by directory and the arrow keys follow its order", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.getByText("Show a changed file").click();
        const details = explorer.getByRole("region", { name: "Commit details" });
        await details.getByRole("button", { name: "Commit options" }).click();
        await page.getByRole("dialog", { name: "Commit options" }).getByRole("button", { name: "Tree" }).click();
        await page.keyboard.press("Escape");
        await expect(details.getByText("backend/src/tasks")).toBeVisible();
        await page.keyboard.press("ArrowRight");
        for (let step = 0; step < 3; step++) {
            await page.keyboard.press("ArrowDown");
        }
        await expect(explorer.getByRole("region", { name: "File diff" })).toContainText("backend/src/tasks/file-diff-task.zig");
        for (let step = 0; step < 3; step++) {
            await page.keyboard.press("ArrowDown");
        }
        await expect(explorer.getByRole("region", { name: "File diff" })).toContainText("file-pane.tsx");
    });
});

test.describe("Dotted lanes and sidebar search", () => {
    test("an unmerged branch's lane is dotted and a merged branch's is solid", async ({ page }) => {
        await openPage(page, "/page/commit-graph", { components: "light" });
        expect(await page.locator('[data-graph="Branch not merged yet"] [data-dotted="true"]').count()).toBeGreaterThan(0);
        await expect(page.locator('[data-graph="Feature branch merged"] [data-dotted="true"]')).toHaveCount(0);
    });

    test("the repository sidebar's search box narrows every group to the matching names", async ({ page }) => {
        await openPage(page, "/page/sidebar", { components: "light" });
        const sidebar = page.getByRole("navigation", { name: "Repository" });
        await sidebar.getByRole("button", { name: "Search the repository" }).click();
        await sidebar.getByRole("textbox", { name: "Search the repository" }).fill("v1");
        await expect(sidebar.getByText("v1.0.0")).toBeVisible();
        await expect(sidebar.getByText("origin", { exact: true })).toHaveCount(0);
        await sidebar.getByRole("textbox", { name: "Search the repository" }).fill("nothing-like-this");
        await expect(sidebar).toContainText('Nothing matches "nothing-like-this".');
    });
});

test.describe("File paths, staging and tooltips", () => {
    test("a file path's menu copies the relative path, the full path and the file name", async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        for (const [item, expected] of [
            ["Copy relative file path", "frontend/src/lib/zoom.ts"],
            ["Copy full file path", "/home/you/projects/graft/frontend/src/lib/zoom.ts"],
            ["Copy file name", "zoom.ts"],
        ]) {
            await card.getByRole("button", { name: "Path actions for zoom.ts" }).click();
            await page.getByRole("menuitem", { name: item }).click();
            await expect(card.getByRole("button", { name: "Copied" })).toBeVisible();
            expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
            await expect(card.getByRole("button", { name: "Path actions for zoom.ts" })).toBeVisible({ timeout: 4000 });
        }
        await card.getByRole("button", { name: "Path actions for zoom.ts" }).click();
        await expect(page.getByRole("menuitem", { name: "Open in editor" })).toBeVisible();
        await expect(page.getByRole("menuitem", { name: /Finder|Explorer|file manager/ })).toBeVisible();
    });

    test("Stage and Unstage buttons flip on a click, and some changes start staged", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.getByRole("application", { name: "Diff explorer" }).getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        const hunkButtons = card.getByRole("table").getByRole("button", { name: /^(Stage|Unstage) this hunk$/ });
        await expect.poll(() => hunkButtons.evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(["Unstage this hunk", "Stage this hunk"]);
        const fileButton = card.getByRole("button", { name: /^(Stage|Unstage) this file$/ }).first();
        await expect(fileButton).toHaveAttribute("aria-label", "Stage this file");
        const width = (await fileButton.boundingBox())!.width;
        await hunkButtons.nth(1).click();
        await expect.poll(() => hunkButtons.evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(["Unstage this hunk", "Unstage this hunk"]);
        await expect(fileButton).toHaveAttribute("aria-label", "Unstage this file");
        expect((await fileButton.boundingBox())!.width).toBe(width);
        await fileButton.click();
        await expect.poll(() => hunkButtons.evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(["Stage this hunk", "Stage this hunk"]);
    });

    test("the diff explorer steps from change to change and file to file", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const explorer = page.getByRole("application", { name: "Diff explorer" });
        await explorer.focus();
        await page.keyboard.press("ArrowDown");
        await expect(explorer).toContainText("File 1 of 9 · unchanged lines");
        await page.keyboard.press("ArrowDown");
        await expect(explorer).toContainText("File 1 of 9 · change 1 of 2");
        for (let step = 0; step < 3; step++) {
            await page.keyboard.press("ArrowDown");
        }
        await expect(explorer).toContainText("File 2 of 9 · change 1 of 1");
        await expect(explorer.getByRole("region", { name: "frontend/src/lib/theme-names.ts" })).toHaveAttribute("data-current", "true");
        await expect(explorer.locator('[data-current="true"][data-hunk-index="0"]')).toHaveCount(1);
        await page.keyboard.press("Shift+ArrowDown");
        await expect(explorer).toContainText("File 3 of 9");
        await explorer.getByRole("button", { name: "Previous file" }).click();
        await expect(explorer).toContainText("File 2 of 9");
    });

    test("the commit explorer's file pane scrolls with Up and Down and Shift moves between rows", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 500 });
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(3);
        const file = explorer.getByRole("region", { name: "File diff" });
        const scroller = file.locator("[data-pane-scroll]").first();
        await file.click({ position: { x: 4, y: 4 } });
        await page.keyboard.press("ArrowDown");
        await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
        await page.keyboard.press("ArrowUp");
        await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(0);
        await expect(file).toContainText("frontend/src/lib/git-commands.ts");
        //
        // Shift steps through the rows in view order, so the directory row above the file opens
        // the directory's stacked diffs, and the row above that opens the file there.
        //
        await page.keyboard.press("Shift+ArrowUp");
        await expect(explorer.getByRole("region", { name: "Directory diffs", exact: true })).toBeVisible();
        await page.keyboard.press("Shift+ArrowUp");
        await expect(explorer.getByRole("region", { name: "File diff", exact: true })).toContainText("git-commands-panel.tsx");
        await expect(explorer.getByRole("region", { name: "File diff", exact: true })).toHaveAttribute("data-active", "true");
    });

    test("Space stages and unstages the current change in the diff explorer", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const explorer = page.getByRole("application", { name: "Diff explorer" });
        const card = explorer.getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        const hunkButtons = card.getByRole("table").getByRole("button", { name: /^(Stage|Unstage) this hunk$/ });
        await explorer.focus();
        for (let step = 0; step < 4; step++) {
            await page.keyboard.press("ArrowDown");
        }
        await page.keyboard.press("Space");
        await expect.poll(() => hunkButtons.evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(["Unstage this hunk", "Unstage this hunk"]);
        await page.keyboard.press("Space");
        await expect.poll(() => hunkButtons.evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(["Unstage this hunk", "Stage this hunk"]);
    });

    test("a standalone card steps through its changes with Up and Down and stages with Space", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.focus();
        for (let step = 0; step < 4; step++) {
            await page.keyboard.press("ArrowDown");
        }
        await expect(card.locator('[data-current="true"][data-hunk-index="1"]')).toHaveCount(1);
        await page.keyboard.press("Space");
        await expect.poll(() => card.getByRole("table").getByRole("button", { name: /^(Stage|Unstage) this hunk$/ }).evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")))).toEqual(["Unstage this hunk", "Unstage this hunk"]);
    });

    test("the whole-file switch shows every unchanged line and folds them back", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        const context = card.locator('[data-line="context"]');
        const before = await context.count();
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Show the whole file" }).click();
        await page.keyboard.press("Escape");
        await expect(context).toHaveCount(before + 30);
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Focus on the changes" }).click();
        await page.keyboard.press("Escape");
        await expect(context).toHaveCount(before);
    });

    test("the info button lists the change's stats with labels", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByRole("button", { name: "Change details" }).click();
        const info = page.getByRole("dialog", { name: "Change details" });
        await expect(info).toContainText("ChangeModified");
        await expect(info).toContainText("Lines added5");
        await expect(info).toContainText("Lines deleted3");
        await expect(info).toContainText("Changes2 hunks");
    });

    test("the commit explorer's file pane switches to side by side", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(2);
        const file = explorer.getByRole("region", { name: "File diff" });
        await file.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Side by side" }).click();
        await page.keyboard.press("Escape");
        await expect(file.getByRole("table", { name: "Side-by-side diff" })).toBeVisible();
    });
});

test.describe("Changes and commit", () => {
    test("Up and Down move through the files, Space stages one and committing takes the staged files away", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.focus();
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("ArrowUp");
        await expect(area.getByRole("region", { name: "File diff" })).toContainText("theme-names.ts");
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("Space");
        await expect(area.getByRole("button", { name: "frontend/src/lib/old-theme.ts", exact: true }).getByRole("button", { name: "Unstage this file" })).toBeVisible();
        await expect(area.getByRole("button", { name: "Commit 4 files" })).toBeDisabled();
        await area.getByRole("textbox", { name: "Summary" }).fill("Tidy the themes");
        await area.getByRole("button", { name: "Commit 4 files" }).click();
        await expect(area).toContainText("Committed 4 files: Tidy the themes");
        await expect(area.getByRole("button", { name: "frontend/src/lib/theme-names.ts" })).toHaveCount(0);
        await expect(area.getByRole("button", { name: "frontend/src/lib/zoom.ts" })).toBeVisible();
    });

    test("ticking Amend brings in the last commit's message", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.getByRole("checkbox", { name: "Amend" }).check();
        await expect(area.getByRole("textbox", { name: "Summary" })).toHaveValue("Show the Git commands each page runs");
        await expect(area.getByRole("button", { name: "Amend commit" })).toBeEnabled();
        await expect(area.getByRole("checkbox", { name: "No verify" })).toBeVisible();
    });

    test("the split view lists staged and unstaged files apart and shows the diff in two sections", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await showStagedAndUnstaged(page, area);
        await expect(area.getByText("Staged (3)")).toBeVisible();
        await expect(area.getByText("Unstaged (7)")).toBeVisible();
        await expect(area.getByRole("region", { name: "Staged changes", exact: true })).toBeVisible();
        await expect(area.getByRole("region", { name: "Unstaged changes" })).toBeVisible();
        await area.getByRole("region", { name: "Unstaged changes" }).getByRole("button", { name: "Stage this hunk" }).last().click();
        await expect(area.getByText("Unstaged (6)")).toBeVisible();
    });

    test("the search box narrows the changed files", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.getByRole("button", { name: "Search the changed files" }).click();
        await area.getByRole("textbox", { name: "Search changed files" }).fill("theme");
        await expect(area.getByRole("region", { name: "Changed files" }).locator("li[aria-label]:not([aria-label^=\"Directory \"])")).toHaveCount(3);
        await expect(area).toContainText("3 of 9");
    });

    test("an image file shows its old and new versions side by side", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.getByRole("button", { name: "assets/graft-512.png" }).getByText("graft-512.png").click();
        await expect(area.getByRole("img", { name: /^Before/ })).toBeVisible();
        await expect(area.getByRole("img", { name: /^After/ })).toBeVisible();
    });

    test("M and the maximise button make a pane fill the area and put it back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.focus();
        await page.keyboard.press("m");
        await expect(area.getByRole("region", { name: "File diff" })).toBeHidden();
        await page.keyboard.press("m");
        await expect(area.getByRole("region", { name: "File diff" })).toBeVisible();
        await area.getByRole("button", { name: "Maximise the pane" }).last().click();
        await expect(area.getByRole("region", { name: "Changed files" })).toBeHidden();
        await area.getByRole("button", { name: "Restore the pane" }).click();
        await expect(area.getByRole("region", { name: "Changed files" })).toBeVisible();
    });
});

test.describe("Finding, clicking hunks, resizing and maximising", () => {
    test("the find box counts matches and steps through them", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await expect(card.getByRole("textbox", { name: "Find in this diff" })).toHaveCount(0);
        await card.getByText("saveState({ zoom: value });").click();
        await page.keyboard.press("Control+f");
        await expect(card.getByRole("textbox", { name: "Find in this diff" })).toBeFocused();
        await page.keyboard.type("level");
        await expect(card.locator('[data-current-match="true"]')).toHaveCount(0);
        await page.keyboard.press("Enter");
        await expect(card).toContainText("1 of 6");
        await expect(card.locator('[data-current-match="true"]')).toHaveCount(1);
        await card.getByRole("textbox", { name: "Find in this diff" }).press("Enter");
        await expect(card).toContainText("2 of 6");
        await card.getByRole("button", { name: "Previous match" }).click();
        await expect(card).toContainText("1 of 6");
        await card.getByRole("textbox", { name: "Find in this diff" }).press("Escape");
        await expect(card.getByRole("textbox", { name: "Find in this diff" })).toHaveCount(0);
        await expect(card.locator("[data-search-match]")).toHaveCount(0);
    });

    test("clicking a hunk makes it the current one", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByText("saveState({ zoom: value });").click();
        await expect(card.locator('[data-current="true"][data-hunk-index="1"]')).toHaveCount(1);
    });

    test("the commit explorer's resize handle widens the commit list and M maximises a pane", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        const commits = explorer.getByRole("region", { name: "Commits" });
        const before = (await commits.boundingBox())!.width;
        await explorer.getByRole("separator", { name: "Resize the commit list" }).focus();
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowLeft");
        await expect.poll(async () => (await commits.boundingBox())!.width).toBeLessThan(before - 20);
        await explorer.getByText("Initial commit").click();
        await page.keyboard.press("m");
        await expect(explorer.getByRole("region", { name: "Commit details" })).toBeHidden();
        await page.keyboard.press("m");
        await expect(explorer.getByRole("region", { name: "Commit details" })).toBeVisible();
    });
});

test.describe("Whole file, search in shown lines and clicking panes", () => {
    test("search finds matches in unchanged lines once the whole file shows", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByRole("button", { name: "Open the find box" }).click();
        const find = card.getByRole("textbox", { name: "Find in this diff" });
        await find.fill("zoomIn");
        await find.press("Enter");
        await expect(card).toContainText("No matches");
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Show the whole file" }).click();
        await page.keyboard.press("Escape");
        await expect(card).toContainText("1 of 1");
        await expect(card.locator('[data-search-match="0"]')).toBeVisible();
    });

    test("every changed text file in the commit explorer can show the whole file", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { has: page.getByRole("heading", { name: "A file with several changes" }) });
        const explorer = section.getByRole("application", { name: "Commit explorer" }).first();
        const pane = explorer.getByRole("region", { name: "File diff" });
        const before = await pane.locator('[role="row"]').count();
        await pane.getByRole("button", { name: "Diff options" }).click();
        const toggle = page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Show the whole file" });
        await expect(toggle).toBeEnabled();
        await toggle.click();
        await page.keyboard.press("Escape");
        await expect.poll(() => pane.locator('[role="row"]').count()).toBeGreaterThan(before);
    });

    test("a press anywhere in a commit explorer pane makes it active", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(2);
        await explorer.getByRole("region", { name: "Commit details" }).getByText("Files changed").click();
        await expect(explorer.getByRole("region", { name: "Commit details" })).toHaveAttribute("data-active", "true");
        await explorer.getByRole("region", { name: "Commits" }).getByText("Initial commit").click();
        await expect(explorer.getByRole("region", { name: "Commits" })).toHaveAttribute("data-active", "true");
    });
});

test.describe("Discarding changes", () => {
    test("discarding a hunk fades it in place and Undo brings it back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const card = area.getByRole("region", { name: "File diff" });
        await expect(card.getByRole("button", { name: "Discard this hunk" })).toHaveCount(0);
        await card.locator('[data-hunk-index="1"]').click();
        await card.getByRole("button", { name: "Discard this hunk" }).click();
        await expect(card.locator('[data-hunk-index="1"]')).toHaveAttribute("data-discarded", "true");
        await expect(card.locator("[data-hunk-index]")).toHaveCount(2);
        await card.getByRole("button", { name: "Undo the discard of this hunk" }).click();
        await expect(card.locator('[data-hunk-index="1"]')).not.toHaveAttribute("data-discarded", "true");
        await expect(card.getByRole("button", { name: "Discard this hunk" })).toHaveCount(1);
    });

    test("discarding a file fades its row and its diff, and Undo brings it back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const card = area.getByRole("region", { name: "File diff" });
        await area.getByRole("region", { name: "Changed files" }).getByRole("button", { name: "Discard this file" }).click();
        const row = area.getByRole("region", { name: "Changed files" }).getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true });
        await expect(row).toHaveAttribute("data-discarded", "true");
        await expect(card.locator('[data-discarded="true"][data-hunk-index]')).toHaveCount(2);
        await row.getByRole("button", { name: "Undo the discard of this file" }).click();
        await expect(row).not.toHaveAttribute("data-discarded", "true");
        await expect(card.locator('[data-discarded="true"]')).toHaveCount(0);
    });

    test("the Delete key discards what the keys are on and brings it back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const card = area.getByRole("region", { name: "File diff" });
        const row = area.getByRole("region", { name: "Changed files" }).getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true });
        await area.focus();
        await page.keyboard.press("Delete");
        await expect(row).toHaveAttribute("data-discarded", "true");
        await page.keyboard.press("Delete");
        await expect(row).not.toHaveAttribute("data-discarded", "true");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await expect(card.locator('[data-current="true"][data-hunk-index="0"]')).toHaveCount(1);
        await page.keyboard.press("Delete");
        await expect(card.locator('[data-hunk-index="0"]')).toHaveAttribute("data-discarded", "true");
        await expect(row).not.toHaveAttribute("data-discarded", "true");
    });
});

test.describe("Runs of unchanged lines and the full commit details", () => {
    test("Up and Down stop on runs of unchanged lines and Space shows and folds them", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        const context = card.locator('[data-line="context"]');
        const before = await context.count();
        await card.focus();
        await page.keyboard.press("ArrowDown");
        await expect(card.locator('[data-current="true"][data-gap-index="0"]')).toHaveCount(1);
        await page.keyboard.press("Space");
        await expect(context).toHaveCount(before + 6);
        await page.keyboard.press("Space");
        await expect(context).toHaveCount(before);
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await expect(card.locator('[data-current="true"][data-gap-index="1"]')).toHaveCount(1);
    });

    test("clicking a run of unchanged lines makes it the current stop", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByText("24 unchanged lines").click();
        await expect(diff.locator('[data-current="true"][data-gap-index="1"]')).toHaveCount(1);
        await page.keyboard.press("Space");
        await expect(diff.getByRole("button", { name: "Hide 24 unchanged lines" })).toBeVisible();
    });

    test("the commit's row opens its full details, with copy buttons for the summary and description", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.getByText("Show the Git commands each page runs").click();
        const details = explorer.getByRole("region", { name: "Commit details" });
        await details.getByRole("button", { name: "Commit details", exact: true }).click();
        const full = explorer.getByRole("region", { name: "Full commit details" });
        await expect(full).toContainText("The help panel in the right sidebar lists the commands");
        await expect(full.getByRole("button", { name: "Copy summary" })).toBeVisible();
        await expect(full.getByRole("button", { name: "Copy description" })).toBeVisible();
    });
});

test.describe("Diff options and picking lines", () => {
    test("the options dialog names every option with its key, and the keys work", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByRole("button", { name: "Diff options" }).click();
        const dialog = page.getByRole("dialog", { name: "Diff options" });
        for (const label of ["Lines shown", "Layout", "Wrap long lines", "Stage and discard"]) {
            await expect(dialog).toContainText(label);
        }
        await page.keyboard.press("Escape");
        await card.focus();
        await page.keyboard.press("l");
        await expect(card.getByRole("table", { name: "Side-by-side diff" })).toBeVisible();
    });

    test("picked lines stage on their own and show apart in the split view", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.getByRole("button", { name: ".gitignore", exact: true }).getByText(".gitignore").click();
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        await diff.locator('[data-line-id][data-line="added"]').filter({ hasText: "tmp/" }).click();
        await expect(diff.locator('[data-picked="true"]')).toHaveCount(1);
        await diff.getByRole("button", { name: "Stage this line", exact: true }).click();
        await showStagedAndUnstaged(page, area);
        const staged = area.getByRole("region", { name: "Staged diff", exact: true });
        await expect(staged.locator('[data-line="added"]')).toHaveCount(1);
        await expect(staged).toContainText("tmp/");
        const unstaged = area.getByRole("region", { name: "Unstaged diff" });
        await expect(unstaged.locator('[data-line="added"]')).toHaveCount(1);
        await expect(unstaged.locator('[data-line="deleted"]')).toHaveCount(1);
    });

    test("discarding picked lines fades them and Undo brings them back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        const line = diff.locator("[data-line-id]").filter({ hasText: "DEFAULT_LEVEL = 1" });
        await line.click();
        await diff.getByRole("button", { name: "Discard this line" }).click();
        await expect(line).toHaveAttribute("data-discarded", "true");
        await diff.getByRole("button", { name: "Undo the discard of this line" }).click();
        await expect(line).not.toHaveAttribute("data-discarded", "true");
    });
});

test.describe("Popups and the page scrollbar", () => {
    test("opening a dropdown dialog leaves the page free to scroll", async ({ page }) => {
        await openPage(page, "/page/diff", { components: "light" });
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByRole("button", { name: "Change details" }).click();
        await expect(page.getByRole("dialog", { name: "Change details" })).toBeVisible();
        expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("visible");
    });
});

test.describe("Danger icon buttons", () => {
    test("the Discard icon buttons draw their icon and border in the danger colour", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const button = page.getByRole("application", { name: "Changes" }).first().getByRole("button", { name: "Discard this file" }).first();
        const colours = await button.evaluate(element => {
            const style = getComputedStyle(element);
            const probe = document.createElement("span");
            probe.style.color = "var(--color-danger)";
            element.parentElement!.appendChild(probe);
            const danger = getComputedStyle(probe).color;
            probe.remove();
            return { color: style.color, shadow: style.boxShadow, danger };
        });
        expect(colours.color).toBe(colours.danger);
        expect(colours.shadow).toContain(colours.danger);
    });
});

test.describe("Picking lines like hunks", () => {
    test("a click picks a line, Shift picks a run, Ctrl adds a line and the keys move the pick", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        const lines = diff.locator("[data-line-id]");
        const picked = diff.locator('[data-picked="true"]');
        await expect(diff.getByRole("checkbox")).toHaveCount(0);
        await lines.nth(0).click();
        await expect(picked).toHaveCount(1);
        await lines.nth(2).click({ modifiers: ["Shift"] });
        await expect(picked).toHaveCount(3);
        await lines.nth(5).click({ modifiers: ["ControlOrMeta"] });
        await expect(picked).toHaveCount(4);
        await lines.nth(0).click();
        await page.keyboard.press("ArrowDown");
        await expect(picked).toHaveCount(1);
        await expect(lines.nth(1)).toHaveAttribute("data-picked", "true");
        await page.keyboard.press("Shift+ArrowDown");
        await expect(picked).toHaveCount(2);
    });
});

test.describe("One selection at a time", () => {
    test("the lines mode shows only the picked lines' border, not the current hunk's", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.locator('[data-hunk-index="1"]').click();
        await expect(diff.locator('[data-current="true"][data-hunk-index="1"]')).toHaveCount(1);
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        await expect(diff.locator('[data-current="true"][data-hunk-index]')).toHaveCount(0);
    });
});

test.describe("Runs of unchanged lines in the lines mode", () => {
    test("Up and Down stop on runs between lines, a click picks a run and Space opens it", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        await diff.getByText("24 unchanged lines").click();
        await expect(diff.locator('[data-current="true"][data-gap-index="1"]')).toHaveCount(1);
        await expect(diff.locator('[data-picked="true"]')).toHaveCount(0);
        await page.keyboard.press("Space");
        await expect(diff.getByRole("button", { name: "Hide 24 unchanged lines" })).toBeVisible();
        await page.keyboard.press("ArrowDown");
        await expect(diff.locator('[data-picked="true"]')).toHaveCount(1);
        await expect(diff.locator('[data-current="true"][data-gap-index]')).toHaveCount(0);
        await page.keyboard.press("ArrowUp");
        await expect(diff.locator('[data-current="true"][data-gap-index="1"]')).toHaveCount(1);
    });
});

test.describe("Any shown line can be picked", () => {
    test("kept lines and shown unchanged lines can be picked, and the buttons sit just across the pick's top edge", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        const kept = diff.locator('[data-line="context"]').filter({ hasText: "function setLevel" });
        await kept.click();
        await expect(kept).toHaveAttribute("data-picked", "true");
        await expect(diff.getByRole("button", { name: "Discard this line" })).toHaveCount(0);
        const added = diff.locator('[data-line="added"]').filter({ hasText: "saveState" });
        await added.click();
        const discard = diff.getByRole("button", { name: "Discard this line" });
        await expect(discard).toBeVisible();
        const row = (await added.boundingBox())!;
        const button = (await discard.boundingBox())!;
        expect(button.y).toBeGreaterThan(row.y - 12);
        expect(button.y + button.height).toBeLessThan(row.y + row.height);
        await diff.getByText("24 unchanged lines").click();
        await page.keyboard.press("Space");
        await page.keyboard.press("ArrowDown");
        await expect(diff.locator('[data-picked="true"][data-line="context"]')).toHaveCount(1);
    });
});

test.describe("Nothing to commit", () => {
    test("an empty working tree says there is nothing to commit", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).last();
        await expect(area).toContainText("No changes. The working tree matches the last commit.");
        await expect(area).toContainText("Nothing to commit.");
        await expect(area.getByRole("button", { name: "Nothing to commit" })).toBeDisabled();
    });
});

test.describe("Collapsing panes", () => {
    test("the Changes and Commit panes collapse to their sides and come back, by button and by C", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const files = area.getByRole("region", { name: "Changed files" });
        await files.getByRole("button", { name: "Collapse the pane" }).click();
        await expect(files).toHaveAttribute("data-collapsed", "true");
        await files.getByRole("button", { name: "Restore changed files" }).click();
        await expect(files).not.toHaveAttribute("data-collapsed", "true");
        const commit = area.getByRole("region", { name: "Commit", exact: true });
        await area.getByRole("region", { name: "Changed files" }).getByText("old-theme.ts").click();
        await page.keyboard.press("c");
        await expect(files).toHaveAttribute("data-collapsed", "true");
        await page.keyboard.press("c");
        await expect(files).not.toHaveAttribute("data-collapsed", "true");
        await commit.getByRole("button", { name: "Collapse the pane" }).click();
        await expect(commit).toHaveAttribute("data-collapsed", "true");
    });

    test("every commit explorer pane collapses to the left and C restores the active one", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(2);
        for (const name of ["Commits", "Commit details", "File diff"]) {
            //
            // A press on a pane mostly out of view only scrolls it into view, so the pane is
            // pressed first and its button after.
            //
            await explorer.getByRole("region", { name, exact: true }).click({ position: { x: 4, y: 4 } });
            await explorer.getByRole("region", { name, exact: true }).getByRole("button", { name: "Collapse the pane" }).click();
            await expect(explorer.getByRole("region", { name, exact: true })).toHaveAttribute("data-collapsed", "true");
        }
        await explorer.getByRole("region", { name: "File diff" }).click();
        await page.keyboard.press("c");
        await expect(explorer.getByRole("region", { name: "File diff" })).not.toHaveAttribute("data-collapsed", "true");
    });
});

test.describe("Staged and Unstaged panels", () => {
    test("each panel collapses to its heading, maximises over the other and comes back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await showStagedAndUnstaged(page, area);
        const staged = area.getByRole("region", { name: "Staged files", exact: true });
        const unstaged = area.getByRole("region", { name: "Unstaged files" });
        await staged.getByRole("button", { name: "Collapse the staged files" }).click();
        await expect(staged).toHaveAttribute("data-collapsed", "true");
        await expect(staged.getByRole("list")).toHaveCount(0);
        await staged.getByRole("button", { name: "Restore the staged files" }).click();
        await expect(staged.getByRole("list")).toHaveCount(1);
        await unstaged.getByRole("button", { name: "Maximise the unstaged files" }).click();
        await expect(staged).toHaveCount(0);
        await unstaged.getByRole("button", { name: "Put the unstaged files back" }).click();
        await expect(staged).toHaveCount(1);
    });

    test("each panel shows its files beside its own diff, stacked in the Changes pane with Commit at the right", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await showStagedAndUnstaged(page, area);
        const staged = area.getByRole("region", { name: "Staged files", exact: true });
        const unstaged = area.getByRole("region", { name: "Unstaged files" });
        await expect(area.getByRole("region", { name: "File diff", exact: true })).toHaveCount(0);
        const stagedBox = await staged.boundingBox();
        const unstagedBox = await unstaged.boundingBox();
        const commitBox = await area.getByRole("region", { name: "Commit", exact: true }).boundingBox();
        expect(stagedBox).not.toBeNull();
        expect(unstagedBox).not.toBeNull();
        expect(commitBox).not.toBeNull();
        if (!stagedBox || !unstagedBox || !commitBox) {
            return;
        }
        expect(stagedBox.y).toBeGreaterThanOrEqual(unstagedBox.y + unstagedBox.height);
        expect(commitBox.x).toBeGreaterThanOrEqual(unstagedBox.x + unstagedBox.width);
        for (const panel of [staged, unstaged]) {
            const listBox = await panel.getByRole("list").first().boundingBox();
            const diffBox = await panel.getByRole("region", { name: /changes$/ }).boundingBox();
            expect(listBox).not.toBeNull();
            expect(diffBox).not.toBeNull();
            if (!listBox || !diffBox) {
                return;
            }
            expect(diffBox.x).toBeGreaterThanOrEqual(listBox.x + listBox.width);
        }
        const unstagedDiff = unstaged.getByRole("region", { name: "Unstaged changes" });
        const unstagedText = await unstagedDiff.innerText();
        const stagedRows = staged.locator("li[aria-label]:not([aria-label^=\"Directory \"])");
        const lastStaged = stagedRows.last();
        const lastStagedPath = await lastStaged.getAttribute("aria-label");
        expect(lastStagedPath).not.toBeNull();
        await lastStaged.click();
        await expect(staged.getByRole("region", { name: "Staged changes" })).toContainText((lastStagedPath ?? "").split("/").pop() ?? "");
        await expect.poll(async () => await unstagedDiff.innerText()).toBe(unstagedText);
    });

    test("Right from the diff moves into the commit message, and Escape and Left come back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await expect(area.getByRole("textbox", { name: "Summary" })).toBeFocused();
        await expect(area.getByRole("region", { name: "Commit", exact: true })).toHaveAttribute("data-active", "true");
        await page.keyboard.press("Escape");
        await expect(area).toBeFocused();
        await page.keyboard.press("ArrowLeft");
        await expect(area.getByRole("region", { name: "File diff" })).toHaveAttribute("data-active", "true");
    });
});

test.describe("Path menu, hover and configuration", () => {
    test("the path menu closes on a click anywhere outside it and the click still lands", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.getByRole("region", { name: "File diff" }).getByRole("button", { name: /^Path actions for/ }).click();
        await expect(page.getByRole("menu")).toBeVisible();
        await area.getByRole("textbox", { name: "Summary" }).click();
        await expect(page.getByRole("menu")).toHaveCount(0);
        await expect(area.getByRole("textbox", { name: "Summary" })).toBeFocused();
        await area.getByRole("region", { name: "File diff" }).getByRole("button", { name: /^Path actions for/ }).click();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("menu")).toHaveCount(0);
    });

    test("a hunk that a click picks shows the hover wash under the pointer", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const hunk = page.getByRole("application", { name: "Changes" }).first().getByRole("region", { name: "File diff" }).locator('[data-hunk-index="1"]');
        await expect(hunk).toHaveClass(/graft-hoverable/);
        await hunk.hover();
        const wash = await hunk.evaluate(element => getComputedStyle(element, "::after").content);
        expect(wash).toBe('""');
    });

    test("the light and dark settings live in the Configuration dropdown, not the sidebar", async ({ page }) => {
        await openPage(page, "/page/button", { components: "light" });
        await expect(page.getByRole("navigation").getByRole("group", { name: "Explorer" })).toHaveCount(0);
        await page.getByRole("button", { name: "Configuration" }).click();
        const dialog = page.getByRole("dialog", { name: "Configuration" });
        await expect(dialog.getByRole("group", { name: "Components" })).toBeVisible();
        await expect(dialog.getByRole("group", { name: "Explorer" })).toBeVisible();
    });
});

test.describe("Commit toast and tooltips", () => {
    test("a commit's toast shows at the bottom centre of the screen", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.getByRole("textbox", { name: "Summary" }).fill("Tidy the themes");
        await area.getByRole("button", { name: "Commit 3 files" }).click();
        const toast = area.getByText("Committed 3 files: Tidy the themes");
        await expect(toast).toBeVisible();
        const box = (await toast.boundingBox())!;
        const viewport = page.viewportSize()!;
        expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(viewport.width * 0.25);
        expect(box.y).toBeGreaterThan(viewport.height / 2);
    });

    test("a floating button's tooltip is wider than the button group", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const diff = page.getByRole("application", { name: "Changes" }).first().getByRole("region", { name: "File diff" });
        await diff.locator('[data-hunk-index="0"]').click();
        await diff.getByRole("button", { name: "Discard this hunk" }).hover();
        const tooltip = page.getByRole("tooltip").filter({ hasText: "Discard this hunk" });
        await expect(tooltip).toBeVisible();
        expect((await tooltip.boundingBox())!.width).toBeGreaterThan(160);
    });
});

test.describe("Discard only on the selection", () => {
    test("only the selected file row and the row under the pointer show Discard, and a discarded row keeps Undo", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const list = area.getByRole("region", { name: "Changed files" });
        const visibleDiscards = list.getByRole("button", { name: "Discard this file" }).filter({ visible: true });
        await expect(visibleDiscards).toHaveCount(1);
        await list.getByRole("button", { name: "docs/README.md", exact: true }).hover();
        await expect(visibleDiscards).toHaveCount(2);
        await list.getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true }).getByRole("button", { name: "Discard this file" }).click();
        await list.getByRole("button", { name: "docs/README.md", exact: true }).getByText("README.md").click();
        await expect(list.getByRole("button", { name: "Undo the discard of this file" })).toHaveCount(1);
        await expect(list.getByRole("button", { name: "Discard this file" }).filter({ visible: true })).toHaveCount(1);
    });
});

test.describe("Counts leave out discarded files", () => {
    test("discarding a file takes it out of its panel's count and the header's, and Undo puts it back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const list = area.getByRole("region", { name: "Changed files" });
        await showStagedAndUnstaged(page, area);
        await expect(list).toContainText("Unstaged (7)");
        await expect(list).toContainText("9 files, 3 staged");
        const readme = list.getByRole("button", { name: "docs/README.md", exact: true });
        await readme.getByText("README.md").click();
        await readme.getByRole("button", { name: "Discard this file" }).click();
        await expect(list).toContainText("Unstaged (6)");
        await expect(list).toContainText("8 files, 3 staged");
        await readme.getByRole("button", { name: "Undo the discard of this file" }).click();
        await expect(list).toContainText("Unstaged (7)");
    });
});

test.describe("Changes options", () => {
    test("one diff shows one list, and the options dialog and S switch to the panels and back", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const list = area.getByRole("region", { name: "Changed files" });
        await expect(list.getByRole("region", { name: "Staged files", exact: true })).toHaveCount(0);
        await expect(list.getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true })).toHaveCount(1);
        await area.getByRole("button", { name: "Changes options" }).click();
        const dialog = page.getByRole("dialog", { name: "Changes options" });
        await expect(dialog).toContainText("Diff view");
        await expect(dialog).toContainText("Panels");
        await page.keyboard.press("Escape");
        await area.focus();
        await page.keyboard.press("s");
        await expect(list.getByRole("region", { name: "Staged files", exact: true })).toHaveCount(1);
        await page.keyboard.press("h");
        await expect(list.getByRole("region", { name: "Staged files", exact: true })).toBeVisible();
        await page.keyboard.press("s");
        await expect(list.getByRole("region", { name: "Staged files", exact: true })).toHaveCount(0);
    });
});

test.describe("Directories in the tree", () => {
    test("a directory is selected with the keys, stages its files with Space and shows only itself with Enter", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const list = area.getByRole("region", { name: "Changed files" });
        const directory = list.getByRole("button", { name: "Directory frontend/src/lib", exact: true });
        await directory.click();
        await expect(directory).toHaveClass(/Mui-selected/);
        await expect(area.getByRole("region", { name: "Diffs in frontend/src/lib" }).getByRole("region", { name: /^File diff / })).toHaveCount(4);
        await expect(directory.getByRole("button", { name: /^(Stage|Unstage) this directory$/ })).toBeVisible();
        await expect(directory.getByRole("button", { name: /^Path actions for/ })).toBeVisible();
        await page.keyboard.press("Space");
        await expect(directory.getByRole("button", { name: "Unstage this directory" })).toBeVisible();
        await page.keyboard.press("Enter");
        await expect(list.getByRole("button", { name: "docs/README.md", exact: true })).toHaveCount(0);
        await expect(list.getByRole("button", { name: "Back to the directory above" })).toBeVisible();
        await page.keyboard.press("ArrowDown");
        await expect(area.getByRole("region", { name: "File diff" })).toContainText("theme-names.ts");
        await page.keyboard.press("Escape");
        await expect(list.getByRole("button", { name: "docs/README.md", exact: true })).toHaveCount(1);
        await expect(list.getByRole("button", { name: "Directory frontend/src/lib", exact: true })).toHaveClass(/Mui-selected/);
    });
});

test.describe("Directories in the commit's file list", () => {
    test("a directory is selected with the keys, has a copy menu, shows its diffs with Enter and only itself with F", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.getByText("Show a changed file").click();
        const details = explorer.getByRole("region", { name: "Commit details" });
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        const directory = details.getByRole("button", { name: /^Directory / }).first();
        await expect(directory).toHaveClass(/Mui-selected/);
        await expect(directory.getByRole("button", { name: /^Path actions for/ })).toBeVisible();
        await expect(explorer.getByRole("region", { name: "Directory diffs" })).toHaveCount(0);
        await page.keyboard.press("Enter");
        await expect(explorer.getByRole("region", { name: "Directory diffs" })).toBeVisible();
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("f");
        await expect(details.getByRole("button", { name: "Back to the directory above" })).toBeVisible();
        //
        // Escape goes up one directory at a time, so it takes one press per directory above.
        //
        for (let press = 0; press < 3 && (await details.getByRole("button", { name: "Back to the directory above" }).count()) > 0; press++) {
            await page.keyboard.press("Escape");
        }
        await expect(details.getByRole("button", { name: "Back to the directory above" })).toHaveCount(0);
        await expect(details.getByRole("region", { name: "Commit details" })).toHaveCount(0);
        await expect(explorer.getByRole("region", { name: "Commit details" })).toBeVisible();
    });
});

test.describe("Tree lines and collapsing directories", () => {
    test("directories collapse and expand by their button", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const list = area.getByRole("region", { name: "Changed files" });
        await list.getByRole("button", { name: "Collapse frontend/src/lib" }).click();
        await expect(list.getByRole("button", { name: "frontend/src/lib/themes.ts", exact: true })).toHaveCount(0);
        await list.getByRole("button", { name: "Expand frontend/src/lib" }).click();
        await expect(list.getByRole("button", { name: "frontend/src/lib/themes.ts", exact: true })).toHaveCount(1);

    });

    test("the tree draws lines joining directories to what is inside them", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const row = page.getByRole("application", { name: "Changes" }).first().getByRole("button", { name: "docs/README.md", exact: true });
        await expect(row.locator('[aria-hidden="true"] > span')).not.toHaveCount(0);
    });

    test("the commit's directories collapse and the focus button shows on the hovered directory", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.getByText("Show a changed file").click();
        const details = explorer.getByRole("region", { name: "Commit details" });
        const directories = details.getByRole("button", { name: /^Directory / });
        await expect(details.getByRole("button", { name: /^Focus on / }).filter({ visible: true })).toHaveCount(0);
        await directories.first().hover();
        await expect(details.getByRole("button", { name: /^Focus on / }).filter({ visible: true })).toHaveCount(1);
        const first = await directories.first().getAttribute("aria-label");
        const path = first!.slice("Directory ".length);
        await details.getByRole("button", { name: `Collapse ${path}` }).click();
        await expect(details.getByRole("button", { name: `Expand ${path}` })).toBeVisible();
    });
});

test.describe("A selected directory's diffs", () => {
    test("a commit's directory shows the diffs of its files stacked, each collapsing on its own", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { hasText: "Directories inside directories" }).first();
        const details = section.getByRole("region", { name: "Commit details" }).first();
        await details.getByRole("button", { name: "Directory backend/src", exact: true }).click();
        await page.keyboard.press("Enter");
        const pane = section.getByRole("region", { name: "Directory diffs" });
        const cards = pane.getByRole("region", { name: /^File diff / });
        await expect(cards).toHaveCount(3);
        await expect(cards.first()).toContainText("pub fn read");
    });

    test("stage buttons name their key", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.getByRole("button", { name: /^Stage this file$/ }).first().hover();
        await expect(page.getByRole("tooltip")).toContainText("Key: Space");
    });
});

test.describe("Directory keys", () => {
    test("E collapses and expands, F focuses and U goes back up", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const list = area.getByRole("region", { name: "Changed files" });
        await list.getByRole("button", { name: "Directory frontend/src/lib", exact: true }).click();
        await page.keyboard.press("e");
        await expect(list.getByRole("button", { name: "frontend/src/lib/themes.ts", exact: true })).toHaveCount(0);
        await page.keyboard.press("e");
        await expect(list.getByRole("button", { name: "frontend/src/lib/themes.ts", exact: true })).toHaveCount(1);
        await page.keyboard.press("f");
        await expect(list.getByRole("button", { name: "docs/README.md", exact: true })).toHaveCount(0);
        await page.keyboard.press("u");
        await expect(list.getByRole("button", { name: "docs/README.md", exact: true })).toHaveCount(1);
    });

    test("the commit's file list takes the same keys", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { hasText: "Directories inside directories" }).first();
        const details = section.getByRole("region", { name: "Commit details" }).first();
        await details.getByRole("button", { name: "Directory backend/src", exact: true }).click();
        await page.keyboard.press("e");
        await expect(details.getByRole("button", { name: "Expand backend/src" })).toBeVisible();
        await page.keyboard.press("e");
        await page.keyboard.press("f");
        await expect(details.getByRole("button", { name: "Directory docs/user-guide", exact: true })).toHaveCount(0);
        //
        // U goes up one directory at a time: backend/src to backend, then to the top.
        //
        await page.keyboard.press("u");
        await expect(details.getByRole("button", { name: "Back to the directory above" })).toBeVisible();
        await page.keyboard.press("u");
        await expect(details.getByRole("button", { name: "Directory docs/user-guide", exact: true })).toHaveCount(1);
    });
});

test.describe("Stacked diffs keep their height", () => {
    test("a directory's diffs keep their full height and the column scrolls through them", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).nth(1);
        await area.getByRole("button", { name: "Directory frontend/src", exact: true }).click();
        const column = area.getByRole("region", { name: "Diffs in frontend/src" });
        const sizes = await column.evaluate(element => ({
            isScrolling: element.scrollHeight > element.clientHeight,
            areCut: [...element.querySelectorAll('[aria-label^="File diff "]')].some(card => card.scrollHeight > card.clientHeight + 1),
        }));
        expect(sizes).toEqual({ isScrolling: true, areCut: false });
    });
});

test.describe("Keys in a directory's stacked diffs", () => {
    test("Right goes to the first file's diff, Up and Down step through the changes and Ctrl jumps file to file", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).nth(1);
        await area.getByRole("button", { name: "Directory backend/src", exact: true }).click();
        const column = area.getByRole("region", { name: "Diffs in backend/src" });
        const card = (path: string) => column.getByRole("region", { name: `File diff ${path}`, exact: true });
        await page.keyboard.press("ArrowRight");
        await expect(card("backend/src/lib/config/read.zig").locator('[data-current="true"]')).not.toHaveCount(0);
        await page.keyboard.press("ArrowDown");
        await expect(card("backend/src/lib/config/write.zig").locator('[data-current="true"]')).not.toHaveCount(0);
        await page.keyboard.press("Control+ArrowDown");
        await expect(card("backend/src/tasks/settings-task.zig").locator('[data-current="true"]')).not.toHaveCount(0);
        await page.keyboard.press("Control+ArrowUp");
        await expect(card("backend/src/lib/config/write.zig").locator('[data-current="true"]')).not.toHaveCount(0);
        await page.keyboard.press("Space");
        await expect(card("backend/src/lib/config/write.zig").getByRole("button", { name: "Unstage this hunk" })).toHaveCount(1);
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowDown");
        await expect(area.getByRole("button", { name: "Directory backend/src/lib/config", exact: true })).toHaveClass(/Mui-selected/);
    });

    test("the commit's directory pane scrolls with Up and Down", async ({ page }) => {
        //
        // A short window makes the stacked diffs taller than their pane, so there is room to
        // scroll.
        //
        await page.setViewportSize({ width: 1280, height: 500 });
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { hasText: "Directories inside directories" }).first();
        await section.getByRole("region", { name: "Commit details" }).first().getByRole("button", { name: "Directory backend/src", exact: true }).click();
        await page.keyboard.press("Enter");
        const pane = section.getByRole("region", { name: "Directory diffs" });
        const card = (path: string) => pane.getByRole("region", { name: `File diff ${path}`, exact: true });
        await expect(card("backend/src/lib/config/read.zig")).toBeVisible();
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowDown");
        await expect.poll(() => pane.locator("[data-pane-scroll]").first().evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    });
});

test.describe("Folding a diff with E", () => {
    test("E folds away and shows the stacked diff the keys are on", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).nth(1);
        await area.getByRole("button", { name: "Directory backend/src", exact: true }).click();
        await page.keyboard.press("ArrowRight");
        const card = area.getByRole("region", { name: "File diff backend/src/lib/config/read.zig", exact: true });
        await page.keyboard.press("e");
        await expect(card.getByRole("button", { name: "Show the diff" })).toBeVisible();
        await page.keyboard.press("e");
        await expect(card.getByRole("button", { name: "Fold the diff away" })).toBeVisible();
    });

    test("E folds away the commit's open file diff", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { hasText: "Directories inside directories" }).first();
        await section.getByRole("region", { name: "Commit details" }).first().getByRole("button", { name: "Directory backend/src", exact: true }).click();
        await page.keyboard.press("Enter");
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("e");
        await expect(section.getByRole("region", { name: "File diff backend/src/lib/config/read.zig", exact: true }).getByRole("button", { name: "Show the diff" })).toBeVisible();
    });
});

test.describe("Left out of the commit message", () => {
    test("Left at the start of the summary or description moves to the diff, and elsewhere moves the cursor", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await area.getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true }).click();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.type("ab");
        await page.keyboard.press("ArrowLeft");
        await expect(area.getByRole("textbox", { name: "Summary" })).toBeFocused();
        await page.keyboard.press("ArrowLeft");
        await page.keyboard.press("ArrowLeft");
        await expect(diff).toHaveAttribute("data-active", "true");
        await area.getByRole("textbox", { name: "Description" }).click();
        await page.keyboard.press("ArrowLeft");
        await expect(diff).toHaveAttribute("data-active", "true");
    });
});

test.describe("Find mode", () => {
    test("Ctrl+F searches the Changes list from the list, and opens the find box from the diff, which Escape closes", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await area.getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true }).click();
        await expect(diff.getByRole("textbox", { name: "Find in this diff" })).toHaveCount(0);
        await page.keyboard.press("Control+f");
        await expect(area.getByRole("textbox", { name: "Search changed files" })).toBeFocused();
        await page.keyboard.press("Escape");
        await area.getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true }).click();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Control+f");
        await expect(diff.getByRole("textbox", { name: "Find in this diff" })).toBeFocused();
        await page.keyboard.type("level");
        await page.keyboard.press("Enter");
        await expect(diff.locator('[data-current-match="true"]')).toHaveCount(1);
        await page.keyboard.press("Escape");
        await expect(diff.getByRole("textbox", { name: "Find in this diff" })).toHaveCount(0);
        await page.keyboard.press("ArrowDown");
        await expect(diff.locator('[data-current="true"][data-gap-index]')).toHaveCount(1);
    });

    test("Ctrl+F opens the find box in the commit's open diff", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { has: page.getByRole("heading", { name: "A file with several changes" }) });
        const pane = section.getByRole("application", { name: "Commit explorer" }).first().getByRole("region", { name: "File diff" });
        await pane.click();
        await page.keyboard.press("Control+f");
        await expect(pane.getByRole("textbox", { name: "Find in this diff" })).toBeFocused();
    });
});

test.describe("No folding for a single file", () => {
    test("a single selected file's diff has no fold button and E leaves it open", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const diff = area.getByRole("region", { name: "File diff" });
        await area.getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true }).click();
        await expect(diff.getByRole("button", { name: "Fold the diff away" })).toHaveCount(0);
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("e");
        await expect(diff.locator("[data-hunk-index]")).not.toHaveCount(0);
    });
});

test.describe("Table filter", () => {
    test("the filter shows only the matching commits and Escape clears it", async ({ page }) => {
        await openPage(page, "/page/table", { components: "light" });
        const table = page.locator("main section.mb-10").first();
        const filter = table.getByRole("textbox", { name: "Search the commits" });
        await expect(table.getByRole("row")).toHaveCount(5);
        await table.getByRole("button", { name: "Search the commits" }).click();
        await filter.fill("ash");
        await expect(table.getByRole("row")).toHaveCount(3);
        await filter.press("Escape");
        await expect(table.getByRole("row")).toHaveCount(5);
    });

    test("a filter that matches nothing says so", async ({ page }) => {
        await openPage(page, "/page/table", { components: "light" });
        await expect(page.locator("main section.mb-10").nth(1)).toContainText("No commits match the search.");
    });
});

test.describe("Search in large content", () => {
    test("the table filter shows only the matching commits and Escape clears it", async ({ page }) => {
        await openPage(page, "/page/table", { components: "light" });
        const table = page.locator("main section.mb-10").first();
        const filter = table.getByRole("textbox", { name: "Search the commits" });
        await expect(table.getByRole("row")).toHaveCount(5);
        await table.getByRole("button", { name: "Search the commits" }).click();
        await filter.fill("ash");
        await expect(table.getByRole("row")).toHaveCount(3);
        await filter.press("Escape");
        await expect(table.getByRole("row")).toHaveCount(5);
        await expect(page.locator("main section.mb-10").nth(1)).toContainText("No commits match the search.");
    });

    test("the list and the tree filter their rows", async ({ page }) => {
        await openPage(page, "/page/list", { components: "light" });
        const list = page.locator("main section.mb-10").first();
        await list.getByRole("button", { name: "Search the branches" }).click();
        await list.getByRole("textbox", { name: "Search the branches" }).fill("merge");
        await expect(list.getByRole("list", { name: "Branches" }).getByRole("button")).toHaveCount(1);
        await openPage(page, "/page/tree", { components: "light" });
        const tree = page.locator("main section.mb-10").first();
        const items = tree.getByRole("list", { name: "Changed files" }).getByRole("button", { name: /^(Directory )?src|^README/ });
        const before = await items.count();
        await tree.getByRole("button", { name: "Search the files" }).click();
        await tree.getByRole("textbox", { name: "Search the files" }).fill("lanes");
        await expect.poll(() => items.count()).toBeLessThan(before);
        await expect(tree).toContainText("lanes.ts");
    });

    test("Ctrl+F searches the commit's file list, Enter applies and Escape hides the box", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { hasText: "Directories inside directories" }).first();
        const details = section.getByRole("region", { name: "Commit details" }).first();
        await details.getByRole("button", { name: "Directory backend/src", exact: true }).click();
        await page.keyboard.press("Control+f");
        const box = details.getByRole("textbox", { name: "Search the files" });
        await expect(box).toBeFocused();
        await page.keyboard.type("zig");
        await expect(details.getByRole("button", { name: "Directory docs/user-guide", exact: true })).toHaveCount(1);
        await page.keyboard.press("Enter");
        await expect(details.getByRole("button", { name: "Directory docs/user-guide", exact: true })).toHaveCount(0);
        await expect(details).toContainText("Files changed (3)");
        await page.keyboard.press("Escape");
        await expect(box).toHaveCount(0);
        await expect(details.getByRole("button", { name: "Directory docs/user-guide", exact: true })).toHaveCount(1);
    });

    test("the Git commands panel searches its commands in search mode", async ({ page }) => {
        await openPage(page, "/page/git-commands-panel", { components: "light" });
        const panel = page.locator("main section.mb-10").nth(2).getByRole("region", { name: "Git commands" });
        await expect(panel.getByRole("textbox", { name: "Search the commands" })).toHaveCount(0);
        await panel.getByRole("button", { name: "Search the commands" }).click();
        await page.keyboard.type("diff-tree");
        await page.keyboard.press("Enter");
        await expect(panel.getByRole("list", { name: "Commands" }).getByRole("listitem")).toHaveCount(1);
        await page.keyboard.press("Escape");
        await expect(panel.getByRole("list", { name: "Commands" }).getByRole("listitem")).toHaveCount(2);
    });

    test("the working directory has a menu with copy items and one that opens it", async ({ page }) => {
        await openPage(page, "/page/git-commands-panel", { components: "light" });
        const panel = page.locator("main section.mb-10").nth(1).getByRole("region", { name: "Git commands" });
        await panel.getByRole("button", { name: /^Path actions for/ }).click();
        const menu = page.getByRole("menu");
        await expect(menu.getByRole("menuitem", { name: "Copy full path" })).toBeVisible();
        await expect(menu.getByRole("menuitem", { name: "Copy cd command" })).toBeVisible();
        await expect(menu.getByRole("menuitem", { name: /^Open in / }).first()).toBeVisible();
        await expect(menu.getByRole("menuitem", { name: "Open in editor" })).toBeVisible();
    });

    test("overflowing tabs have a More button with a filtered list of every tab", async ({ page }) => {
        await openPage(page, "/page/tabs", { components: "light" });
        const section = page.locator("section", { hasText: "More tabs than fit" }).first();
        await section.getByRole("button", { name: "All tabs" }).click();
        const dialog = page.getByRole("dialog", { name: "All tabs" });
        await dialog.getByRole("textbox", { name: "Filter the tabs" }).fill("zig");
        await expect(dialog.getByRole("list", { name: "Tabs" }).getByRole("button")).toHaveCount(1);
        await page.keyboard.press("Enter");
        await expect(section.getByRole("tab", { name: "build.zig" })).toHaveAttribute("aria-selected", "true");
    });
});

test.describe("Split pages and the sidebar groups", () => {
    test("the sidebar lists app features and basic components under their headings", async ({ page }) => {
        await openPage(page, "/page/overview", { components: "light" });
        const pages = page.getByRole("list", { name: "Pages" });
        await expect(pages).toContainText("App features");
        await expect(pages).toContainText("Basic components");
        for (const title of ["Git command", "Checkbox", "Radio buttons", "Switch", "List", "Tree", "Toolbar", "Status bar", "Banners", "Notifications", "Badges", "Progress", "Sidebar", "Commit"]) {
            await expect(pages.getByRole("link", { name: title, exact: true })).toHaveCount(1);
        }
    });

    test("the toolbar's configuration dropdown changes the toolbar straight away", async ({ page }) => {
        await openPage(page, "/page/toolbar", { components: "light" });
        const toolbar = page.getByRole("toolbar", { name: "Repository actions", includeHidden: true });
        await toolbar.getByRole("button", { name: "Toolbar options" }).click();
        const dialog = page.getByRole("dialog", { name: "Toolbar options" });
        await dialog.getByRole("switch", { name: "Button names" }).click();
        //
        // The open dropdown mounts at the end of the page and hides the rest of the page from
        // assistive technology, so the toolbar is found among the hidden elements.
        //
        await expect(toolbar.getByRole("button", { name: "Fetch", includeHidden: true })).toContainText("Fetch");
        await dialog.getByRole("switch", { name: "Stash button" }).click();
        await expect(toolbar.getByRole("button", { name: "Stash", includeHidden: true })).toHaveCount(0);
    });
});

test.describe("Collapsible sidebar groups", () => {
    test("a group's heading closes and opens it", async ({ page }) => {
        await openPage(page, "/page/overview", { components: "light" });
        const pages = page.getByRole("list", { name: "Pages" });
        await pages.getByRole("button", { name: "Basic components" }).click();
        await expect(pages.getByRole("link", { name: "Checkbox", exact: true })).toHaveCount(0);
        await expect(pages.getByRole("link", { name: "Diff", exact: true })).toHaveCount(1);
        await pages.getByRole("button", { name: "Basic components" }).click();
        await expect(pages.getByRole("link", { name: "Checkbox", exact: true })).toHaveCount(1);
    });
});


test.describe("Slate tooltips, pinning and copying", () => {
    test("a tooltip is a slate panel with a border and no arrow", async ({ page }) => {
        await openPage(page, "/page/tooltip", { components: "light" });
        const section = page.locator("main section").filter({ hasText: "On hover and focus" });
        await section.getByRole("button", { name: "Push" }).hover();
        const tooltip = page.getByRole("tooltip").filter({ hasText: "Push" });
        await expect(tooltip).toBeVisible();
        const body = tooltip.locator(".MuiTooltip-tooltip");
        expect(await computedStyle(body, "background-color")).toBe("rgb(226, 232, 240)");
        expect(await computedStyle(body, "border-top-color")).toBe("rgb(184, 195, 211)");
        await expect(tooltip.locator(".MuiTooltip-arrow")).toHaveCount(0);
    });

    test("a tooltip mounts on the page and keeps the theme of the panel it opens from", async ({ page }) => {
        await openPage(page, "/page/tooltip", { components: "both", explorer: "light" });
        const buttons = page.locator("main section").filter({ hasText: "On hover and focus" }).getByRole("button", { name: "Push" });
        await expect(buttons).toHaveCount(2);
        await buttons.nth(0).hover();
        const darkTooltip = page.getByRole("tooltip").filter({ hasText: "Push" });
        await expect(darkTooltip).toBeVisible();
        expect(await darkTooltip.evaluate(element => element.parentElement === document.body)).toBe(true);
        expect(await computedStyle(darkTooltip.locator(".MuiTooltip-tooltip"), "background-color")).toBe("rgb(43, 52, 68)");
        await page.mouse.move(0, 0);
        await expect(darkTooltip).toHaveCount(0);
        await buttons.nth(1).hover();
        const lightTooltip = page.getByRole("tooltip").filter({ hasText: "Push" });
        await expect(lightTooltip).toBeVisible();
        expect(await computedStyle(lightTooltip.locator(".MuiTooltip-tooltip"), "background-color")).toBe("rgb(226, 232, 240)");
    });

    test("a menu opened in the dark panel keeps the dark panel colour", async ({ page }) => {
        await openPage(page, "/page/menu", { components: "both", explorer: "light" });
        await page.getByText("Right-click this commit").nth(0).click({ button: "right" });
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        expect(await computedStyle(page.locator(".MuiPopover-paper").filter({ has: menu }), "background-color")).toBe("rgb(24, 24, 27)");
    });

    test("a select's list opened in the dark panel keeps the dark panel colour", async ({ page }) => {
        await openPage(page, "/page/select", { components: "both", explorer: "light" });
        await page.getByRole("combobox", { name: "Remote" }).first().click();
        const listbox = page.getByRole("listbox");
        await expect(listbox).toBeVisible();
        expect(await computedStyle(page.locator(".MuiPopover-paper").filter({ has: listbox }), "background-color")).toBe("rgb(24, 24, 27)");
    });

    test("the pin button keeps a tooltip open and its close button closes it", async ({ page }) => {
        await openPage(page, "/page/tooltip", { components: "light" });
        const section = page.locator("main section").filter({ hasText: "Pinnable fields" });
        await section.getByText("a1b2c3d").hover();
        const tooltip = page.getByRole("tooltip").filter({ hasText: "Short hash" });
        await expect(tooltip).toBeVisible();
        await tooltip.getByRole("button", { name: "Pin the tooltip (P)" }).click();
        await page.mouse.move(0, 0);
        await page.waitForTimeout(500);
        await expect(tooltip).toBeVisible();
        await tooltip.getByRole("button", { name: "Close the tooltip (P or Escape)" }).click();
        await expect(tooltip).toHaveCount(0);
    });

    test("P pins the tooltip under the pointer and P or Escape closes it", async ({ page }) => {
        await openPage(page, "/page/tooltip", { components: "light" });
        const section = page.locator("main section").filter({ hasText: "Pinnable fields" });
        await section.getByText("lanes.ts").hover();
        const tooltip = page.getByRole("tooltip").filter({ hasText: "Renamed from" });
        await expect(tooltip).toBeVisible();
        await page.keyboard.press("p");
        await page.mouse.move(0, 0);
        await page.waitForTimeout(500);
        await expect(tooltip).toBeVisible();
        await page.keyboard.press("p");
        await expect(tooltip).toHaveCount(0);
        await section.getByText("lanes.ts").hover();
        await expect(tooltip).toBeVisible();
        await page.keyboard.press("p");
        await page.mouse.move(0, 0);
        await page.keyboard.press("Escape");
        await expect(tooltip).toHaveCount(0);
    });

    test("a field's copy button copies its value", async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await openPage(page, "/page/tooltip", { components: "light" });
        const section = page.locator("main section").filter({ hasText: "Pinnable fields" });
        await section.getByText("a1b2c3d").hover();
        const tooltip = page.getByRole("tooltip").filter({ hasText: "Short hash" });
        await tooltip.getByRole("button", { name: "Copy Commit hash" }).click();
        await expect(tooltip.getByRole("button", { name: "Copied" })).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("a1b2c3d4e5f60718293a4b5c6d7e8f9012345678");
    });

    test("a ref badge's tooltip copies the ref's name", async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await openPage(page, "/page/badges", { components: "light" });
        const section = page.locator("main section").filter({ hasText: "Each kind of ref" });
        await section.getByText("origin/main").hover();
        const tooltip = page.getByRole("tooltip").filter({ hasText: "Remote branch" });
        await tooltip.getByRole("button", { name: "Copy Remote branch" }).click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("origin/main");
    });

    test("the badge column puts the badges that do not fit in the ... dropdown", async ({ page }) => {
        await openPage(page, "/page/badges", { components: "light" });
        const section = page.locator("main section").filter({ hasText: "In the commit list" });
        await section.getByRole("button", { name: "Show all 4 refs" }).click();
        const dropdown = page.getByRole("dialog", { name: "Refs" });
        await expect(dropdown).toBeVisible();
        for (const name of ["main", "origin/main", "v1.0.0", "feature/commit-graph"]) {
            await expect(dropdown.getByText(name, { exact: true })).toBeVisible();
        }
        await page.keyboard.press("Escape");
        await expect(dropdown).toHaveCount(0);
        await expect(section.getByRole("button", { name: /Show all/ })).toHaveCount(1);
    });

    test("a badge's icon sits in the middle of the badge", async ({ page }) => {
        await openPage(page, "/page/badges", { components: "light" });
        const chip = page.locator("main section").filter({ hasText: "Each kind of ref" }).locator(".MuiChip-root").filter({ hasText: "origin/main" });
        const chipBox = (await chip.boundingBox())!;
        const iconBox = (await chip.locator(".MuiChip-icon").boundingBox())!;
        const offset = Math.abs(iconBox.y + iconBox.height / 2 - (chipBox.y + chipBox.height / 2));
        expect(offset).toBeLessThanOrEqual(1);
    });
});

test.describe("Shared tree rows", () => {
    test("the tree bar expands and collapses every directory, and so does A", async ({ page }) => {
        await openPage(page, "/page/tree", { components: "light" });
        const tree = page.getByRole("list", { name: "Changed files" }).first();
        await tree.getByRole("button", { name: "Collapse all" }).click();
        await expect(tree.getByText("lanes.ts")).toHaveCount(0);
        await expect(tree.getByRole("button", { name: "Expand src" })).toBeVisible();
        await tree.getByRole("button", { name: "Expand all" }).click();
        await expect(tree.getByText("lanes.ts")).toBeVisible();
        await tree.getByRole("button", { name: "Directory src", exact: true }).click();
        await page.keyboard.press("a");
        await expect(tree.getByText("lanes.ts")).toHaveCount(0);
        await page.keyboard.press("a");
        await expect(tree.getByText("lanes.ts")).toBeVisible();
    });

    test("Space and E open and close the selected directory, and F and U focus and go back up", async ({ page }) => {
        await openPage(page, "/page/tree", { components: "light" });
        const tree = page.getByRole("list", { name: "Changed files" }).first();
        await tree.getByRole("button", { name: "Directory src/graph", exact: true }).click();
        await page.keyboard.press(" ");
        await expect(tree.getByText("lanes.ts")).toHaveCount(0);
        await page.keyboard.press("e");
        await expect(tree.getByText("lanes.ts")).toBeVisible();
        await page.keyboard.press("f");
        await expect(tree.getByText("README.md")).toHaveCount(0);
        await expect(tree.getByRole("button", { name: "Back to the directory above" })).toBeVisible();
        await page.keyboard.press("u");
        await expect(tree.getByText("commit-list.tsx")).toBeVisible();
        await expect(tree.getByText("README.md")).toHaveCount(0);
        await page.keyboard.press("u");
        await expect(tree.getByText("README.md")).toBeVisible();
    });

    test("the directory toggle is a +/- box on the tree line", async ({ page }) => {
        await openPage(page, "/page/tree", { components: "light" });
        const toggle = page.getByRole("list", { name: "Changed files" }).first().getByRole("button", { name: "Collapse src/graph" });
        await expect(toggle.locator("svg")).toHaveAttribute("data-icon", "minus");
        await toggle.click();
        await expect(page.getByRole("list", { name: "Changed files" }).first().getByRole("button", { name: "Expand src/graph" }).locator("svg")).toHaveAttribute("data-icon", "plus");
    });

    test("the Commit page's tree has the bar and A expands or collapses every directory", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).nth(1);
        const list = area.getByRole("region", { name: "Changed files" });
        await area.getByRole("button", { name: "Collapse all" }).click();
        await expect(list.getByRole("button", { name: "backend/src/lib/config/read.zig", exact: true })).toHaveCount(0);
        await area.getByRole("button", { name: "Expand all" }).click();
        await expect(list.getByRole("button", { name: "backend/src/lib/config/read.zig", exact: true })).toHaveCount(1);
        await list.getByRole("button", { name: "Directory backend/src", exact: true }).click();
        await page.keyboard.press("a");
        await expect(list.getByRole("button", { name: "backend/src/lib/config/read.zig", exact: true })).toHaveCount(0);
    });

    test("a click on a directory of the commit's file list only selects it", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { hasText: "Directories inside directories" }).first();
        const details = section.getByRole("region", { name: "Commit details" }).first();
        const directory = details.getByRole("button", { name: "Directory backend/src", exact: true });
        await directory.click();
        await expect(directory).toHaveClass(/Mui-selected/);
        await expect(section.getByRole("region", { name: "Directory diffs" })).toHaveCount(0);
        await expect(details.getByRole("button", { name: "backend/src/lib/config/read.zig", exact: true })).toHaveCount(1);
        await page.keyboard.press("a");
        await expect(details.getByRole("button", { name: "backend/src/lib/config/read.zig", exact: true })).toHaveCount(0);
        await details.getByRole("button", { name: "Expand all" }).click();
        await expect(details.getByRole("button", { name: "backend/src/lib/config/read.zig", exact: true })).toHaveCount(1);
    });
});

test.describe("Directory browser", () => {
    test("starts in the home directory with the Git icon on each repository", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        const list = page.getByRole("list", { name: "Directories" }).first();
        await expect(list.getByRole("button", { name: "Directory /home/you/projects", exact: true })).toBeVisible();
        await list.getByRole("button", { name: "Expand /home/you/projects" }).click();
        await expect(list.getByRole("button", { name: "Directory /home/you/projects/graft", exact: true }).getByLabel("Git repository")).toBeVisible();
        await expect(list.getByRole("button", { name: "Directory /home/you/projects/notes", exact: true }).getByLabel("Git repository")).toHaveCount(0);
    });

    test("a click selects a repository, and Open repository picks it", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        const section = page.locator("main section.mb-10").first();
        const list = section.getByRole("list", { name: "Directories" });
        const open = section.getByRole("button", { name: "Open repository" });
        await expect(open).toBeDisabled();
        await list.getByRole("button", { name: "Expand /home/you/projects" }).click();
        await list.getByRole("button", { name: "Directory /home/you/projects/graft", exact: true }).click();
        await expect(open).toBeEnabled();
        await open.click();
        await expect(section.getByRole("status")).toContainText("/home/you/projects/graft");
    });

    test("a double click goes into a directory and the breadcrumbs and up button come back out", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        const section = page.locator("main section.mb-10").first();
        const list = section.getByRole("list", { name: "Directories" });
        await list.getByRole("button", { name: "Directory /home/you/projects", exact: true }).dblclick();
        await expect(section.getByRole("navigation", { name: "Directory path" })).toContainText("projects");
        await expect(list.getByRole("button", { name: "Directory /home/you/projects/graft", exact: true })).toBeVisible();
        await section.getByRole("button", { name: "Up one directory" }).click();
        await expect(list.getByRole("button", { name: "Directory /home/you/projects", exact: true })).toBeVisible();
        await section.getByRole("navigation", { name: "Directory path" }).getByRole("button", { name: "home" }).click();
        await expect(list.getByRole("button", { name: "Directory /home/you", exact: true })).toBeVisible();
    });

    test("expand all opens every directory, A closes them again", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        const list = page.getByRole("list", { name: "Directories" }).first();
        await list.getByRole("button", { name: "Expand all" }).click();
        await expect(list.getByRole("button", { name: "Directory /home/you/projects/diff-tool/viewer/src/components", exact: true })).toBeVisible();
        await list.getByRole("button", { name: "Directory /home/you/projects", exact: true }).click();
        await page.keyboard.press("a");
        await expect(list.getByRole("button", { name: "Directory /home/you/projects/graft", exact: true })).toHaveCount(0);
    });

    test("the search applies on Enter and shows its matches as a tree under their directories", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        const section = page.locator("main section.mb-10").first();
        const list = section.getByRole("list", { name: "Directories" });
        const box = section.getByRole("textbox", { name: "Search the directories" });
        await section.getByRole("button", { name: "Search the directories" }).click();
        await box.fill("components");
        await expect(list.getByRole("button", { name: "Directory /home/you/projects/graft/src/components", exact: true })).toHaveCount(0);
        await box.press("Enter");
        await expect(list.getByRole("button", { name: "Directory /home/you/projects/graft/src/components", exact: true })).toBeVisible();
        await expect(list.getByRole("button", { name: "Directory /home/you/projects/graft/src", exact: true })).toBeVisible();
        await expect(list.getByRole("button", { name: "Directory /home/you/Documents", exact: true })).toHaveCount(0);
        await box.press("Escape");
        await expect(list.getByRole("button", { name: "Directory /home/you/Documents", exact: true })).toBeVisible();
    });
});

test.describe("Commit explorer refinements", () => {
    test("the commit list's options hide a column and the choice is kept after a reload", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const commitPane = page.getByRole("application", { name: "Commit explorer" }).first().getByRole("region", { name: "Commits" });
        await expect(commitPane.locator("code").first()).toBeVisible();
        await commitPane.getByRole("button", { name: "Commit list options" }).click();
        await page.getByRole("dialog", { name: "Commit list options" }).getByRole("switch", { name: "Show the hash column" }).uncheck();
        await page.keyboard.press("Escape");
        await expect(commitPane.locator("li code")).toHaveCount(0);
        await page.reload();
        const reloaded = page.getByRole("application", { name: "Commit explorer" }).first().getByRole("region", { name: "Commits" });
        await expect(reloaded.getByRole("list", { name: "Commits" })).toBeVisible();
        await expect(reloaded.locator("li code")).toHaveCount(0);
    });

    test("a tooltip in the commit explorer opens to the right of its row", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const commitPane = page.getByRole("application", { name: "Commit explorer" }).first().getByRole("region", { name: "Commits" });
        await commitPane.getByRole("button", { name: "Commit list options" }).hover();
        const tooltip = page.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        const button = await commitPane.getByRole("button", { name: "Commit list options" }).boundingBox();
        const tip = await tooltip.boundingBox();
        expect(button).not.toBeNull();
        expect(tip).not.toBeNull();
        if (button && tip) {
            expect(tip.x).toBeGreaterThanOrEqual(button.x + button.width);
        }
    });

    test("an open file diff is at least 840 pixels wide on a desktop screen", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 });
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(2);
        const box = await explorer.getByRole("region", { name: "File diff" }).boundingBox();
        expect(box).not.toBeNull();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(840);
    });

    test("an open file diff fits a phone's screen", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(2);
        const box = await explorer.getByRole("region", { name: "File diff" }).boundingBox();
        expect(box).not.toBeNull();
        expect(box?.width ?? 0).toBeLessThanOrEqual(390);
    });

    test("a directory's path menu opens it in the editor as well as the file manager", async ({ page }) => {
        await openPage(page, "/page/git-commands-panel", { components: "light" });
        const panel = page.locator("main section.mb-10").nth(1).getByRole("region", { name: "Git commands" });
        await panel.getByRole("button", { name: /^Path actions for/ }).click();
        await expect(page.getByRole("menu").getByRole("menuitem", { name: "Open in editor" })).toBeVisible();
    });

    test("the Commit page's diff slides in when another file is picked", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await expect(area.locator(".graft-slide-in")).toHaveCount(1);
    });
});

test.describe("Directory browser height", () => {
    test("the browser fills the window's height and the page does not scroll", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 });
        await openPage(page, "/page/directory-browser", { components: "light" });
        const list = page.getByRole("list", { name: "Directories" }).first();
        await expect(list).toBeVisible();
        const box = await list.boundingBox();
        expect(box).not.toBeNull();
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(1000 - 120);
        const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        expect(scrollHeight).toBeLessThanOrEqual(1000);
    });
});

test.describe("Commit explorer behaviour", () => {
    test("comparing a commit with the files on disk lists the newer changes and an untracked file", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(1);
        const details = explorer.getByRole("region", { name: "Commit details" });
        await details.getByRole("button", { name: "Commit options" }).click();
        await page.getByRole("dialog", { name: "Commit options" }).getByRole("button", { name: "Changes from this commit to the files on disk" }).click();
        await page.keyboard.press("Escape");
        await expect(details).toContainText("untracked");
    });

    test("a long history is read a page at a time as the list scrolls", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { hasText: "A long-running branch" }).first();
        const commitPane = section.getByRole("region", { name: "Commits" });
        const rows = commitPane.getByRole("list", { name: "Commits" }).locator(":scope > li.MuiListItemButton-root");
        await commitPane.scrollIntoViewIfNeeded();
        await expect(rows).toHaveCount(10);
        await commitPane.getByText("Reading more commits…").or(commitPane.getByText("That is every commit.")).waitFor();
        for (let scroll = 0; scroll < 3; scroll++) {
            await commitPane.locator("[data-pane-scroll]").evaluate(element => element.scrollTo({ top: element.scrollHeight }));
            await page.waitForTimeout(500);
        }
        await expect(rows).toHaveCount(30);
        await expect(commitPane).toContainText("That is every commit.");
    });

    test("clicking a file opens its diff and keeps the keys in the commit details pane", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(1);
        await explorer.getByRole("region", { name: "Commit details" }).getByRole("button", { name: "frontend/src/components/git-commands-panel.tsx" }).first().click();
        await expect(explorer.getByRole("region", { name: "File diff" })).toBeVisible();
        await expect(explorer.getByRole("region", { name: "Commit details" })).toHaveAttribute("data-active", "true");
    });
});

test.describe("Commit explorer details", () => {
    test("the commit search box closes from inside the field and a ref's raw log text does not match", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        const commitPane = explorer.getByRole("region", { name: "Commits" });
        await page.keyboard.press("Tab");
        await commitPane.getByRole("button", { name: "Search commits" }).click();
        const box = explorer.getByRole("textbox", { name: "Search commits" });
        await expect(box).toBeFocused();
        await expect(box).toHaveAttribute("placeholder", "Search commits");
        await box.fill("HEAD ->");
        await page.keyboard.press("Enter");
        await expect(commitPane).toContainText("There are no commits.");
        await explorer.getByRole("button", { name: "Close the commit search" }).click();
        await expect(box).toHaveCount(0);
        await expect(explorer).toBeFocused();
    });

    test("file rows carry no status letter or line counts, and the tooltip names the change", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const section = page.locator("section", { hasText: "Several branches at once" }).first();
        const details = section.getByRole("region", { name: "Commit details" });
        await expect(details.getByRole("button", { name: "frontend/src/lib/diff-colours.ts" }).first()).toBeVisible();
        await expect(details.locator('[aria-label="Modified"], [aria-label="Renamed"]')).toHaveCount(0);
        await details.getByText("diff-colours.ts", { exact: true }).hover();
        const tip = page.getByRole("tooltip");
        await expect(tip).toContainText("Renamed");
        await expect(tip).toContainText("94% the same as before.");
        await page.mouse.move(0, 0);
        await details.getByText("split-diff-view.tsx", { exact: true }).hover();
        await expect(page.getByRole("tooltip")).toContainText("Copied from");
        await page.mouse.move(0, 0);
        await details.getByText("diff-colours.png", { exact: true }).hover();
        await expect(page.getByRole("tooltip")).toContainText("Binary file");
    });

    test("an untracked file's tooltip says Git does not track it", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(1);
        const details = explorer.getByRole("region", { name: "Commit details" });
        await details.getByRole("button", { name: "Commit options" }).click();
        await page.getByRole("dialog", { name: "Commit options" }).getByRole("button", { name: "Changes from this commit to the files on disk" }).click();
        await page.keyboard.press("Escape");
        await details.getByText("ideas.md", { exact: true }).hover();
        await expect(page.getByRole("tooltip").filter({ hasText: "Untracked" })).toContainText("Git does not track the file yet.");
    });

    test("focusing on a directory keeps the open diff, and a new commit clears the file search", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(2);
        const details = explorer.getByRole("region", { name: "Commit details" });
        await details.getByRole("button", { name: /^Directory / }).first().click();
        await page.keyboard.press("f");
        await expect(details.getByRole("button", { name: "Back to the directory above" })).toBeVisible();
        await expect(explorer.getByRole("region", { name: "File diff", exact: true })).toBeVisible();
        await details.getByRole("button", { name: "Search the files" }).click();
        await expect(details.getByRole("textbox", { name: "Search the files" })).toBeVisible();
        await explorer.getByRole("region", { name: "Commits" }).getByText("Initial commit").click();
        await expect(explorer.getByRole("region", { name: "Commit details" }).getByRole("textbox", { name: "Search the files" })).toHaveCount(0);
    });

    test("the date tooltip copies the local time with its offset", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const commitPane = page.getByRole("application", { name: "Commit explorer" }).first().getByRole("region", { name: "Commits" });
        await commitPane.locator("li").first().locator("span.text-right").hover();
        await expect(page.getByRole("tooltip")).toContainText(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
    });

    test("the Tree page's file rows carry no status letter", async ({ page }) => {
        await openPage(page, "/page/tree", { components: "light" });
        const tree = page.locator("main section").filter({ hasText: "Changed files by directory" }).first();
        await expect(tree.locator('[aria-label="Modified"], [aria-label="Added"], [aria-label="Deleted"], [aria-label="Renamed"]')).toHaveCount(0);
    });
});

test.describe("Review notes", () => {
    test("moving through the commits with the arrow keys shows each commit's details", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(1);
        const commitPane = explorer.getByRole("region", { name: "Commits" });
        await commitPane.click({ position: { x: 4, y: 4 } });
        const openRow = commitPane.locator('li[aria-current="true"]');
        const before = await openRow.textContent();
        await page.keyboard.press("ArrowDown");
        await expect(explorer.getByRole("region", { name: "Commit details" })).toBeVisible();
        await expect(openRow).not.toHaveText(before ?? "");
    });

    test("Ctrl+F shows a list's hidden search box", async ({ page }) => {
        await openPage(page, "/page/list", { components: "light" });
        const list = page.locator("main section.mb-10").first();
        await expect(list.getByRole("textbox", { name: "Search the branches" })).toHaveCount(0);
        await list.getByRole("region", { name: "Branch list" }).or(list.getByLabel("Branch list")).first().focus();
        await page.keyboard.press("Control+f");
        await expect(list.getByRole("textbox", { name: "Search the branches" })).toBeFocused();
    });
});
