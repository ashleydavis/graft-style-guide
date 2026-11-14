//
// Builds the old file for an example diff that comes without one, so every example can show its
// unchanged lines. The lines the diff shows sit at their own line numbers, and the lines it leaves
// out are filled from a few sample lines in the file's language.
//

import { parseHunks } from "./model";

//
// How many unchanged lines follow the last hunk in a built old file.
//
const LINES_AFTER_LAST_HUNK = 6;

//
// Sample lines for each kind of file, used in turn to fill the lines a diff leaves out.
//
const SAMPLE_LINES: Record<string, string[]> = {
    ts: [
        "",
        "//",
        "// Returns the value the caller asked for, read from the shared state.",
        "//",
        "export function readValue(key: string): string | undefined {",
        "    const state = readState();",
        "    return state[key];",
        "}",
    ],
    zig: [
        "",
        "/// Reads the next entry and returns it, or null at the end.",
        "pub fn next(self: *Reader) !?Entry {",
        "    const line = try self.readLine() orelse return null;",
        "    return try Entry.parse(line);",
        "}",
    ],
    md: [
        "",
        "Graft keeps every Git command it runs in the commands panel, so you can see what each step did.",
        "",
        "- Open the panel with the button in the status bar.",
        "- Copy a command with the button beside it.",
    ],
    yml: ["", "      - name: Run the tests", "        run: ./scripts/test-everything.sh"],
    json: ["    \"private\": true,", "    \"type\": \"module\","],
    other: ["", "# Sample line"],
};

//
// Returns the sample lines for a file, picked by its extension.
//
function sampleLinesFor(path: string): string[] {
    const extension = path.slice(path.lastIndexOf(".") + 1);
    if (extension === "ts" || extension === "tsx") {
        return SAMPLE_LINES.ts;
    }
    return SAMPLE_LINES[extension] ?? SAMPLE_LINES.other;
}

//
// Returns the old file's lines for `diff`: each kept or deleted line at its old line number, the
// gaps before and between hunks filled with sample lines, and a few sample lines after the last
// hunk unless the old file ends inside the diff. Returns undefined for an added or deleted file,
// whose diff already holds the whole file, for a diff whose first hunk starts from an empty old
// file, and for a diff with no hunks.
//
export function exampleOldFile(path: string, status: string, diff: string): string[] | undefined {
    const hunks = parseHunks(diff);
    if (hunks.length === 0 || status === "A" || status === "D" || hunks[0].oldCount === 0) {
        return undefined;
    }
    const samples = sampleLinesFor(path);
    const lines: string[] = [];
    function fillTo(lineNumber: number): void {
        while (lines.length < lineNumber - 1) {
            lines.push(samples[lines.length % samples.length]);
        }
    }
    let endsInDiff = false;
    for (const hunk of hunks) {
        fillTo(hunk.oldStart);
        for (const line of hunk.lines) {
            if (line.kind !== "added") {
                lines.push(line.text);
                endsInDiff = line.hasNoNewline === true;
            }
        }
    }
    if (!endsInDiff) {
        fillTo(lines.length + 1 + LINES_AFTER_LAST_HUNK);
    }
    return lines;
}
