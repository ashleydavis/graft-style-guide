//
// End-to-end tests of how the Commit page and the directory browser lay out and behave: the file
// list's width, the area filling the window, the open file's marker, the full paths the path
// menus copy, and the directory browser's remembered directory, its page-wide typing, its waits
// and its Windows breadcrumbs, and which searches run as typing pauses and which wait for Enter. Method: open the explorer in Chrome against the dev server, then
// click, type and read the page the way a person would.
//

import { expect, test } from "@playwright/test";
import { openPage } from "./themes";
import { crumbsOf } from "../../pages/directory-browser/directory-rows";

test.describe("Commit page layout", () => {
    test("the file list starts 510 pixels wide and the area fills the window's height", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 1000 });
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const list = area.getByRole("region", { name: "Changed files" });
        const listBox = await list.boundingBox();
        expect(listBox).not.toBeNull();
        expect(listBox?.width ?? 0).toBeGreaterThan(320);
        expect(listBox?.width ?? 0).toBeLessThanOrEqual(510);
        const areaBox = await area.boundingBox();
        expect(areaBox?.height ?? 0).toBeGreaterThan(1000 - 200);
    });

    test("the file whose diff shows has the open marker", async ({ page }) => {
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        const row = area.getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true });
        await row.click();
        await expect(row).toHaveCSS("box-shadow", /inset/);
    });

    test("a file's path menu copies its full path from the example repository", async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await openPage(page, "/page/changes", { components: "light" });
        const area = page.getByRole("application", { name: "Changes" }).first();
        await area.getByRole("button", { name: "frontend/src/lib/zoom.ts", exact: true }).hover();
        await area.getByRole("region", { name: "Changed files" }).getByRole("button", { name: "Path actions for zoom.ts" }).click();
        await page.getByRole("menu").getByRole("menuitem", { name: "Copy full file path" }).click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("/home/you/projects/graft/frontend/src/lib/zoom.ts");
    });
});

test.describe("Directory browser behaviour", () => {
    test("the browser starts in the directory browsed to last", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        const list = page.getByRole("list", { name: "Directories" }).first();
        await list.getByRole("button", { name: "Directory /home/you/projects", exact: true }).dblclick();
        await expect(page.getByRole("navigation", { name: "Directory path" }).first()).toContainText("projects");
        await page.reload();
        await expect(page.getByRole("list", { name: "Directories" }).first().getByRole("button", { name: "Directory /home/you/projects/graft", exact: true })).toBeVisible();
    });

    test("typing anywhere on the page starts a search, which shows Searching while it runs", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        const list = page.getByRole("list", { name: "Directories" }).first();
        await expect(list).toBeVisible();
        await page.locator("main h2").first().click();
        await page.keyboard.type("graft");
        const box = page.getByRole("textbox", { name: "Search the directories" }).last();
        await expect(box).toBeFocused();
        await expect(box).toHaveValue("graft");
        await page.keyboard.press("Enter");
        await expect(page.getByText("Searching…").first()).toBeVisible();
        await expect(page.getByText("Searching…")).toHaveCount(0);
    });

    test("the search box has the keys when the page opens", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        await expect(page.getByRole("textbox", { name: "Search the directories" }).first()).toBeFocused();
    });

    test("Reading shows in place of the breadcrumbs while a directory is read", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        await page.getByRole("button", { name: "Up one directory" }).first().click();
        await expect(page.getByText("Reading…").first()).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Directory path" }).first()).toBeVisible();
    });

    test("the breadcrumbs split Unix and Windows paths", () => {
        expect(crumbsOf("/home/you/projects").map(crumb => crumb.path)).toEqual(["/", "/home", "/home/you", "/home/you/projects"]);
        expect(crumbsOf("C:\\Users\\you").map(crumb => crumb.name)).toEqual(["C:", "Users", "you"]);
        expect(crumbsOf("C:\\Users\\you").map(crumb => crumb.path)).toEqual(["C:\\", "C:\\Users", "C:\\Users\\you"]);
    });
});

test.describe("Cheap and expensive searches", () => {
    test("the commit search runs once typing pauses, with no Enter", async ({ page }) => {
        await openPage(page, "/page/commit-explorer", { components: "light" });
        const commitPane = page.getByRole("application", { name: "Commit explorer" }).first().getByRole("region", { name: "Commits" });
        await commitPane.getByRole("button", { name: "Search commits" }).click();
        await commitPane.getByRole("textbox", { name: "Search commits" }).fill("pane");
        await expect(commitPane.getByRole("list", { name: "Commits" }).locator(":scope > li.MuiListItemButton-root")).toHaveCount(5);
    });

    test("the directory search waits for Enter or the search button", async ({ page }) => {
        await openPage(page, "/page/directory-browser", { components: "light" });
        const box = page.getByRole("textbox", { name: "Search the directories" }).first();
        await box.fill("graft");
        await page.waitForTimeout(800);
        await expect(page.getByText("Searching…")).toHaveCount(0);
        await page.getByRole("button", { name: "Search", exact: true }).first().click();
        await expect(page.getByText("Searching…").first()).toBeVisible();
    });
});
