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

test.describe("Searching", () => {
    test("typing filters the page list by title", async ({ page }) => {
        await page.goto("/");
        const navigation = page.getByRole("navigation");
        await navigation.getByPlaceholder("Search components").fill("butt");
        await expect(navigation.getByRole("link")).toHaveText(["Button"]);
    });

    test("typing matches keywords as well as titles", async ({ page }) => {
        await page.goto("/");
        const navigation = page.getByRole("navigation");
        await navigation.getByPlaceholder("Search components").fill("input");
        await expect(navigation.getByRole("link")).toHaveText(["Text box"]);
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
        await expect(navigation.getByRole("link")).toHaveCount(0);
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
    test("a URL naming neither shows light next to dark in a light explorer", async ({ page }) => {
        await page.goto("/page/button");
        const componentSwitch = page.getByRole("group", { name: "Components" });
        const explorerSwitch = page.getByRole("group", { name: "Explorer" });
        await expect(componentSwitch.getByRole("button", { name: "Light next to dark" })).toHaveAttribute("aria-pressed", "true");
        await expect(explorerSwitch.getByRole("button", { name: "Light", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
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
        await expect(navigation.getByRole("link")).toHaveText(["Dialog"]);
    });

    test("the danger button takes the danger token, which differs from the accent", async ({ page }) => {
        await page.goto("/page/dialog?components=light");
        const discard = page.getByRole("button", { name: "Discard", exact: true });
        const keep = page.getByRole("button", { name: "Keep changes" });
        const create = page.locator("main section").first().getByRole("button", { name: "Create" });
        const discardBackground = await computedStyle(discard, "background-color");
        expect(discardBackground).not.toBe("rgba(0, 0, 0, 0)");
        expect(discardBackground).not.toBe(await computedStyle(create, "background-color"));
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
    test("the about page links to Graft on GitHub and to the YouTube channel", async ({ page }) => {
        await page.goto("/page/about");
        await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
        await expect(page.getByRole("link", { name: "github.com/ashleydavis/Graft" })).toHaveAttribute("href", "https://github.com/ashleydavis/Graft");
        await expect(page.getByRole("link", { name: "Code Capers" })).toHaveAttribute("href", "https://www.youtube.com/@CodeCapers");
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

    test("the page says so when every choice is made", async ({ page }) => {
        await page.goto("/page/choices");
        if (choices.length === 0) {
            await expect(page.getByText("Every choice is made.")).toBeVisible();
        }
        else {
            await expect(page.getByText("Every choice is made.")).toHaveCount(0);
        }
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
