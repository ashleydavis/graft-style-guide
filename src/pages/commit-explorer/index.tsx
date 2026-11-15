//
// The commit explorer page: Graft's commit explorer, shown with nothing open, with a commit open
// and with a changed file open. Each one works: click and use the keys to move through it.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { CommitExplorer } from "./components/commit-explorer";
import { graftHistory } from "./data";
import { longBranchHistory, nestedFoldersHistory, releaseHistory } from "./histories";

//
// The commit and file the second and third examples open: the newest commit and its first file.
//
const exampleCommit = graftHistory.commits[0];
const exampleFile = exampleCommit.files[0];

//
// Renders one section per starting state of the explorer, each shown in the themes of the current
// mode.
//
export function CommitExplorerPage(): ReactNode {
    return (
        <div>
            <Section
                title="Commit list"
                description="The commits newest first, with their refs, author, date and hash."
            >
                <CommitExplorer />
            </Section>

            <Section
                title="A commit open"
                description="A commit's details beside the list: its message, author, hash, parents and changed files."
            >
                <CommitExplorer
                    initialState={{
                        activePaneIndex: 1,
                        selectedHash: exampleCommit.hash,
                        openHash: exampleCommit.hash,
                        selectedPath: exampleFile.path,
                        openPath: undefined,
                    }}
                />
            </Section>

            <Section
                title="A file open"
                description="A changed file's diff beside the commit's details."
            >
                <CommitExplorer
                    initialState={{
                        activePaneIndex: 2,
                        selectedHash: exampleCommit.hash,
                        openHash: exampleCommit.hash,
                        selectedPath: exampleFile.path,
                        openPath: exampleFile.path,
                    }}
                />
            </Section>

            <Section
                title="A file with several changes"
                description="A file changed in three places."
            >
                <CommitExplorer
                    initialState={{
                        activePaneIndex: 2,
                        selectedHash: exampleCommit.hash,
                        openHash: exampleCommit.hash,
                        selectedPath: "frontend/src/lib/git-commands.ts",
                        openPath: "frontend/src/lib/git-commands.ts",
                    }}
                />
            </Section>

            <Section
                title="Several branches at once"
                description="Four lanes, with merges crossing between them and a commit with a long message."
            >
                <CommitExplorer
                    history={releaseHistory}
                    initialState={{
                        activePaneIndex: 1,
                        selectedHash: releaseHistory.commits[2].hash,
                        openHash: releaseHistory.commits[2].hash,
                        selectedPath: undefined,
                        openPath: undefined,
                    }}
                />
            </Section>

            <Section
                title="Directories inside directories"
                description="A commit whose files sit three and four directories deep, in the tree view."
            >
                <CommitExplorer
                    history={nestedFoldersHistory}
                    initialState={{
                        activePaneIndex: 1,
                        selectedHash: nestedFoldersHistory.commits[0].hash,
                        openHash: nestedFoldersHistory.commits[0].hash,
                        selectedPath: undefined,
                        openPath: undefined,
                    }}
                />
            </Section>

            <Section
                title="A long-running branch"
                description="Thirty commits on up to five lanes."
            >
                <CommitExplorer history={longBranchHistory} />
            </Section>
        </div>
    );
}
