//
// The table page: the commit list as a table, built from MUI's Table parts, with a header row,
// rows that highlight under the pointer and a selected row.
//

import { useState, type ReactNode } from "react";
import Paper from "@mui/material/Paper";
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
// Renders the commit table with the second commit selected. Clicking a row selects it. On a
// narrow screen the table scrolls sideways inside its frame.
//
export function CommitTable({ isEmpty = false }: { isEmpty?: boolean }): ReactNode {
    const [selectedHash, setSelectedHash] = useState("e4f5a6b");

    return (
        <TableContainer component={Paper} variant="outlined">
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
                    {isEmpty ? (
                        <TableRow>
                            <TableCell colSpan={4} sx={{ color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-6)" }}>
                                No commits match the filter.
                            </TableCell>
                        </TableRow>
                    ) : (
                        commits.map(commit => (
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

//
// Renders one section per state of the table, each shown in the themes of the current mode.
//
export function TablePage(): ReactNode {
    return (
        <div>
            <Section
                title="Commit table"
                description="A header row in muted text, then one row per commit. The selected row has the selected background and the row under the pointer has the hover background. Click a row to select it."
            >
                <CommitTable />
            </Section>

            <Section title="Empty" description="A table with no rows says why, in muted text, where the rows would be.">
                <CommitTable isEmpty />
            </Section>
        </div>
    );
}
