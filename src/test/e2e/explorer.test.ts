//
// End-to-end tests of the style explorer. Goal: check that a person can find and open every
// page, that the page is in the URL and that every example is drawn in both themes from the
// tokens in graft.css. Method: open the explorer in Chrome against a dev server started by
// Playwright, then click, type and read computed styles the way a person would see them.
//

import { expect, test, type Locator, type Page } from "@playwright/test";
import { choices } from "../../pages/choices/options";

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

    test("pushing shows a toast that closes on Dismiss", async ({ page }) => {
        await page.goto("/page/notifications?components=light");
        await page.getByRole("button", { name: "Push" }).click();
        const toast = page.getByText("Pushed 2 commits to origin/main.");
        await expect(toast).toBeVisible();
        await page.getByRole("alert").filter({ hasText: "Pushed 2 commits" }).getByRole("button", { name: "Dismiss" }).click();
        await expect(toast).toHaveCount(0);
    });
});
