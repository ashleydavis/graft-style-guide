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
    // The commit's row of the commit graph, absent to have it worked out from the parents.
    //
    graph?: ILaneShape;

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
// One commit for the graph layout: its id and the ids of its parents.
//
export interface ILayoutCommit {
    //
    // The commit's id.
    //
    id: string;

    //
    // The ids of its parents, first parent first.
    //
    parents: string[];
}

//
// Works out each commit's row of the commit graph from the parents, for commits listed newest
// first. Each column of the graph waits for one commit, the next one down its line. A commit
// takes the leftmost column waiting for it, or the leftmost free column when none is, as a branch
// tip does; any other column waiting for it ends in a curve into it. Its first parent continues in
// its own column. Each other parent of a merge curves out to the column already waiting for that
// parent, or to the leftmost free column. Columns not waiting for the commit pass through its row.
// Columns are numbered from 1, as lanes are. A commit that the newest commit, HEAD, cannot reach
// through its parents is on a branch not merged yet, and every line drawn down from it is dotted.
//
export function layoutGraph(commits: ILayoutCommit[]): ILaneShape[] {
    const parentsOf = new Map(commits.map(commit => [commit.id, commit.parents]));
    const merged = new Set<string>();
    const toVisit = commits.length > 0 ? [commits[0].id] : [];
    while (toVisit.length > 0) {
        const id = toVisit.pop() as string;
        if (!merged.has(id)) {
            merged.add(id);
            toVisit.push(...(parentsOf.get(id) ?? []));
        }
    }
    const columns: (string | undefined)[] = [];
    const dotted: boolean[] = [];
    function freeColumn(): number {
        const free = columns.indexOf(undefined);
        if (free >= 0) {
            return free;
        }
        columns.push(undefined);
        dotted.push(false);
        return columns.length - 1;
    }
    return commits.map(commit => {
        const isUnmerged = !merged.has(commit.id);
        const waiting = columns.flatMap((waitingFor, column) => (waitingFor === commit.id ? [column] : []));
        const own = waiting.length > 0 ? waiting[0] : freeColumn();
        const through = columns.flatMap((waitingFor, column) => (waitingFor !== undefined && !waiting.includes(column) ? [column] : []));
        const dottedAbove = waiting.length > 0 && dotted[own];
        const dottedLanes = [...through, ...waiting.slice(1)].filter(column => dotted[column]);
        for (const column of waiting) {
            columns[column] = undefined;
        }
        const [firstParent, ...otherParents] = commit.parents;
        columns[own] = firstParent;
        dotted[own] = isUnmerged;
        const startsHere: number[] = [];
        for (const parent of otherParents) {
            const existing = columns.indexOf(parent);
            const column = existing >= 0 ? existing : freeColumn();
            if (existing < 0) {
                dotted[column] = isUnmerged;
            }
            columns[column] = parent;
            startsHere.push(column);
        }
        while (columns.length > 0 && columns[columns.length - 1] === undefined) {
            columns.pop();
            dotted.pop();
        }
        return {
            lane: own + 1,
            joinsAbove: waiting.length > 0,
            joinsBelow: firstParent !== undefined,
            through: through.map(column => column + 1),
            endsHere: waiting.slice(1).map(column => column + 1),
            startsHere: startsHere.map(column => column + 1),
            dottedLanes: dottedLanes.map(column => column + 1),
            dottedAbove,
            dottedBelow: isUnmerged,
        };
    });
}

//
// Builds a history from its example commits: gives each commit its hash, turns each parent id into
// that parent's hash and, when any commit leaves its graph row out, works out every row from the
// parents. The graph is as wide as the widest row needs.
//
function buildHistory(name: string, branch: string, examples: IExampleCommit[]): IHistory {
    const hashes = new Map(examples.map(example => [example.id, exampleHash(`${name}/${example.id}`)]));
    function hashOf(id: string): string {
        const hash = hashes.get(id);
        if (!hash) {
            throw new Error(`The example history ${name} names a parent ${id} that it does not list. Each parent must be one of the history's own commits, so look at the commit that names it.`);
        }
        return hash;
    }
    const graphs = examples.every(example => example.graph) ? examples.map(example => example.graph as ILaneShape) : layoutGraph(examples);
    const laneCount = Math.max(...graphs.map(graph => Math.max(graph.lane, ...graph.through, ...graph.endsHere, ...graph.startsHere)));
    const commits: ICommit[] = examples.map((example, index) => ({
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
        graph: graphs[index],
    }));
    return { name, branch, laneCount, commits };
}

//
// Release work: four lanes. A blame view is in progress on one branch while two others are merged
// past it, so each merge's curve crosses the lanes between, and a branch that started lower down
// crosses the blame branch on its way back to main. One commit has a long title and a description
// of several paragraphs and a list.
//
export const releaseHistory: IHistory = buildHistory("graft-desktop", "main", [
    {
        id: "blame-wip",
        title: "WIP: blame view",
        author: jo,
        date: "2026-11-15T17:20:00Z",
        refs: ["feature/blame"],
        parents: ["blame-gutter"],
        graph: on(2, { joinsAbove: false, dottedBelow: true }),
        files: [change("frontend/src/pages/blame/index.tsx", "M", 12, ["     return (", "-        <p>Blame view</p>", "+        <BlameGutter lines={lines} />"])],
    },
    {
        id: "merge-diff-colours",
        title: "Merge branch 'feature/diff-colours'",
        author: ash,
        date: "2026-11-15T16:05:00Z",
        refs: ["HEAD -> main", "origin/main"],
        parents: ["merge-stash-list", "removed-lines"],
        graph: on(1, { joinsAbove: false, through: [2], startsHere: [3], dottedLanes: [2] }),
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
        graph: on(3, { through: [1, 2], dottedLanes: [2] }),
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
        graph: on(2, { through: [1, 3], dottedAbove: true, dottedBelow: true }),
        files: [change("frontend/src/pages/blame/components/blame-gutter.tsx", "M", 8, ["   return (", "-      <div style={{ width: 120 }}>", "+      <div style={{ width: \"calc(var(--space-8) * 4)\" }}>"])],
    },
    {
        id: "added-lines",
        title: "Colour added lines in the diff view",
        author: rin,
        date: "2026-11-14T10:02:00Z",
        parents: ["bump-version"],
        graph: on(3, { through: [1, 2], dottedLanes: [2] }),
        files: [change("frontend/src/components/diff-view.tsx", "M", 41, ["   const style = lineStyles[line.kind];", "+  const background = line.kind === \"deleted\" ? \"\" : style.background;", "   return ("])],
    },
    {
        id: "merge-stash-list",
        title: "Merge branch 'feature/stash-list'",
        author: ash,
        date: "2026-11-13T18:30:00Z",
        parents: ["bump-version", "list-stashes"],
        graph: on(1, { through: [2, 3], startsHere: [4], dottedLanes: [2] }),
        files: [],
    },
    {
        id: "list-stashes",
        title: "List the stashes in the sidebar",
        author: sam,
        date: "2026-11-13T12:15:00Z",
        parents: ["stash-tree"],
        graph: on(4, { through: [1, 2, 3], dottedLanes: [2] }),
        files: [change("frontend/src/components/left-sidebar.tsx", "M", 64, ["           <BranchList />", "+          <StashList stashes={stashes} />", "       </nav>"])],
    },
    {
        id: "bump-version",
        title: "Bump the version to 0.4.0",
        author: ash,
        date: "2026-11-12T09:00:00Z",
        refs: ["tag: v0.4.0-beta"],
        parents: ["tidy-status-bar"],
        graph: on(1, { through: [2, 4], endsHere: [3], dottedLanes: [2] }),
        files: [change("package.json", "M", 3, ["   \"name\": \"graft\",", "-  \"version\": \"0.3.0\",", "+  \"version\": \"0.4.0\","])],
    },
    {
        id: "blame-skeleton",
        title: "Add the blame view skeleton",
        author: jo,
        date: "2026-11-11T14:44:00Z",
        parents: ["tidy-status-bar"],
        graph: on(2, { through: [1, 4], dottedAbove: true, dottedBelow: true }),
        files: [change("frontend/src/pages/blame/index.tsx", "A", 1, ["+export function BlamePage(): JSX.Element {", "+    return (", "+        <p>Blame view</p>", "+    );", "+}"])],
    },
    {
        id: "stash-tree",
        title: "Stash the working tree",
        author: sam,
        date: "2026-11-11T10:20:00Z",
        parents: ["tidy-status-bar"],
        graph: on(4, { through: [1, 2], dottedLanes: [2] }),
        files: [change("backend/src/tasks/stash-task.zig", "A", 1, ["+pub fn run(args: Args) !Result {", "+    return git.run(args.repo_path, &.{ \"stash\", \"push\" });", "+}"])],
    },
    {
        id: "tidy-status-bar",
        title: "Tidy the status bar",
        author: ash,
        date: "2026-11-10T16:00:00Z",
        parents: ["release-0-3"],
        graph: on(1, { endsHere: [2, 4], dottedLanes: [2] }),
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
// Returns a changed file with one line added after line `line` of `path`, for the commits of the
// long-running branch, whose changes are small.
//
function addLine(path: string, line: number, before: string, added: string): IChangedFile {
    return change(path, "M", line, [` ${before}`, `+${added}`]);
}

//
// A long-running branch: a settings branch runs beside main for its whole history, takes main's
// changes twice with merges of its own and grows a themes branch that merges back into it, while
// a commit graph branch, two hotfixes and a zoom branch leave main and return around it. Its graph
// is worked out from the parents, so the lanes shift and cross as branches start and end.
//
export const longBranchHistory: IHistory = buildHistory("graft-settings", "main", [
    { id: "merge-settings", title: "Merge branch 'feature/settings'", author: ash, date: "2026-10-31T17:00:00Z", refs: ["HEAD -> main"], parents: ["merge-zoom", "polish-settings"], files: [] },
    { id: "polish-settings", title: "Polish the settings layout", author: sam, date: "2026-10-31T11:00:00Z", refs: ["origin/feature/settings"], parents: ["merge-themes"], files: [addLine("frontend/src/pages/settings/index.tsx", 14, "<Stack gap={2}>", "    <Divider />")] },
    { id: "merge-zoom", title: "Merge branch 'feature/zoom'", author: ash, date: "2026-10-30T18:00:00Z", parents: ["merge-crlf", "remember-zoom"], files: [] },
    { id: "merge-themes", title: "Merge branch 'feature/themes' into feature/settings", author: sam, date: "2026-10-30T16:20:00Z", parents: ["merge-main-2", "high-contrast"], files: [] },
    { id: "remember-zoom", title: "Remember the zoom level", author: jo, date: "2026-10-30T12:10:00Z", refs: ["origin/feature/zoom"], parents: ["wheel-zoom"], files: [addLine("frontend/src/lib/zoom.ts", 22, "setZoom(level);", "saveState({ zoom: level });")] },
    { id: "high-contrast", title: "Add the high-contrast theme", author: rin, date: "2026-10-30T10:30:00Z", refs: ["feature/themes"], parents: ["theme-menu"], files: [addLine("frontend/src/lib/theme.ts", 8, "export const themes = [", "    \"high-contrast\",")] },
    { id: "merge-crlf", title: "Merge branch 'hotfix/crlf'", author: ash, date: "2026-10-29T17:45:00Z", refs: ["tag: v0.2.3"], parents: ["document-settings", "keep-crlf"], files: [] },
    { id: "merge-main-2", title: "Merge branch 'main' into feature/settings", author: sam, date: "2026-10-29T15:00:00Z", parents: ["font-size", "document-settings"], files: [] },
    { id: "keep-crlf", title: "Keep CRLF line endings in diffs", author: rin, date: "2026-10-29T11:20:00Z", parents: ["document-settings"], files: [addLine("backend/src/tasks/file-diff-task.zig", 18, "const argv = &.{ \"diff-tree\", \"-r\", \"-p\" };", "    // Leave CRLF as Git wrote it.")] },
    { id: "wheel-zoom", title: "Zoom with Ctrl and the scroll wheel", author: jo, date: "2026-10-28T16:40:00Z", parents: ["zoom-in-out"], files: [addLine("frontend/src/lib/zoom.ts", 30, "window.addEventListener(\"keydown\", onKey);", "window.addEventListener(\"wheel\", onWheel);")] },
    { id: "theme-menu", title: "Pick the theme from a menu", author: rin, date: "2026-10-28T14:00:00Z", parents: ["theme-colours"], files: [addLine("frontend/src/components/theme-menu.tsx", 12, "<Menu>", "    {themes.map(theme => <MenuItem key={theme}>{theme}</MenuItem>)}")] },
    { id: "document-settings", title: "Document the settings file", author: ash, date: "2026-10-28T10:00:00Z", parents: ["merge-empty-repo"], files: [addLine("docs/user-guide.md", 40, "## Settings", "Graft keeps its settings in config.toml.")] },
    { id: "font-size", title: "Save the font size", author: sam, date: "2026-10-27T17:30:00Z", parents: ["merge-main-1"], files: [addLine("frontend/src/pages/settings/index.tsx", 30, "saveConfig({ theme });", "saveConfig({ fontSize });")] },
    { id: "zoom-in-out", title: "Add zoom in and out", author: jo, date: "2026-10-27T15:15:00Z", parents: ["merge-empty-repo"], files: [addLine("backend/src/lib/actions.zig", 44, ".label = \"Zoom In\",", "    .shortcut = \"CmdOrCtrl+Plus\",")] },
    { id: "theme-colours", title: "Read the theme colours from the config", author: rin, date: "2026-10-27T11:00:00Z", parents: ["save-theme"], files: [addLine("frontend/src/lib/theme.ts", 16, "const config = readConfig();", "const colours = config.theme;")] },
    { id: "merge-empty-repo", title: "Merge branch 'hotfix/empty-repo'", author: ash, date: "2026-10-26T18:00:00Z", refs: ["tag: v0.2.2"], parents: ["ci-windows", "empty-repo-message"], files: [] },
    { id: "merge-main-1", title: "Merge branch 'main' into feature/settings", author: sam, date: "2026-10-26T16:00:00Z", parents: ["save-theme", "ci-windows"], files: [] },
    { id: "empty-repo-message", title: "Show a message for a repo with no commits", author: rin, date: "2026-10-26T12:30:00Z", parents: ["empty-repo"], files: [addLine("frontend/src/pages/commits/index.tsx", 48, "if (commits.length === 0) {", "    return <p>This repo has no commits yet.</p>;")] },
    { id: "save-theme", title: "Save the theme setting", author: sam, date: "2026-10-25T17:00:00Z", parents: ["settings-page"], files: [addLine("frontend/src/lib/theme.ts", 30, "setTheme(theme);", "saveConfig({ theme });")] },
    { id: "empty-repo", title: "Handle a repo with no commits", author: rin, date: "2026-10-25T13:10:00Z", parents: ["ci-windows"], files: [addLine("backend/src/tasks/commits-task.zig", 52, "const output = try git.run(args.repo_path, argv);", "if (output.exit_code == 128) return .{ .commits = &.{} };")] },
    { id: "ci-windows", title: "Run the tests on Windows in CI", author: ash, date: "2026-10-24T16:00:00Z", parents: ["release-0-2"], files: [addLine(".github/workflows/test.yml", 9, "os: [ubuntu-latest, macos-latest]", "        - windows-latest")] },
    { id: "settings-page", title: "Add the settings page", author: sam, date: "2026-10-24T11:40:00Z", parents: ["read-config"], files: [change("frontend/src/pages/settings/index.tsx", "A", 1, ["+export function SettingsPage(): JSX.Element {", "+    return <ThemeMenu />;", "+}"])] },
    { id: "read-config", title: "Read the config file", author: sam, date: "2026-10-23T15:20:00Z", parents: ["start-settings"], files: [change("backend/src/lib/config.zig", "A", 1, ["+pub fn read(path: []const u8) !Config {", "+    return toml.parse(Config, try std.fs.cwd().readFileAlloc(path));", "+}"])] },
    { id: "release-0-2", title: "Release 0.2.0", author: ash, date: "2026-10-23T12:00:00Z", refs: ["tag: v0.2.0"], parents: ["merge-graph"], files: [change("CHANGELOG.md", "M", 1, ["+## 0.2.0", "+", "+- The commit list draws the commit graph.", " ## 0.1.0"])] },
    { id: "start-settings", title: "Start the settings branch with a config type", author: sam, date: "2026-10-22T16:00:00Z", parents: ["merge-graph"], files: [change("backend/src/lib/config-type.zig", "A", 1, ["+pub const Config = struct {", "+    theme: []const u8 = \"system\",", "+};"])] },
    { id: "merge-graph", title: "Merge branch 'feature/graph'", author: ash, date: "2026-10-22T10:00:00Z", parents: ["open-repo", "curve-lanes"], files: [] },
    { id: "curve-lanes", title: "Curve the lanes where branches merge", author: jo, date: "2026-10-21T15:30:00Z", parents: ["draw-graph"], files: [addLine("frontend/src/components/graph-row.tsx", 60, "{row.endsHere.map(lane => (", "    <path d={curve(lane)} />")] },
    { id: "draw-graph", title: "Draw the commit graph", author: jo, date: "2026-10-20T14:00:00Z", parents: ["open-repo"], files: [change("frontend/src/components/graph-row.tsx", "A", 1, ["+export function GraphRow({ row }: IGraphRowProps): JSX.Element {", "+    return <svg>{row.lanes.map(drawLane)}</svg>;", "+}"])] },
    { id: "open-repo", title: "Open a repo from the File menu", author: ash, date: "2026-10-19T12:00:00Z", parents: ["initial"], files: [addLine("backend/src/lib/actions.zig", 28, ".name = \"open-repo\",", "    .shortcut = \"CmdOrCtrl+O\",")] },
    { id: "initial", title: "Initial commit", author: ash, date: "2026-10-18T09:00:00Z", refs: ["tag: v0.1.0"], parents: [], files: [change("README.md", "A", 1, ["+# Graft", "+", "+A desktop Git client with a simple, intuitive UI."])] },
]);
