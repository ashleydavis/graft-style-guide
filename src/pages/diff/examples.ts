//
// The example file changes the Diff page shows: a change in two hunks with the whole old file
// known, long lines, and each kind of change with nothing or little to compare line by line.
//

import type { IFileDiff } from "./components/file-diff-card";
import { exampleImageVersions } from "./components/image-diff";
import { exampleOldFile } from "./example-old-file";

//
// The old version of zoom.ts, one entry per line, so the unchanged lines between its hunks can be
// shown.
//
const oldZoomFile = [
    "//",
    "// Zooms the window in and out in steps, and remembers the level.",
    "//",
    "",
    "import { readState, saveState } from \"./state\";",
    "",
    "const STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];",
    "",
    "let level = readState().zoom ?? 1;",
    "",
    "//",
    "// Returns the step nearest the level.",
    "//",
    "function nearestStep(value: number): number {",
    "    return STEPS.reduce((best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best));",
    "}",
    "",
    "//",
    "// Zooms in one step.",
    "//",
    "export function zoomIn(): void {",
    "    const index = STEPS.indexOf(nearestStep(level));",
    "    setLevel(STEPS[Math.min(index + 1, STEPS.length - 1)]);",
    "}",
    "",
    "//",
    "// Zooms out one step.",
    "//",
    "export function zoomOut(): void {",
    "    const index = STEPS.indexOf(nearestStep(level));",
    "    setLevel(STEPS[Math.max(index - 1, 0)]);",
    "}",
    "",
    "function setLevel(value: number): void {",
    "    level = value;",
    "    document.body.style.zoom = String(value);",
    "}",
];

//
// A change to zoom.ts in two hunks: new zoom steps near the top and the level saved as it changes
// near the bottom, with the lines between them left out. Two lines change a word or two, so the
// word marking shows.
//
export const zoomChange: IFileDiff = {
    path: "frontend/src/lib/zoom.ts",
    status: "M",
    oldFileLines: oldZoomFile,
    stagedHunks: [0],
    diff: [
        "@@ -7,3 +7,4 @@ import { readState, saveState } from \"./state\";",
        "-const STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];",
        "+const STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];",
        "+const DEFAULT_LEVEL = 1;",
        " ",
        "-let level = readState().zoom ?? 1;",
        "+let level = readState().zoom ?? DEFAULT_LEVEL;",
        "@@ -34,4 +35,5 @@ export function zoomOut(): void {",
        " function setLevel(value: number): void {",
        "     level = value;",
        "-    document.body.style.zoom = String(value);",
        "+    document.documentElement.style.zoom = String(value);",
        "+    saveState({ zoom: value });",
        " }",
    ].join("\n"),
};

//
// A change to a documentation file whose lines are paragraphs, longer than any window, for the
// switch that wraps long lines.
//
export const longLinesChange: IFileDiff = {
    path: "docs/user-guide.md",
    status: "M",
    diff: [
        "@@ -40,3 +40,3 @@ ## Settings",
        " Graft keeps its settings in a file called config.toml.",
        "-The theme setting picks the colours: light, dark or system, which follows the computer's own setting and changes when it does, without restarting Graft.",
        "+The theme setting picks the colours: light, dark, high contrast or system, which follows the computer's own setting and changes when it does, without restarting Graft or reopening the repository.",
        " Other settings are described below.",
    ].join("\n"),
};
longLinesChange.oldFileLines = exampleOldFile(longLinesChange.path, longLinesChange.status, longLinesChange.diff ?? "");

//
// Returns a diff that adds `count` generated lines to a lock file, for a diff too large to show
// straight away.
//
function lockFileDiff(count: number): string {
    const lines = ["@@ -0,0 +1," + count + " @@"];
    for (let index = 0; index < count; index++) {
        lines.push(`+    "package-${index}": ["package-${index}@1.${index % 10}.0", "", {}, "sha512-${(index * 7919).toString(16).padStart(8, "0")}"],`);
    }
    return lines.join("\n");
}

//
// The files of a commit that touches each kind of change: an added file, a deleted file folded
// away, a renamed file with a change, a rename with no changes, a binary file, a mode change, a
// file that ends without a line break and a lock file too large to show straight away.
//
const commitFileList: IFileDiff[] = [
    {
        path: "frontend/src/lib/theme-names.ts",
        status: "A",
        stagedHunks: [0],
        diff: ["@@ -0,0 +1,4 @@", "+export const themeNames = {", "+    light: \"Light\",", "+    dark: \"Dark\",", "+};"].join("\n"),
    },
    {
        path: "frontend/src/lib/old-theme.ts",
        status: "D",
        startsCollapsed: true,
        diff: ["@@ -1,3 +0,0 @@", "-export function oldTheme(): string {", "-    return \"light\";", "-}"].join("\n"),
    },
    {
        path: "frontend/src/lib/themes.ts",
        oldPath: "frontend/src/lib/theme.ts",
        status: "R",
        stagedHunks: [0],
        diff: ["@@ -3,3 +3,3 @@", " import { themeNames } from \"./theme-names\";", "-export const defaultTheme = \"light\";", "+export const defaultTheme = \"system\";", " export const themes = Object.keys(themeNames);"].join("\n"),
    },
    {
        path: "docs/README.md",
        oldPath: "README.md",
        status: "R",
    },
    {
        path: "assets/graft-512.png",
        status: "M",
        binary: {
            oldSize: "18.2 KB",
            newSize: "21.7 KB",
            images: exampleImageVersions,
        },
    },
    {
        path: "scripts/test-everything.sh",
        status: "M",
        modeChange: {
            from: "100644",
            to: "100755",
        },
    },
    {
        path: ".gitignore",
        status: "M",
        diff: ["@@ -1,2 +1,3 @@", " node_modules/", "-dist/", "\\ No newline at end of file", "+dist/", "+tmp/", "\\ No newline at end of file"].join("\n"),
    },
    {
        path: "bun.lock",
        status: "M",
        diff: lockFileDiff(1240),
    },
];

//
// The commit's files, each with its old file built so its unchanged lines can show.
//
export const commitFiles: IFileDiff[] = commitFileList.map(file => (file.diff && !file.oldFileLines ? { ...file, oldFileLines: exampleOldFile(file.path, file.status, file.diff) } : file));
