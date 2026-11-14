//
// The commit explorer page: Graft's commit explorer, shown with nothing open, with a commit open
// and with a changed file open. Each one works: click and use the keys to move through it.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { CommitExplorer } from "./components/commit-explorer";
import { graftHistory } from "./data";
import { longBranchHistory, releaseHistory } from "./histories";

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
                description="The commits newest first, with their refs, author, date and short hash. Click a commit, or select one with the arrow keys and press Enter, to open it. The active pane, the one the keys act on, has an accent border."
            >
                <CommitExplorer />
            </Section>

            <Section
                title="A commit open"
                description="The commit's details open to the right: its message, who wrote it and when, its hash and parents and the files it changed with their line counts. The open commit has an accent bar."
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
                description="The changed file's diff opens to the right, with old and new line numbers, added lines on the added colour and deleted lines on the deleted colour. Escape closes the rightmost pane."
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
                title="Several branches at once"
                description="Four lanes. A blame view is in progress on its own branch while two other branches are merged past it, so each merge's curve crosses the lanes between, and the stash branch crosses the blame branch on its way back to main. The open commit has a long title, cut short in the list and wrapped in full in its details, and a description of several paragraphs and a list."
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
                title="A long-running branch"
                description="A settings branch takes main's changes part way through with a merge of its own, while a hotfix leaves main and comes back, its curves crossing the settings lane, before main takes the finished branch."
            >
                <CommitExplorer history={longBranchHistory} />
            </Section>
        </div>
    );
}
