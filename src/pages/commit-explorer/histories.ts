//
// The busier example histories the commit explorer shows: several branches in progress at once,
// with merges whose lanes cross the lanes between them. Each is written as a list of commits that
// name their parents, and the hashes and line counts are worked out from them.
//

import type { ILaneShape } from "../commit-graph/components/graph-row";
import type { IChangedFile, ICommit, IHistory } from "./data";

//
// One commit as an example history writes it.
//
interface IExampleCommit {
    //
    // A short name for the commit that its children use to name it as a parent.
    //
    id: string;

    //
    // The first line of the message.
    //
    title: string;

    //
    // The rest of the message, absent for a one-line message.
    //
    description?: string;

    //
    // Who wrote and made the commit.
    //
    author: IPerson;

    //
    // When the commit was written and made, as an ISO date and time.
    //
    date: string;

    //
    // The branches, tags and HEAD that point at the commit, as `git log` names them.
    //
    refs?: string[];

    //
    // The ids of the commit's parents.
    //
    parents: string[];

    //
    // The commit's row of the commit graph.
    //
    graph: ILaneShape;

    //
    // The files the commit changed.
    //
    files: IChangedFile[];
}

//
// A person who writes commits.
//
interface IPerson {
    //
    // Their name.
    //
    name: string;

    //
    // Their email address.
    //
    email: string;
}

//
// The people who write the example commits.
//
const ash: IPerson = { name: "Ash Davis", email: "ash@example.com" };
const sam: IPerson = { name: "Sam Lee", email: "sam@example.com" };
const jo: IPerson = { name: "Jo Park", email: "jo@example.com" };
const rin: IPerson = { name: "Rin Okafor", email: "rin@example.com" };

//
// Returns a 40-digit hexadecimal hash made from `text`, the same every time, so each example
// commit has a hash that looks like Git's and never changes between runs.
//
export function exampleHash(text: string): string {
    let hash = "";
    let seed = 2166136261;
    for (let round = 0; hash.length < 40; round++) {
        for (const character of `${text}:${round}`) {
            seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
        }
        hash += seed.toString(16).padStart(8, "0");
    }
    return hash.slice(0, 40);
}

//
// Returns a graph row on `lane`, joined to the rows above and below unless `options` says
// otherwise, with the other lanes in `options`.
//
function on(lane: number, options: Partial<ILaneShape> = {}): ILaneShape {
    return {
        lane,
        joinsAbove: true,
        joinsBelow: true,
        through: [],
        endsHere: [],
        startsHere: [],
        ...options,
    };
}

//
// Returns a changed file with a diff of one hunk starting at line `start` of the old and new
// file. Each of `lines` starts with "+" for an added line, "-" for a deleted one or a space for a
// line the change kept. The file's line counts are counted from the lines, so they always match
// its diff.
//
function change(path: string, status: "A" | "M" | "D", start: number, lines: string[]): IChangedFile {
    const linesAdded = lines.filter(line => line.startsWith("+")).length;
    const linesDeleted = lines.filter(line => line.startsWith("-")).length;
    const kept = lines.length - linesAdded - linesDeleted;
    const oldStart = status === "A" ? 0 : start;
    const newStart = status === "D" ? 0 : start;
    return {
        path,
        status,
        linesAdded,
        linesDeleted,
        diff: [`@@ -${oldStart},${kept + linesDeleted} +${newStart},${kept + linesAdded} @@`, ...lines].join("\n"),
    };
}

//
// Builds a history from its example commits: gives each commit its hash and turns each parent id
// into that parent's hash.
//
function buildHistory(name: string, branch: string, laneCount: number, examples: IExampleCommit[]): IHistory {
    const hashes = new Map(examples.map(example => [example.id, exampleHash(`${name}/${example.id}`)]));
    function hashOf(id: string): string {
        const hash = hashes.get(id);
        if (!hash) {
            throw new Error(`The example history ${name} names a parent ${id} that it does not list. Each parent must be one of the history's own commits, so look at the commit that names it.`);
        }
        return hash;
    }
    const commits: ICommit[] = examples.map(example => ({
        hash: hashOf(example.id),
        title: example.title,
        description: example.description ?? "",
        refs: example.refs ?? [],
        authorName: example.author.name,
        authorEmail: example.author.email,
        authorDate: new Date(example.date),
        committerName: example.author.name,
        committerEmail: example.author.email,
        committerDate: new Date(example.date),
        parentHashes: example.parents.map(hashOf),
        files: example.files,
        graph: example.graph,
    }));
    return { name, branch, laneCount, commits };
}

//
// Release work: four lanes. A blame view is in progress on one branch while two others are merged
// past it, so each merge's curve crosses the lanes between, and a branch that started lower down
// crosses the blame branch on its way back to main. One commit has a long title and a description
// of several paragraphs and a list.
//
export const releaseHistory: IHistory = buildHistory("graft-desktop", "main", 4, [
    {
        id: "blame-wip",
        title: "WIP: blame view",
        author: jo,
        date: "2026-11-15T17:20:00Z",
        refs: ["feature/blame"],
        parents: ["blame-gutter"],
        graph: on(2, { joinsAbove: false }),
        files: [change("frontend/src/pages/blame/index.tsx", "M", 12, ["     return (", "-        <p>Blame view</p>", "+        <BlameGutter lines={lines} />"])],
    },
    {
        id: "merge-diff-colours",
        title: "Merge branch 'feature/diff-colours'",
        author: ash,
        date: "2026-11-15T16:05:00Z",
        refs: ["HEAD -> main", "origin/main"],
        parents: ["merge-stash-list", "removed-lines"],
        graph: on(1, { joinsAbove: false, through: [2], startsHere: [3] }),
        files: [],
    },
    {
        id: "removed-lines",
        title: "Colour removed lines in the diff view, and keep the colours readable in both themes when a line is selected or hovered",
        description: [
            "Removed lines now sit on the diff removed colour with their marker in the removed line colour, matching added lines.",
            "The colours come from the role tokens, so they follow the light and dark themes. Selecting or hovering a line no longer replaces its colour: the hover background is mixed in instead, so a removed line stays red while the pointer is on it.",
            "Also in this commit:\n- The marker column is a fixed width, so the code lines up whatever the marker.\n- Word-level changes are left for a later commit.",
        ].join("\n\n"),
        author: rin,
        date: "2026-11-15T11:40:00Z",
        refs: ["origin/feature/diff-colours"],
        parents: ["added-lines"],
        graph: on(3, { through: [1, 2] }),
        files: [
            change("frontend/src/components/diff-view.tsx", "M", 41, ["   const style = lineStyles[line.kind];", "-  const background = line.kind === \"deleted\" ? \"\" : style.background;", "+  const background = style.background;", "+  const markerColour = style.markerColour;", "   return ("]),
            change("frontend/src/components/diff-view.test.tsx", "M", 18, ["   it(\"colours added lines\", () => {", "+  it(\"colours removed lines\", () => {", "+      expect(renderLine(\"-a\").background).toBe(\"var(--color-diff-removed)\");", "+  });"]),
        ],
    },
    {
        id: "blame-gutter",
        title: "Fix the blame gutter width",
        author: jo,
        date: "2026-11-14T15:12:00Z",
        parents: ["blame-skeleton"],
        graph: on(2, { through: [1, 3] }),
        files: [change("frontend/src/pages/blame/components/blame-gutter.tsx", "M", 8, ["   return (", "-      <div style={{ width: 120 }}>", "+      <div style={{ width: \"calc(var(--space-8) * 4)\" }}>"])],
    },
    {
        id: "added-lines",
        title: "Colour added lines in the diff view",
        author: rin,
        date: "2026-11-14T10:02:00Z",
        parents: ["bump-version"],
        graph: on(3, { through: [1, 2] }),
        files: [change("frontend/src/components/diff-view.tsx", "M", 41, ["   const style = lineStyles[line.kind];", "+  const background = line.kind === \"deleted\" ? \"\" : style.background;", "   return ("])],
    },
    {
        id: "merge-stash-list",
        title: "Merge branch 'feature/stash-list'",
        author: ash,
        date: "2026-11-13T18:30:00Z",
        parents: ["bump-version", "list-stashes"],
        graph: on(1, { through: [2, 3], startsHere: [4] }),
        files: [],
    },
    {
        id: "list-stashes",
        title: "List the stashes in the sidebar",
        author: sam,
        date: "2026-11-13T12:15:00Z",
        parents: ["stash-tree"],
        graph: on(4, { through: [1, 2, 3] }),
        files: [change("frontend/src/components/left-sidebar.tsx", "M", 64, ["           <BranchList />", "+          <StashList stashes={stashes} />", "       </nav>"])],
    },
    {
        id: "bump-version",
        title: "Bump the version to 0.4.0",
        author: ash,
        date: "2026-11-12T09:00:00Z",
        refs: ["tag: v0.4.0-beta"],
        parents: ["tidy-status-bar"],
        graph: on(1, { through: [2, 4], endsHere: [3] }),
        files: [change("package.json", "M", 3, ["   \"name\": \"graft\",", "-  \"version\": \"0.3.0\",", "+  \"version\": \"0.4.0\","])],
    },
    {
        id: "blame-skeleton",
        title: "Add the blame view skeleton",
        author: jo,
        date: "2026-11-11T14:44:00Z",
        parents: ["tidy-status-bar"],
        graph: on(2, { through: [1, 4] }),
        files: [change("frontend/src/pages/blame/index.tsx", "A", 1, ["+export function BlamePage(): JSX.Element {", "+    return (", "+        <p>Blame view</p>", "+    );", "+}"])],
    },
    {
        id: "stash-tree",
        title: "Stash the working tree",
        author: sam,
        date: "2026-11-11T10:20:00Z",
        parents: ["tidy-status-bar"],
        graph: on(4, { through: [1, 2] }),
        files: [change("backend/src/tasks/stash-task.zig", "A", 1, ["+pub fn run(args: Args) !Result {", "+    return git.run(args.repo_path, &.{ \"stash\", \"push\" });", "+}"])],
    },
    {
        id: "tidy-status-bar",
        title: "Tidy the status bar",
        author: ash,
        date: "2026-11-10T16:00:00Z",
        parents: ["release-0-3"],
        graph: on(1, { endsHere: [2, 4] }),
        files: [change("frontend/src/components/status-bar.tsx", "M", 22, ["       <span>{branch}</span>", "-      <span>|</span>", "       <span>{aheadBehind}</span>"])],
    },
    {
        id: "release-0-3",
        title: "Release 0.3.0",
        author: ash,
        date: "2026-11-09T12:00:00Z",
        refs: ["tag: v0.3.0"],
        parents: [],
        graph: on(1, { joinsBelow: false }),
        files: [change("CHANGELOG.md", "M", 1, ["+## 0.3.0", "+", "+- The file pane shows a changed file's diff.", " ## 0.2.0"])],
    },
]);

//
// A long-running branch: a settings branch takes main's changes part way through with a merge of
// its own, while a hotfix leaves main and returns, its curves crossing the settings lane, before
// main takes the finished branch.
//
export const longBranchHistory: IHistory = buildHistory("graft-settings", "main", 3, [
    {
        id: "merge-settings",
        title: "Merge branch 'feature/settings'",
        author: ash,
        date: "2026-10-30T17:00:00Z",
        refs: ["HEAD -> main"],
        parents: ["fix-zoom", "merge-main-into-settings"],
        graph: on(1, { joinsAbove: false, startsHere: [2] }),
        files: [],
    },
    {
        id: "merge-main-into-settings",
        title: "Merge branch 'main' into feature/settings",
        author: sam,
        date: "2026-10-29T15:30:00Z",
        refs: ["origin/feature/settings"],
        parents: ["save-theme", "fix-zoom"],
        graph: on(2, { through: [1], startsHere: [1] }),
        files: [],
    },
    {
        id: "fix-zoom",
        title: "Fix the zoom shortcut on macOS",
        author: jo,
        date: "2026-10-29T10:10:00Z",
        parents: ["merge-hotfix"],
        graph: on(1, { through: [2] }),
        files: [change("backend/src/lib/actions.zig", "M", 44, ["         .label = \"Zoom In\",", "-        .shortcut = \"Ctrl+Plus\",", "+        .shortcut = \"CmdOrCtrl+Plus\","])],
    },
    {
        id: "save-theme",
        title: "Save the theme setting",
        author: sam,
        date: "2026-10-28T13:45:00Z",
        parents: ["settings-page"],
        graph: on(2, { through: [1] }),
        files: [change("frontend/src/lib/theme.ts", "M", 30, ["   setTheme(theme);", "+  saveConfig({ theme });"])],
    },
    {
        id: "merge-hotfix",
        title: "Merge branch 'hotfix/empty-repo'",
        author: ash,
        date: "2026-10-27T18:05:00Z",
        refs: ["tag: v0.2.1"],
        parents: ["release-0-2", "empty-repo"],
        graph: on(1, { through: [2], startsHere: [3] }),
        files: [],
    },
    {
        id: "empty-repo",
        title: "Handle a repo with no commits",
        author: rin,
        date: "2026-10-27T11:20:00Z",
        parents: ["release-0-2"],
        graph: on(3, { through: [1, 2] }),
        files: [change("frontend/src/pages/commits/index.tsx", "M", 47, ["     if (commits.length === 0) {", "+        return <p>This repo has no commits yet.</p>;", "     }"])],
    },
    {
        id: "settings-page",
        title: "Add the settings page",
        author: sam,
        date: "2026-10-26T09:30:00Z",
        parents: ["release-0-2"],
        graph: on(2, { through: [1, 3] }),
        files: [change("frontend/src/pages/settings/index.tsx", "A", 1, ["+export function SettingsPage(): JSX.Element {", "+    return <ThemeMenu />;", "+}"])],
    },
    {
        id: "release-0-2",
        title: "Release 0.2.0",
        author: ash,
        date: "2026-10-25T12:00:00Z",
        refs: ["tag: v0.2.0"],
        parents: ["read-config"],
        graph: on(1, { endsHere: [2, 3] }),
        files: [change("CHANGELOG.md", "M", 1, ["+## 0.2.0", "+", "+- Opens a repo from the File menu.", " ## 0.1.0"])],
    },
    {
        id: "read-config",
        title: "Read the config file",
        author: ash,
        date: "2026-10-24T10:00:00Z",
        parents: [],
        graph: on(1, { joinsBelow: false }),
        files: [change("backend/src/lib/config.zig", "A", 1, ["+pub fn read(path: []const u8) !Config {", "+    return toml.parse(Config, try std.fs.cwd().readFileAlloc(path));", "+}"])],
    },
]);
