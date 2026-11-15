//
// The table page: the commit list as a table, built from MUI's Table parts, with a header row,
// rows that highlight under the pointer and a selected row.
//

import { useState, type ReactNode } from "react";
import Paper from "@mui/material/Paper";
import { FilterBox, matchesSearch } from "../../components/search-box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Section } from "../../components/section";

//
// The commits of the example table, newest first.
//
const commits = [
    {
        message: "Added the commit graph",
        author: "Ash",
        date: "2 hours ago",
        hash: "a1b2c3d",
    },
    {
        message: "Fixed the merge base lookup",
        author: "Sam",
        date: "Yesterday",
        hash: "e4f5a6b",
    },
    {
        message: "Merged feature/diffs",
        author: "Ash",
        date: "3 days ago",
        hash: "c7d8e9f",
    },
    {
        message: "Coloured the diff lines",
        author: "Jo",
        date: "Last week",
        hash: "b4a5968",
    },
];

//
// Renders the commit table with the second commit selected, under a filter box that starts with
// `initialFilter`. The table shows only the commits whose message, author or hash holds the
// filter's text, ignoring case, and says so when none does. Clicking a row selects it. On a narrow
// screen the table scrolls sideways inside its frame.
//
export function CommitTable({ initialFilter = "" }: { initialFilter?: string }): ReactNode {
    const [selectedHash, setSelectedHash] = useState("e4f5a6b");
    const [filter, setFilter] = useState(initialFilter);
    const shown = commits.filter(commit => [commit.message, commit.author, commit.hash].some(field => matchesSearch(field, filter)));

    return (
        <TableContainer component={Paper} variant="outlined">
            <div style={{ padding: "var(--space-2)", borderBottom: "1px solid var(--color-border)" }}>
                <FilterBox value={filter} onChange={setFilter} label="Filter the commits" placeholder="Filter by message, author or hash" />
            </div>
            <Table size="small" aria-label="Commits">
                <TableHead>
                    <TableRow>
                        <TableCell>Message</TableCell>
                        <TableCell>Author</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Hash</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {shown.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} sx={{ color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-6)" }}>
                                No commits match the filter.
                            </TableCell>
                        </TableRow>
                    ) : (
                        shown.map(commit => (
                            <TableRow
                                key={commit.hash}
                                hover
                                selected={commit.hash === selectedHash}
                                onClick={() => setSelectedHash(commit.hash)}
                                sx={{ cursor: "pointer" }}
                            >
                                <TableCell sx={{ whiteSpace: "nowrap" }}>{commit.message}</TableCell>
                                <TableCell sx={{ color: "var(--color-text-muted)" }}>{commit.author}</TableCell>
                                <TableCell sx={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{commit.date}</TableCell>
                                <TableCell sx={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                    {commit.hash}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export function TablePage(): ReactNode {
    return (
        <div>
            <Section
                title="Commit table"
                description="Commits in rows under a filter box."
            >
                <CommitTable />
            </Section>

            <Section title="Empty" description="A table whose filter matches nothing.">
                <CommitTable initialFilter="rebase" />
            </Section>
        </div>
    );
}
