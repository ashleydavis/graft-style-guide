//
// The example repository the commit explorer shows: its path, its commits newest first, the files
// each commit changed and each file's diff, as Git would report them for a small Git client.
//

//
// One file a commit changed.
//
export interface IChangedFile {
    //
    // The file's path from the root of the repository.
    //
    path: string;

    //
    // How the commit changed the file, as Git's one-letter status: A added, M modified or D
    // deleted.
    //
    status: "A" | "M" | "D";

    //
    // The lines the commit added to the file.
    //
    linesAdded: number;

    //
    // The lines the commit deleted from the file.
    //
    linesDeleted: number;

    //
    // The file's diff in the commit, as `git diff-tree -p` writes it from the first `@@` line.
    //
    diff: string;
}

//
// One commit of the example repository.
//
export interface ICommit {
    //
    // The full commit hash.
    //
    hash: string;

    //
    // The first line of the message.
    //
    title: string;

    //
    // The rest of the message, empty for a one-line message.
    //
    description: string;

    //
    // The branches, tags and HEAD that point at the commit, as `git log` names them.
    //
    refs: string[];

    //
    // Who wrote the change.
    //
    authorName: string;

    //
    // The author's email address.
    //
    authorEmail: string;

    //
    // When the change was written.
    //
    authorDate: Date;

    //
    // Who made the commit.
    //
    committerName: string;

    //
    // The committer's email address.
    //
    committerEmail: string;

    //
    // When the commit was made.
    //
    committerDate: Date;

    //
    // The hashes of the commit's parents: none for the first commit, two for a merge.
    //
    parentHashes: string[];

    //
    // The files the commit changed, in the order Git lists them.
    //
    files: IChangedFile[];
}

//
// The path of the example repository, as the `cd` into it shows it.
//
export const repoPath = "~/projects/graft";

//
// The example commits, newest first.
//
export const commits: ICommit[] = [
    {
        hash: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
        title: "Show the Git commands each page runs",
        description: "The help panel in the right sidebar lists the commands, newest first, each with a button that copies it.",
        refs: ["HEAD -> main", "origin/main"],
        authorName: "Ash Davis",
        authorEmail: "ash@example.com",
        authorDate: new Date("2026-11-14T16:42:10Z"),
        committerName: "Ash Davis",
        committerEmail: "ash@example.com",
        committerDate: new Date("2026-11-14T16:42:10Z"),
        parentHashes: ["e4f5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d"],
        files: [
            {
                path: "frontend/src/components/git-commands-panel.tsx",
                status: "A",
                linesAdded: 9,
                linesDeleted: 0,
                diff: [
                    "@@ -0,0 +1,9 @@",
                    "+export function GitCommandsPanel({ pageCommands }: IGitCommandsPanelProps): JSX.Element {",
                    "+    return (",
                    "+        <section className=\"flex flex-col gap-2 p-4\">",
                    "+            <h2>Git commands</h2>",
                    "+            {pageCommands === undefined && <p>This page has run no Git commands.</p>}",
                    "+            {pageCommands !== undefined && <CommandList commands={pageCommands.commands} />}",
                    "+        </section>",
                    "+    );",
                    "+}",
                ].join("\n"),
            },
            {
                path: "frontend/src/components/app-layout.tsx",
                status: "M",
                linesAdded: 3,
                linesDeleted: 1,
                diff: [
                    "@@ -161,7 +161,9 @@ export function AppLayout(): JSX.Element {",
                    "             <main className=\"min-w-0 flex-1 overflow-auto\">",
                    "                 <Outlet />",
                    "             </main>",
                    "-            <RightSidebar isOpen={isRightSidebarOpen} />",
                    "+            <RightSidebar isOpen={isRightSidebarOpen}>",
                    "+                <GitCommandsPanel pageCommands={pageGitCommands(history, location.pathname)} />",
                    "+            </RightSidebar>",
                    "         </div>",
                    "     );",
                    " }",
                ].join("\n"),
            },
        ],
    },
    {
        hash: "e4f5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d",
        title: "Move through the panes with the arrow keys",
        description: "Up and Down move the selection, Left and Right move between panes, Enter opens and Escape closes the rightmost pane, as in the column view of a file browser.",
        refs: [],
        authorName: "Sam Lee",
        authorEmail: "sam@example.com",
        authorDate: new Date("2026-11-13T10:05:44Z"),
        committerName: "Ash Davis",
        committerEmail: "ash@example.com",
        committerDate: new Date("2026-11-13T11:20:02Z"),
        parentHashes: ["c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90"],
        files: [
            {
                path: "frontend/src/lib/commit-explorer.ts",
                status: "M",
                linesAdded: 8,
                linesDeleted: 2,
                diff: [
                    "@@ -216,12 +216,17 @@ export function explorerStateAfterKey(state, key, items) {",
                    "     if (key === \"ArrowDown\") {",
                    "         return moveSelection(state, items, 1);",
                    "     }",
                    "-    if (key === \"Enter\") {",
                    "-        return openSelection(state);",
                    "+    if (key === \"ArrowLeft\") {",
                    "+        return { ...state, activePaneIndex: Math.max(state.activePaneIndex - 1, 0) };",
                    "+    }",
                    "+    if (key === \"ArrowRight\") {",
                    "+        return { ...state, activePaneIndex: Math.min(state.activePaneIndex + 1, openPaneCount(state) - 1) };",
                    "+    }",
                    "+    if (key === \"Enter\") {",
                    "+        return openSelection(state);",
                    "     }",
                    "     return state;",
                    " }",
                ].join("\n"),
            },
        ],
    },
    {
        hash: "c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90",
        title: "Merge branch 'feature/file-pane'",
        description: "",
        refs: ["tag: v0.3.0"],
        authorName: "Ash Davis",
        authorEmail: "ash@example.com",
        authorDate: new Date("2026-11-11T18:30:00Z"),
        committerName: "Ash Davis",
        committerEmail: "ash@example.com",
        committerDate: new Date("2026-11-11T18:30:00Z"),
        parentHashes: ["9f8e7d6c5b4a39281706f5e4d3c2b1a098765432", "b4a59687c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1"],
        files: [],
    },
    {
        hash: "b4a59687c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1",
        title: "Show a changed file's diff in the file pane",
        description: "Clicking a changed file opens its diff in a third column to the right of the commit.",
        refs: ["origin/feature/file-pane"],
        authorName: "Jo Park",
        authorEmail: "jo@example.com",
        authorDate: new Date("2026-11-10T14:12:31Z"),
        committerName: "Jo Park",
        committerEmail: "jo@example.com",
        committerDate: new Date("2026-11-10T14:12:31Z"),
        parentHashes: ["9f8e7d6c5b4a39281706f5e4d3c2b1a098765432"],
        files: [
            {
                path: "frontend/src/pages/commits/components/file-pane.tsx",
                status: "A",
                linesAdded: 6,
                linesDeleted: 0,
                diff: [
                    "@@ -0,0 +1,6 @@",
                    "+export function FilePane({ repoPath, hash, path, onClose }: IFilePaneProps): JSX.Element {",
                    "+    const diff = useFileDiff(repoPath, hash, path);",
                    "+    return (",
                    "+        <Pane title={path} onClose={onClose}><DiffView diff={diff} /></Pane>",
                    "+    );",
                    "+}",
                ].join("\n"),
            },
            {
                path: "backend/src/tasks/file-diff-task.zig",
                status: "A",
                linesAdded: 5,
                linesDeleted: 0,
                diff: [
                    "@@ -0,0 +1,5 @@",
                    "+pub fn run(args: Args) !Result {",
                    "+    const argv = &.{ \"diff-tree\", \"-r\", \"-p\", \"--root\", \"--no-commit-id\", args.hash, \"--\", args.path };",
                    "+    const output = try git.run(args.repo_path, argv);",
                    "+    return .{ .diff = output.stdout };",
                    "+}",
                ].join("\n"),
            },
            {
                path: "frontend/src/pages/commits/index.tsx",
                status: "M",
                linesAdded: 3,
                linesDeleted: 0,
                diff: [
                    "@@ -152,6 +152,9 @@ export function CommitColumns({ repoPath }: ICommitColumnsProps): JSX.Element {",
                    "                         onClose={() => setExplorer(closeCommitDetailsPane)}",
                    "                     />",
                    "                 )}",
                    "+                {explorer.openPath !== undefined && (",
                    "+                    <FilePane repoPath={repoPath} hash={explorer.openHash} path={explorer.openPath} />",
                    "+                )}",
                    "             </div>",
                    "         </main>",
                    "     );",
                ].join("\n"),
            },
        ],
    },
    {
        hash: "9f8e7d6c5b4a39281706f5e4d3c2b1a098765432",
        title: "Remove the old commit table",
        description: "The commit pane's list replaces it.",
        refs: [],
        authorName: "Sam Lee",
        authorEmail: "sam@example.com",
        authorDate: new Date("2026-11-08T09:48:15Z"),
        committerName: "Sam Lee",
        committerEmail: "sam@example.com",
        committerDate: new Date("2026-11-08T09:48:15Z"),
        parentHashes: ["8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b"],
        files: [
            {
                path: "frontend/src/pages/commits/components/commit-table.tsx",
                status: "D",
                linesAdded: 0,
                linesDeleted: 6,
                diff: [
                    "@@ -1,6 +0,0 @@",
                    "-export function CommitTable({ commits }: ICommitTableProps): JSX.Element {",
                    "-    return (",
                    "-        <table>",
                    "-            {commits.map(commit => <CommitRow key={commit.hash} commit={commit} />)}",
                    "-        </table>",
                    "-    );",
                ].join("\n"),
            },
        ],
    },
    {
        hash: "8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b",
        title: "Read the first page of commits with git log",
        description: "",
        refs: [],
        authorName: "Ash Davis",
        authorEmail: "ash@example.com",
        authorDate: new Date("2026-11-06T20:01:09Z"),
        committerName: "Ash Davis",
        committerEmail: "ash@example.com",
        committerDate: new Date("2026-11-06T20:01:09Z"),
        parentHashes: ["2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e"],
        files: [
            {
                path: "backend/src/tasks/commits-task.zig",
                status: "M",
                linesAdded: 2,
                linesDeleted: 1,
                diff: [
                    "@@ -40,5 +40,6 @@ pub fn run(args: Args) !Result {",
                    "     const page_size = args.page_size orelse 50;",
                    "-    const argv = &.{ \"log\", \"-z\" };",
                    "+    const max_count = try std.fmt.allocPrint(allocator, \"--max-count={d}\", .{page_size});",
                    "+    const argv = &.{ \"log\", \"-z\", max_count, format_arg };",
                    "     const output = try git.run(args.repo_path, argv);",
                    "     return parse_commits(output.stdout);",
                ].join("\n"),
            },
        ],
    },
    {
        hash: "2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e",
        title: "Initial commit",
        description: "",
        refs: ["tag: v0.1.0"],
        authorName: "Ash Davis",
        authorEmail: "ash@example.com",
        authorDate: new Date("2026-11-01T08:00:00Z"),
        committerName: "Ash Davis",
        committerEmail: "ash@example.com",
        committerDate: new Date("2026-11-01T08:00:00Z"),
        parentHashes: [],
        files: [
            {
                path: "README.md",
                status: "A",
                linesAdded: 3,
                linesDeleted: 0,
                diff: ["@@ -0,0 +1,3 @@", "+# Graft", "+", "+A desktop Git client with a simple, intuitive UI."].join("\n"),
            },
        ],
    },
];

//
// Returns the commit with the hash. The explorer opens only hashes it lists, so the commit is
// always there.
//
export function commitByHash(hash: string): ICommit {
    const commit = commits.find(candidate => candidate.hash === hash);
    if (!commit) {
        throw new Error(`The example repository has no commit ${hash}. The explorer opens only the hashes in its commit list, so look at where the hash came from.`);
    }
    return commit;
}

//
// Returns the file the commit changed at the path. The explorer opens only paths the commit lists,
// so the file is always there.
//
export function changedFile(hash: string, path: string): IChangedFile {
    const file = commitByHash(hash).files.find(candidate => candidate.path === path);
    if (!file) {
        throw new Error(`Commit ${hash} changed no file ${path}. The explorer opens only the paths in the commit's file list, so look at where the path came from.`);
    }
    return file;
}
