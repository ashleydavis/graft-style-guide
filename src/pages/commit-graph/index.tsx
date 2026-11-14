//
// The commit graph page: the graph lanes of a commit list in the shapes a history takes, from a
// straight line of commits to several branches at once, in every lane colour.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { GraphRow, type IGraphRow } from "./components/graph-row";

//
// One history to draw.
//
interface IGraphExample {
    //
    // The heading of the example's section.
    //
    title: string;

    //
    // What the history shows.
    //
    description: string;

    //
    // How many lanes the graph is wide.
    //
    laneCount: number;

    //
    // The commits, newest first.
    //
    rows: IGraphRow[];
}

//
// Returns a row for a commit on `lane`, joined to the rows above and below unless `options`
// says otherwise, with no other lanes or curves unless `options` names them.
//
function commit(message: string, hash: string, lane: number, options: Partial<IGraphRow> = {}): IGraphRow {
    return {
        message,
        hash,
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
// The histories shown on the page, in order.
//
const examples: IGraphExample[] = [
    {
        title: "Straight history",
        description: "One branch, each commit on top of the last.",
        laneCount: 1,
        rows: [
            commit("Updated the readme", "a1b2c3d", 1, { joinsAbove: false }),
            commit("Fixed the fetch progress", "e4f5a6b", 1),
            commit("Added the status bar", "c7d8e9f", 1),
            commit("Initial commit", "0a1b2c3", 1, { joinsBelow: false }),
        ],
    },
    {
        title: "Feature branch merged",
        description: "A branch leaves main, gets two commits and is merged back.",
        laneCount: 2,
        rows: [
            commit("Merged feature/diffs", "f1e2d3c", 1, { joinsAbove: false, startsHere: [2] }),
            commit("Coloured the diff lines", "b4a5968", 2, { through: [1] }),
            commit("Added side-by-side diffs", "7d6c5b4", 2, { through: [1] }),
            commit("Fixed the merge base lookup", "e4f5a6b", 1, { endsHere: [2] }),
            commit("Initial commit", "0a1b2c3", 1, { joinsBelow: false }),
        ],
    },
    {
        title: "Branch not merged yet",
        description: "A branch with work in progress above main's latest commit.",
        laneCount: 2,
        rows: [
            commit("Started the blame view", "9f8e7d6", 2, { joinsAbove: false }),
            commit("Updated the readme", "a1b2c3d", 1, { joinsAbove: false, through: [2] }),
            commit("Fixed the fetch progress", "e4f5a6b", 1, { endsHere: [2] }),
            commit("Initial commit", "0a1b2c3", 1, { joinsBelow: false }),
        ],
    },
    {
        title: "Two branches at once",
        description: "Two branches in progress side by side. One is merged and the other is still open.",
        laneCount: 3,
        rows: [
            commit("Added the stash list", "5e6f7a8", 3, { joinsAbove: false }),
            commit("Merged feature/graph", "f1e2d3c", 1, { joinsAbove: false, through: [3], startsHere: [2] }),
            commit("Drew the lane curves", "1a2b3c4", 2, { through: [1, 3] }),
            commit("Listed the stashes", "4d5e6f7", 3, { through: [1, 2] }),
            commit("Fixed the status bar", "c7d8e9f", 1, { through: [2, 3] }),
            commit("Split the panels", "8a9b0c1", 1, { through: [3], endsHere: [2] }),
            commit("Release 1.0", "2b3c4d5", 1, { joinsBelow: false, endsHere: [3] }),
        ],
    },
    {
        title: "Every lane colour",
        description: "Six branches at once, one commit on each, so every lane colour shows next to the others.",
        laneCount: 6,
        rows: [1, 2, 3, 4, 5, 6].map(lane =>
            commit(`Commit on lane ${lane}`, `${lane}a${lane}b${lane}c${lane}`, lane, {
                through: [1, 2, 3, 4, 5, 6].filter(other => other !== lane),
            }),
        ),
    },
];

//
// Renders one section per history, each graph on a panel like Graft's commit list.
//
export function CommitGraphPage(): ReactNode {
    return (
        <div>
            {examples.map(example => (
                <Section key={example.title} title={example.title} description={example.description}>
                    <div
                        data-graph={example.title}
                        style={{
                            maxWidth: "560px",
                            background: "var(--color-panel)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-lg)",
                            overflow: "hidden",
                        }}
                    >
                        {example.rows.map(row => (
                            <GraphRow key={row.hash} row={row} laneCount={example.laneCount} />
                        ))}
                    </div>
                </Section>
            ))}
        </div>
    );
}
