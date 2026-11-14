//
// End-to-end tests of the style explorer on a phone. Goal: check that every page fits the
// screen with no sideways scrolling, that the sidebar works as a drawer and that the floating
// buttons and popups stay usable, with the phone held upright and on its side. Method: open the
// explorer in Chrome emulating a phone with touch, at each orientation, and read the layout the
// way a person would see it.
//

import { expect, test, type Locator, type Page } from "@playwright/test";
import { explorerPages } from "../../explorer-pages";

//
// A phone screen in one orientation.
//
interface IOrientation {
    //
    // The name shown in the test titles.
    //
    name: string;

    //
    // The screen width in CSS pixels.
    //
    width: number;

    //
    // The screen height in CSS pixels.
    //
    height: number;
}

//
// A 390 by 844 phone, the size of a current mid-sized phone, held upright and on its side.
//
const orientations: IOrientation[] = [
    {
        name: "portrait",
        width: 390,
        height: 844,
    },
    {
        name: "landscape",
        width: 844,
        height: 390,
    },
];

//
// Returns how many CSS pixels the page is wider than the screen, which is 0 when there is no
// sideways scrolling.
//
async function sidewaysOverflow(page: Page): Promise<number> {
    return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

//
// Returns the box around the text inside `locator`, which for a heading is narrower than the
// heading element itself, since a heading stretches across the whole page.
//
async function textBox(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
    return locator.evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        };
    });
}

//
// Returns true when the box of `button` overlaps the text of `text` on screen.
//
async function coversText(button: Locator, text: Locator): Promise<boolean> {
    const a = await button.boundingBox();
    if (!a) {
        throw new Error("The button must be on screen to compare where it is.");
    }
    const b = await textBox(text);
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

//
// Checks that the box of `locator` lies inside a screen of size `orientation`.
//
async function expectOnScreen(locator: Locator, orientation: IOrientation): Promise<void> {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(orientation.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(orientation.height);
}

for (const orientation of orientations) {
    test.describe(`Phone, ${orientation.name}`, () => {
        test.use({
            viewport: {
                width: orientation.width,
                height: orientation.height,
            },
            isMobile: true,
            hasTouch: true,
            deviceScaleFactor: 3,
        });

        for (const explorerPage of explorerPages) {
            for (const mode of ["both", "light", "dark"]) {
                test(`the ${explorerPage.title} page fits the screen width with components=${mode}`, async ({ page }) => {
                    await page.goto(`/page/${explorerPage.id}?components=${mode}`);
                    await expect(page.getByRole("heading", { level: 1, name: explorerPage.title })).toBeVisible();
                    expect(await sidewaysOverflow(page)).toBe(0);
                });
            }

            test(`the floating buttons leave the ${explorerPage.title} page title clear`, async ({ page }) => {
                await page.goto(`/page/${explorerPage.id}`);
                const title = page.getByRole("heading", { level: 1, name: explorerPage.title });
                await expect(title).toBeVisible();
                expect(await coversText(page.getByRole("button", { name: "Restore sidebar" }), title)).toBe(false);
                expect(await coversText(page.getByRole("button", { name: "About" }), title)).toBe(false);
            });
        }

        test("the sidebar starts closed and the page uses the whole screen", async ({ page }) => {
            await page.goto("/page/button");
            await expect(page.getByRole("navigation")).toHaveCount(0);
            const main = await page.getByRole("main").boundingBox();
            expect(main!.x).toBe(0);
            expect(main!.width).toBeGreaterThanOrEqual(orientation.width - 20);
        });

        test("the menu button opens the sidebar as a drawer and choosing a page closes it", async ({ page }) => {
            await page.goto("/page/button");
            await page.getByRole("button", { name: "Restore sidebar" }).tap();
            const navigation = page.getByRole("navigation");
            await expect(navigation).toBeVisible();
            await expect.poll(async () => (await navigation.boundingBox())?.x).toBe(0);
            await expectOnScreen(navigation.getByPlaceholder("Search components"), orientation);
            await navigation.getByRole("link", { name: "Dialog" }).tap();
            await expect(page).toHaveURL(/\/page\/dialog\?sidebar=minimised$/);
            await expect(page.getByRole("heading", { level: 1, name: "Dialog" })).toBeVisible();
            await expect(navigation).toHaveCount(0);
        });

        test("pressing Enter in the drawer's search box opens the match and closes the drawer", async ({ page }) => {
            await page.goto("/page/button");
            await page.getByRole("button", { name: "Restore sidebar" }).tap();
            const search = page.getByRole("navigation").getByPlaceholder("Search components");
            await search.fill("fonts");
            await search.press("Enter");
            await expect(page.getByRole("heading", { level: 1, name: "Fonts" })).toBeVisible();
            await expect(page.getByRole("navigation")).toHaveCount(0);
        });

        test("tapping outside the drawer closes it", async ({ page }) => {
            await page.goto("/page/button");
            await page.getByRole("button", { name: "Restore sidebar" }).tap();
            await expect(page.getByRole("navigation")).toBeVisible();
            await page.mouse.click(orientation.width - 10, orientation.height - 10);
            await expect(page.getByRole("navigation")).toHaveCount(0);
            await expect(page).toHaveURL(/sidebar=minimised/);
        });

        test("the settings at the bottom of the drawer can be reached and changed", async ({ page }) => {
            await page.goto("/page/button?sidebar=open");
            const explorerSwitch = page.getByRole("group", { name: "Explorer" });
            await explorerSwitch.getByRole("button", { name: "Dark", exact: true }).tap();
            await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
            await page.getByRole("group", { name: "Components" }).getByRole("button", { name: "Light", exact: true }).tap();
            await expect(page).toHaveURL(/components=light/);
            await expect(page.locator('main [data-theme="dark"]')).toHaveCount(0);
        });

        test("the about popup fits on the screen and closes", async ({ page }) => {
            await page.goto("/page/overview");
            await page.getByRole("button", { name: "About" }).tap();
            const popup = page.getByRole("dialog", { name: "About" });
            await expect(popup).toBeVisible();
            await expectOnScreen(popup.getByRole("button", { name: "Close" }), orientation);
            await expectOnScreen(popup.getByRole("link", { name: "Code Capers" }), orientation);
            await popup.getByRole("button", { name: "Close" }).tap();
            await expect(popup).toHaveCount(0);
        });

        test("the example dialog fits on the screen", async ({ page }) => {
            await page.goto("/page/dialog?components=dark");
            await page.getByRole("button", { name: "Open dialog" }).tap();
            const dialog = page.getByRole("dialog").first();
            await expect(dialog).toBeVisible();
            const box = await dialog.boundingBox();
            expect(box!.x).toBeGreaterThanOrEqual(0);
            expect(box!.x + box!.width).toBeLessThanOrEqual(orientation.width);
            expect(await sidewaysOverflow(page)).toBe(0);
        });
    });
}
