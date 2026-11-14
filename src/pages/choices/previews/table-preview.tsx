//
// The preview for the table row choice: a commit table with a selected row in the style of
// each option. A has the divider between rows the theme draws now, B stripes every other row
// and C has neither.
//

import type { ReactNode } from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { SxProps, Theme } from "@mui/material/styles";

//
// The Table styles of options B and C. Option A and the "Spot it" option use the theme as it
// stands.
//
const tableStyles: Record<string, SxProps<Theme>> = {
    B: {
        "& .MuiTableBody-root .MuiTableCell-root": {
            borderBottom: "none",
        },
        "& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even):not(.Mui-selected)": {
            backgroundColor: "var(--color-raised)",
        },
    },
    C: {
        "& .MuiTableBody-root .MuiTableCell-root": {
            borderBottom: "none",
        },
    },
};

//
// The commits of the preview.
//
const commits = [
    ["Added the commit graph", "a1b2c3d"],
    ["Fixed the merge base", "e4f5a6b"],
    ["Merged feature/diffs", "c7d8e9f"],
    ["Coloured the diff", "b4a5968"],
    ["Split the panels", "8a9b0c1"],
];

//
// Renders the table in the style of option `optionId`, with the second commit selected.
//
export function TablePreview({ optionId }: { optionId: string }): ReactNode {
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={tableStyles[optionId]}>
                <TableHead>
                    <TableRow>
                        <TableCell>Message</TableCell>
                        <TableCell>Hash</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {commits.map(([message, hash], index) => (
                        <TableRow key={hash} hover selected={index === 1}>
                            <TableCell>{message}</TableCell>
                            <TableCell sx={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{hash}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
