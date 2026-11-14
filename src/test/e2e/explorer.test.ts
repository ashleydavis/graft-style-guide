//
// End-to-end tests of the style explorer. Goal: check that a person can find and open every
// page, that the page is in the URL and that every example is drawn in both themes from the
// tokens in graft.css. Method: open the explorer in Chrome against a dev server started by
// Playwright, then click, type and read computed styles the way a person would see them.
//

import { expect, test, type Locator, type Page } from "@playwright/test";
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

test.describe("Opening pages", () => {
    test("the bare URL opens the overview", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/page\/overview$/);
        await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    });

    test("choosing a page in the sidebar puts its id in the URL", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("navigation").getByRole("link", { name: "Button" }).click();
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
    test("minimising hides the page list and puts the setting in the URL", async ({ page }) => {
        await page.goto("/page/button");
        const navigation = page.getByRole("navigation");
        await navigation.getByRole("button", { name: "Minimise sidebar" }).click();
        await expect(page).toHaveURL(/sidebar=minimised/);
        await expect(navigation.getByRole("link")).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 1, name: "Button" })).toBeVisible();
    });

    test("restoring brings back the page list", async ({ page }) => {
        await page.goto("/page/button?sidebar=minimised");
        const navigation = page.getByRole("navigation");
        await navigation.getByRole("button", { name: "Restore sidebar" }).click();
        await expect(page).toHaveURL(/sidebar=open/);
        await expect(navigation.getByRole("link", { name: "Button" })).toBeVisible();
    });

    test("the sidebar stays minimised when changing a setting", async ({ page }) => {
        await page.goto("/page/button?sidebar=minimised&explorer=dark");
        await expect(page.getByRole("navigation").getByRole("button", { name: "Restore sidebar" })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    });
});

test.describe("Searching", () => {
    test("typing filters the page list by title", async ({ page }) => {
        await page.goto("/");
        const navigation = page.getByRole("navigation");
        await navigation.getByPlaceholder("Search components").fill("butt");
        await expect(navigation.getByRole("list", { name: "Pages" }).getByRole("link")).toHaveText(["Button"]);
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
        await page.goto("/page/button");
        const sections = page.locator("main section");
        const sectionCount = await sections.count();
        expect(sectionCount).toBeGreaterThan(0);
        for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
            const section = sections.nth(sectionIndex);
            await expect(section.locator('[data-theme="light"]')).toHaveCount(1);
            await expect(section.locator('[data-theme="dark"]')).toHaveCount(1);
        }
    });

    test("a button takes different colours from the light and dark tokens", async ({ page }) => {
        await page.goto("/page/button");
        const kinds = page.locator("main section").first();
        const lightButton = kinds.locator('[data-theme="light"]').getByRole("button", { name: "Commit" });
        const darkButton = kinds.locator('[data-theme="dark"]').getByRole("button", { name: "Commit" });
        const lightBackground = await computedStyle(lightButton, "background-color");
        const darkBackground = await computedStyle(darkButton, "background-color");
        expect(lightBackground).not.toBe("");
        expect(darkBackground).not.toBe("");
        expect(lightBackground).not.toBe(darkBackground);
    });

    test("a swatch shows the value its token resolves to in each theme", async ({ page }) => {
        await page.goto("/page/overview");
        const roleColours = page.locator("main section").nth(1);
        const lightValue = roleColours
            .locator('[data-theme="light"]')
            .getByText("--color-bg", { exact: true })
            .locator("xpath=following-sibling::div[1]");
        const darkValue = roleColours
            .locator('[data-theme="dark"]')
            .getByText("--color-bg", { exact: true })
            .locator("xpath=following-sibling::div[1]");
        await expect(lightValue).toHaveText(/^#[0-9a-f]{6}$/);
        await expect(darkValue).toHaveText(/^#[0-9a-f]{6}$/);
        expect(await lightValue.textContent()).not.toBe(await darkValue.textContent());
    });

});

test.describe("Component mode and explorer theme", () => {
    test("a URL naming neither shows dark next to light in a light explorer", async ({ page }) => {
        await page.goto("/page/button");
        const componentSwitch = page.getByRole("group", { name: "Components" });
        const explorerSwitch = page.getByRole("group", { name: "Explorer" });
        await expect(componentSwitch.getByRole("button", { name: "Dark next to light" })).toHaveAttribute("aria-pressed", "true");
        await expect(explorerSwitch.getByRole("button", { name: "Light", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    });

    test("dark next to light draws the dark panel on the left", async ({ page }) => {
        await page.goto("/page/button");
        const panels = page.locator("main section").first().locator("[data-theme]");
        await expect(panels).toHaveCount(2);
        await expect(panels.nth(0)).toHaveAttribute("data-theme", "dark");
        await expect(panels.nth(1)).toHaveAttribute("data-theme", "light");
        const darkBox = await panels.nth(0).boundingBox();
        const lightBox = await panels.nth(1).boundingBox();
        expect(darkBox!.x).toBeLessThan(lightBox!.x);
    });

    test("dark component mode shows only dark panels and leaves the explorer light", async ({ page }) => {
        await page.goto("/page/button");
        await page.getByRole("group", { name: "Components" }).getByRole("button", { name: "Dark", exact: true }).click();
        await expect(page).toHaveURL(/\/page\/button\?components=dark$/);
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
        await expect(page.locator('main [data-theme="light"]')).toHaveCount(0);
        await expect(page.locator('main [data-theme="dark"]').first()).toBeVisible();
    });

    test("light component mode shows only light panels", async ({ page }) => {
        await page.goto("/page/button");
        await page.getByRole("group", { name: "Components" }).getByRole("button", { name: "Light", exact: true }).click();
        await expect(page).toHaveURL(/\/page\/button\?components=light$/);
        await expect(page.locator('main [data-theme="dark"]')).toHaveCount(0);
        await expect(page.locator('main [data-theme="light"]').first()).toBeVisible();
    });

    test("the dark explorer theme darkens the frame and leaves the component mode as it was", async ({ page }) => {
        await page.goto("/page/button?components=light");
        await page.getByRole("group", { name: "Explorer" }).getByRole("button", { name: "Dark", exact: true }).click();
        await expect(page).toHaveURL(/\/page\/button\?components=light&explorer=dark$/);
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
        await expect(page.locator('main [data-theme="dark"]')).toHaveCount(0);
        await expect(page.locator('main [data-theme="light"]').first()).toBeVisible();
    });

    test("opening a URL with both settings shows them", async ({ page }) => {
        await page.goto("/page/text-box?components=dark&explorer=dark");
        await expect(page.getByRole("group", { name: "Components" }).getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("group", { name: "Explorer" }).getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
        await expect(page.locator('main [data-theme="light"]')).toHaveCount(0);
    });

    test("both settings stay when another page is chosen", async ({ page }) => {
        await page.goto("/page/button?components=dark&explorer=dark");
        await page.getByRole("navigation").getByRole("link", { name: "Text box" }).click();
        await expect(page).toHaveURL(/\/page\/text-box\?components=dark&explorer=dark$/);
    });

    test("the dark explorer theme is in place before the app's script runs", async ({ page }) => {
        await page.goto("/page/button");
        const lightBackground = await computedStyle(page.locator("html"), "background-color");

        //
        // Blocking the app's script leaves the page as index.html draws it, which is what a
        // refresh shows before the app starts.
        //
        await page.route("**/src/main.tsx*", route => route.abort());
        await page.goto("/page/button?explorer=dark");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
        const darkBackground = await computedStyle(page.locator("html"), "background-color");
        expect(darkBackground).not.toBe("rgba(0, 0, 0, 0)");
        expect(darkBackground).not.toBe(lightBackground);
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
        await page.goto("/page/dialog?components=light");
        const discard = page.getByRole("button", { name: "Discard", exact: true });
        const keep = page.getByRole("button", { name: "Keep changes" });
        const danger = await page.locator('[data-theme="light"]').first().evaluate(element => {
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
        await page.goto("/page/dialog");
        const opened = page.locator("main section").nth(2);

        await opened.locator('[data-theme="dark"]').getByRole("button", { name: "Open dialog" }).click();
        const darkDialog = page.getByRole("dialog");
        await expect(darkDialog).toBeVisible();
        const darkBackground = await computedStyle(darkDialog, "background-color");
        await darkDialog.getByRole("button", { name: "Cancel" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);

        await opened.locator('[data-theme="light"]').getByRole("button", { name: "Open dialog" }).click();
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
        await page.goto("/page/button?explorer=dark");
        const info = page.getByRole("button", { name: "About" });
        const infoBox = await info.boundingBox();
        const viewport = page.viewportSize()!;
        expect(infoBox!.y).toBeLessThan(20);
        expect(infoBox!.x + infoBox!.width).toBeGreaterThan(viewport.width - 40);
        await info.click();
        const popup = page.getByRole("dialog", { name: "About" });
        await expect(popup).toBeVisible();
        await expect(page).toHaveURL(/\/page\/button\?explorer=dark$/);
        const popupBox = await popup.boundingBox();
        expect(popupBox!.width).toBeLessThanOrEqual(600);
        const centreX = popupBox!.x + popupBox!.width / 2;
        const centreY = popupBox!.y + popupBox!.height / 2;
        expect(Math.abs(centreX - viewport.width / 2)).toBeLessThan(20);
        expect(Math.abs(centreY - viewport.height / 2)).toBeLessThan(20);
    });

    test("the about popup links to Graft on GitHub and to the YouTube channel and closes on Close", async ({ page }) => {
        await page.goto("/page/button");
        await page.getByRole("button", { name: "About" }).click();
        const popup = page.getByRole("dialog", { name: "About" });
        await expect(popup.getByRole("link", { name: "github.com/ashleydavis/Graft" })).toHaveAttribute("href", "https://github.com/ashleydavis/Graft");
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
        await page.goto("/page/button?sidebar=minimised");
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
                const panel = sections.nth(choiceIndex).locator(`[data-theme="${theme}"]`);
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
                    const card = sections.nth(choiceIndex).locator(`[data-theme="${theme}"] [data-option="${option.id}"]`);
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
                    const target = rule.selectorText.includes('[data-theme="dark"]') ? dark : rule.selectorText.includes('[data-theme="light"]') ? light : undefined;
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
        await page.goto("/page/commit-graph?components=dark");
        const graph = page.locator('main [data-theme="dark"] [data-graph="Every lane colour"]');
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
        await page.goto("/page/commit-graph?components=light");
        for (const title of ["Straight history", "Feature branch merged", "Branch not merged yet", "Two branches at once", "Every lane colour"]) {
            await expect(page.locator(`main [data-graph="${title}"]`)).toBeVisible();
        }
        const lastLane = page.locator('main [data-graph="Every lane colour"] line[data-lane="6"]').first();
        expect(await computedStyle(lastLane, "stroke")).toBe(await page.evaluate(() => {
            const probe = document.createElement("div");
            probe.style.color = "var(--color-lane-6)";
            document.querySelector('main [data-theme="light"]')!.appendChild(probe);
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
        await page.goto("/page/fonts?components=light");
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
        await page.goto("/page/button?components=light");
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
        await page.goto("/page/button?components=light");
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
        await page.goto("/page/button");
        const dropDowns = page.locator("main section").filter({ hasText: "Drop-down buttons" });
        await dropDowns.locator('[data-theme="dark"]').getByRole("button", { name: "Merge" }).click();
        const darkBackground = await computedStyle(page.getByRole("menu").locator(".."), "background-color");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("menu")).toHaveCount(0);
        await dropDowns.locator('[data-theme="light"]').getByRole("button", { name: "Merge" }).click();
        const lightBackground = await computedStyle(page.getByRole("menu").locator(".."), "background-color");
        expect(lightBackground).not.toBe(darkBackground);
    });

    test("a select opens its list and shows the chosen item", async ({ page }) => {
        await page.goto("/page/select?components=light");
        const select = page.getByRole("combobox").first();
        await select.click();
        await page.getByRole("option", { name: "upstream" }).click();
        await expect(select).toHaveText("upstream");
    });

    test("the stage all checkbox is mixed while some files are ticked and ticks them all when clicked", async ({ page }) => {
        await page.goto("/page/toggles?components=light");
        const stageAll = page.getByRole("checkbox", { name: "Stage all" });
        await expect(stageAll).toHaveAttribute("data-indeterminate", "true");
        await stageAll.click();
        await expect(page.getByRole("checkbox", { name: "src/lanes.ts" })).toBeChecked();
        await expect(stageAll).toBeChecked();
    });

    test("clicking a tab or pressing the arrow keys switches the view below", async ({ page }) => {
        await page.goto("/page/tabs?components=light");
        const tabs = page.getByRole("tablist", { name: "Repository views" });
        await tabs.getByRole("tab", { name: /History/ }).click();
        await expect(page.getByText("128 commits on main.")).toBeVisible();
        await page.keyboard.press("ArrowRight");
        await expect(tabs.getByRole("tab", { name: /Stashes/ })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.getByText("2 stashed sets of changes.")).toBeVisible();
    });

    test("right-clicking a commit opens the context menu", async ({ page }) => {
        await page.goto("/page/menu?components=light");
        await page.getByText("Right-click this commit").click({ button: "right" });
        await expect(page.getByRole("menu")).toBeVisible();
        await expect(page.getByRole("menuitem", { name: /Reset to here/ })).toBeVisible();
    });

    test("a tooltip shows when the pointer rests on its button", async ({ page }) => {
        await page.goto("/page/tooltip?components=light");
        const section = page.locator("main section").filter({ hasText: "On hover and focus" });
        await section.getByRole("button", { name: "Push" }).hover();
        await expect(page.getByRole("tooltip").filter({ hasText: "Push" })).toBeVisible();
    });

    test("clicking a folder in the tree closes and opens it", async ({ page }) => {
        await page.goto("/page/list-and-tree?components=light");
        const tree = page.getByRole("tree", { name: "Changed files" });
        await expect(tree.getByText("lanes.ts")).toBeVisible();
        await tree.getByRole("treeitem", { name: "graph", exact: true }).click();
        await expect(tree.getByText("lanes.ts")).toHaveCount(0);
        await tree.getByRole("treeitem", { name: "graph", exact: true }).click();
        await expect(tree.getByText("lanes.ts")).toBeVisible();
    });

    test("the command palette narrows as you type and runs the highlighted command on Enter", async ({ page }) => {
        await page.goto("/page/command-palette?components=light");
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
        await page.goto("/page/notifications?components=light");
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
        await page.goto("/page/shortcuts?components=light");
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
        await page.goto("/page/commit-explorer?components=light");
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.focus();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        const details = explorer.getByRole("region", { name: "Commit details" });
        await expect(details).toContainText("Move through the panes with the arrow keys");
        await expect(details).toHaveAttribute("data-active", "true");
        await page.keyboard.press("ArrowDown");
        await expect(explorer.getByRole("region", { name: "Full commit details" })).toContainText("Sam Lee");
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
        await page.goto("/page/commit-explorer?components=light");
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.getByText("Initial commit").click();
        const details = explorer.getByRole("region", { name: "Commit details" });
        await details.getByRole("button", { name: "Commit message" }).click();
        await expect(explorer.getByRole("region", { name: "Full commit details" })).toContainText("None, this is the first commit");
        await details.getByRole("button", { name: "Close commit details" }).click();
        await expect(details).toHaveCount(0);
    });

    test("the main lane runs unbroken from the newest commit to the first, with the feature branch beside it", async ({ page }) => {
        await page.goto("/page/commit-explorer?components=light");
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
        await page.goto("/page/commit-explorer?components=light");
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
});

test.describe("Git commands panel", () => {
    test("the panel shows no commands, one command or two commands, with no recent or earlier labels", async ({ page }) => {
        await page.goto("/page/git-commands-panel?components=light");
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
        await page.goto("/page/git-commands-panel?components=light");
        const panel = page.getByRole("region", { name: "Git commands" }).nth(1);
        await panel.getByRole("button", { name: "Copy command" }).click();
        await expect(panel.getByRole("button", { name: "Copied" })).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("git log --max-count=50");
        await expect(panel.getByRole("button", { name: "Copy command" })).toBeVisible({ timeout: 4000 });
    });
});

test.describe("Diff", () => {
    test("the unified view marks changed words and shows the unchanged lines between hunks on request", async ({ page }) => {
        await page.goto("/page/diff?components=light");
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
        await page.goto("/page/diff?components=light");
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
        await page.goto("/page/diff?components=light");
        const card = page.locator("main section.mb-10").filter({ has: page.getByRole("heading", { name: "Long lines" }) }).getByRole("region", { name: "docs/user-guide.md" }).first();
        const row = card.locator('[data-line="added"]');
        const oneRowHeight = (await row.boundingBox())!.height;
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByLabel("Wrap long lines").click();
        await page.keyboard.press("Escape");
        await expect.poll(async () => (await row.boundingBox())!.height).toBeGreaterThan(oneRowHeight * 1.5);
    });

    test("a deleted file starts folded and a large diff waits behind a button", async ({ page }) => {
        await page.goto("/page/diff?components=light");
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
    test("the search box fades the commits that do not match and keeps the graph", async ({ page }) => {
        await page.goto("/page/commit-explorer?components=light");
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        const commitPane = explorer.getByRole("region", { name: "Commits" });
        const lanesBefore = await commitPane.locator("line[data-lane]").count();
        await explorer.getByRole("textbox", { name: "Search commits" }).fill("pane");
        const rows = commitPane.getByRole("list", { name: "Commits" }).locator(":scope > li");
        await expect(rows).toHaveCount(7);
        await expect(rows.and(page.locator('[data-match="true"]'))).toHaveCount(3);
        await expect(commitPane).toContainText("3 of 7");
        await expect(commitPane.locator("line[data-lane]")).toHaveCount(lanesBefore);
        await explorer.getByRole("button", { name: "Clear search" }).click();
        await expect(rows.and(page.locator('[data-match="true"]'))).toHaveCount(7);
    });

    test("the tree view lists files by folder and the arrow keys follow its order", async ({ page }) => {
        await page.goto("/page/commit-explorer?components=light");
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.getByText("Show a changed file").click();
        const details = explorer.getByRole("region", { name: "Commit details" });
        await details.getByRole("button", { name: "Tree" }).click();
        await expect(details.getByText("backend/src/tasks")).toBeVisible();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await expect(explorer.getByRole("region", { name: "File diff" })).toContainText("backend/src/tasks/file-diff-task.zig");
        await page.keyboard.press("ArrowDown");
        await expect(explorer.getByRole("region", { name: "File diff" })).toContainText("file-pane.tsx");
    });
});

test.describe("Dotted lanes and sidebar search", () => {
    test("an unmerged branch's lane is dotted and a merged branch's is solid", async ({ page }) => {
        await page.goto("/page/commit-graph?components=light");
        expect(await page.locator('[data-graph="Branch not merged yet"] [data-dotted="true"]').count()).toBeGreaterThan(0);
        await expect(page.locator('[data-graph="Feature branch merged"] [data-dotted="true"]')).toHaveCount(0);
    });

    test("the repository sidebar's search box narrows every group to the matching names", async ({ page }) => {
        await page.goto("/page/sidebar?components=light");
        const sidebar = page.getByRole("navigation", { name: "Repository" });
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
        await page.goto("/page/diff?components=light");
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
        await page.goto("/page/diff?components=light");
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
        await page.goto("/page/diff?components=light");
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

    test("the commit explorer's file pane steps through changes and files", async ({ page }) => {
        await page.goto("/page/commit-explorer?components=light");
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(2);
        const file = explorer.getByRole("region", { name: "File diff" });
        await file.click();
        await page.keyboard.press("ArrowDown");
        await expect(file.locator('[data-current="true"][data-hunk-index="0"]')).toHaveCount(1);
        await page.keyboard.press("Shift+ArrowDown");
        await expect(file).toContainText("frontend/src/components/app-layout.tsx");
        await expect(file).toHaveAttribute("data-active", "true");
    });

    test("Space stages and unstages the current change in the diff explorer", async ({ page }) => {
        await page.goto("/page/diff?components=light");
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
        await page.goto("/page/diff?components=light");
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
        await page.goto("/page/diff?components=light");
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        const context = card.locator('[data-line="context"]');
        const before = await context.count();
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Show the whole file" }).click();
        await page.keyboard.press("Escape");
        await expect(context).toHaveCount(before + 30);
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Show only the changes" }).click();
        await page.keyboard.press("Escape");
        await expect(context).toHaveCount(before);
    });

    test("the info button lists the change's stats with labels", async ({ page }) => {
        await page.goto("/page/diff?components=light");
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByRole("button", { name: "Change details" }).click();
        const info = page.getByRole("dialog", { name: "Change details" });
        await expect(info).toContainText("ChangeModified");
        await expect(info).toContainText("Lines added5");
        await expect(info).toContainText("Lines deleted3");
        await expect(info).toContainText("Changes2 hunks");
    });

    test("the commit explorer's file pane switches to side by side", async ({ page }) => {
        await page.goto("/page/commit-explorer?components=light");
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
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        await area.focus();
        await page.keyboard.press("ArrowDown");
        await expect(area.getByRole("region", { name: "File diff" })).toContainText("theme-names.ts");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Space");
        await expect(area.getByRole("checkbox", { name: "Stage frontend/src/lib/old-theme.ts" })).toBeChecked();
        await expect(area.getByRole("button", { name: "Commit 4 files" })).toBeDisabled();
        await area.getByRole("textbox", { name: "Summary" }).fill("Tidy the themes");
        await area.getByRole("button", { name: "Commit 4 files" }).click();
        await expect(area).toContainText("Committed 4 files: Tidy the themes");
        await expect(area.getByRole("button", { name: "frontend/src/lib/theme-names.ts" })).toHaveCount(0);
        await expect(area.getByRole("button", { name: "frontend/src/lib/zoom.ts" })).toBeVisible();
    });

    test("ticking Amend brings in the last commit's message", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        await area.getByRole("checkbox", { name: "Amend" }).check();
        await expect(area.getByRole("textbox", { name: "Summary" })).toHaveValue("Show the Git commands each page runs");
        await expect(area.getByRole("button", { name: "Amend commit" })).toBeEnabled();
        await expect(area.getByRole("checkbox", { name: "No verify" })).toBeVisible();
    });

    test("the split view lists staged and unstaged files apart and shows the diff in two sections", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        await area.getByRole("button", { name: "Staged and unstaged" }).click();
        await expect(area.getByText("Staged (3)")).toBeVisible();
        await expect(area.getByText("Unstaged (7)")).toBeVisible();
        await expect(area.getByRole("region", { name: "Staged changes", exact: true })).toBeVisible();
        await expect(area.getByRole("region", { name: "Unstaged changes" })).toBeVisible();
        await area.getByRole("region", { name: "Unstaged changes" }).getByRole("button", { name: "Stage this hunk" }).last().click();
        await expect(area.getByText("Unstaged (6)")).toBeVisible();
    });

    test("the search box narrows the changed files", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        await area.getByRole("textbox", { name: "Search changed files" }).fill("theme");
        await expect(area.getByRole("list", { name: "Changed files" }).locator(":scope > li")).toHaveCount(3);
        await expect(area).toContainText("3 of 9");
    });

    test("an image file shows its old and new versions side by side", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        await area.getByRole("button", { name: "assets/graft-512.png" }).click();
        await expect(area.getByRole("img", { name: /^Before/ })).toBeVisible();
        await expect(area.getByRole("img", { name: /^After/ })).toBeVisible();
    });

    test("M and the maximise button make a pane fill the area and put it back", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
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
        await page.goto("/page/diff?components=light");
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByRole("textbox", { name: "Find in this diff" }).fill("level");
        await expect(card).toContainText("1 of 6");
        await expect(card.locator('[data-current-match="true"]')).toHaveCount(1);
        await card.getByRole("textbox", { name: "Find in this diff" }).press("Enter");
        await expect(card).toContainText("2 of 6");
        await card.getByRole("button", { name: "Previous match" }).click();
        await expect(card).toContainText("1 of 6");
    });

    test("clicking a hunk makes it the current one", async ({ page }) => {
        await page.goto("/page/diff?components=light");
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByText("saveState({ zoom: value });").click();
        await expect(card.locator('[data-current="true"][data-hunk-index="1"]')).toHaveCount(1);
    });

    test("the commit explorer's resize handle widens the commit list and M maximises a pane", async ({ page }) => {
        await page.goto("/page/commit-explorer?components=light");
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
        await page.goto("/page/diff?components=light");
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        const find = card.getByRole("textbox", { name: "Find in this diff" });
        await find.fill("zoomIn");
        await expect(card).toContainText("No matches");
        await card.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Show the whole file" }).click();
        await page.keyboard.press("Escape");
        await expect(card).toContainText("1 of 1");
        await expect(card.locator('[data-search-match="0"]')).toBeVisible();
    });

    test("every changed text file in the commit explorer can show the whole file", async ({ page }) => {
        await page.goto("/page/commit-explorer?components=light");
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
        await page.goto("/page/commit-explorer?components=light");
        const explorer = page.getByRole("application", { name: "Commit explorer" }).nth(2);
        await explorer.getByRole("region", { name: "Commit details" }).getByText("Files changed").click();
        await expect(explorer.getByRole("region", { name: "Commit details" })).toHaveAttribute("data-active", "true");
        await explorer.getByRole("region", { name: "Commits" }).getByText("Initial commit").click();
        await expect(explorer.getByRole("region", { name: "Commits" })).toHaveAttribute("data-active", "true");
    });
});

test.describe("Discarding changes", () => {
    test("discarding a hunk asks first, then takes it out of the diff", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        const card = area.getByRole("region", { name: "File diff" });
        await expect(card.locator("[data-hunk-index]")).toHaveCount(2);
        await card.getByRole("button", { name: "Discard this hunk" }).last().click();
        const dialog = area.getByRole("dialog", { name: "Discard this change?" });
        await dialog.getByRole("button", { name: "Keep changes" }).click();
        await expect(card.locator("[data-hunk-index]")).toHaveCount(2);
        await card.getByRole("button", { name: "Discard this hunk" }).last().click();
        await dialog.getByRole("button", { name: "Discard" }).click();
        await expect(card.locator("[data-hunk-index]")).toHaveCount(1);
        await expect(card.locator('[data-line="added"]')).toHaveCount(3);
        await expect(card.locator('[data-line="deleted"]')).toHaveCount(2);
    });

    test("discarding a file takes it out of the list", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        await area.getByRole("region", { name: "File diff" }).getByRole("button", { name: "Discard this file" }).click();
        await area.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
        await expect(area.getByRole("button", { name: "frontend/src/lib/zoom.ts" })).toHaveCount(0);
        await expect(area.getByText("8 files")).toBeVisible();
    });
});

test.describe("Runs of unchanged lines and the full commit details", () => {
    test("Up and Down stop on runs of unchanged lines and Space shows and folds them", async ({ page }) => {
        await page.goto("/page/diff?components=light");
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
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByText("24 unchanged lines").click();
        await expect(diff.locator('[data-current="true"][data-gap-index="1"]')).toHaveCount(1);
        await page.keyboard.press("Space");
        await expect(diff.getByRole("button", { name: "Hide 24 unchanged lines" })).toBeVisible();
    });

    test("the commit's row opens its full details, with copy buttons for the summary and description", async ({ page }) => {
        await page.goto("/page/commit-explorer?components=light");
        const explorer = page.getByRole("application", { name: "Commit explorer" }).first();
        await explorer.getByText("Show the Git commands each page runs").click();
        const details = explorer.getByRole("region", { name: "Commit details" });
        await expect(details.getByRole("button", { name: "Commit message" })).toContainText("a1b2c3d");
        await details.getByRole("button", { name: "Commit message" }).click();
        const full = explorer.getByRole("region", { name: "Full commit details" });
        await expect(full).toContainText("The help panel in the right sidebar lists the commands");
        await expect(full.getByRole("button", { name: "Copy summary" })).toBeVisible();
        await expect(full.getByRole("button", { name: "Copy description" })).toBeVisible();
    });
});

test.describe("Diff options and picking lines", () => {
    test("the options dialog names every option with its key, and the keys work", async ({ page }) => {
        await page.goto("/page/diff?components=light");
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
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        await area.getByRole("button", { name: ".gitignore", exact: true }).click();
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        await diff.locator('[data-line-id][data-line="added"]').filter({ hasText: "tmp/" }).click();
        await expect(diff.locator('[data-picked="true"]')).toHaveCount(1);
        await diff.getByRole("button", { name: "Stage this line", exact: true }).click();
        await area.getByRole("button", { name: "Staged and unstaged" }).click();
        const staged = area.getByRole("region", { name: "Staged diff", exact: true });
        await expect(staged.locator('[data-line="added"]')).toHaveCount(1);
        await expect(staged).toContainText("tmp/");
        const unstaged = area.getByRole("region", { name: "Unstaged diff" });
        await expect(unstaged.locator('[data-line="added"]')).toHaveCount(1);
        await expect(unstaged.locator('[data-line="deleted"]')).toHaveCount(1);
    });

    test("discarding picked lines asks first, then puts them back", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        await diff.locator('[data-line-id]').filter({ hasText: "DEFAULT_LEVEL = 1" }).click();
        await diff.getByRole("button", { name: "Discard this line" }).click();
        await area.getByRole("dialog", { name: "Discard 1 line?" }).getByRole("button", { name: "Discard" }).click();
        await expect(diff).not.toContainText("DEFAULT_LEVEL = 1");
        await expect(diff.locator('[data-line="added"]')).toHaveCount(4);
    });
});

test.describe("Popups and the page scrollbar", () => {
    test("opening a dropdown dialog leaves the page free to scroll", async ({ page }) => {
        await page.goto("/page/diff?components=light");
        const card = page.locator("main section.mb-10").first().getByRole("region", { name: "frontend/src/lib/zoom.ts" });
        await card.getByRole("button", { name: "Change details" }).click();
        await expect(page.getByRole("dialog", { name: "Change details" })).toBeVisible();
        expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("visible");
    });
});

test.describe("Danger icon buttons", () => {
    test("the Discard icon buttons draw their icon and border in the danger colour", async ({ page }) => {
        await page.goto("/page/changes?components=light");
        const button = page.getByRole("application", { name: "Changes" }).getByRole("button", { name: "Discard this file" });
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
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
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
        await page.goto("/page/changes?components=light");
        const area = page.getByRole("application", { name: "Changes" });
        const diff = area.getByRole("region", { name: "File diff" });
        await diff.locator('[data-hunk-index="1"]').click();
        await expect(diff.locator('[data-current="true"][data-hunk-index="1"]')).toHaveCount(1);
        await diff.getByRole("button", { name: "Diff options" }).click();
        await page.getByRole("dialog", { name: "Diff options" }).getByRole("button", { name: "Pick lines" }).click();
        await page.keyboard.press("Escape");
        await expect(diff.locator('[data-current="true"][data-hunk-index]')).toHaveCount(0);
    });
});
