//
// The columns of the commit pane that can be shown or hidden, kept in the browser's storage
// between visits, and the options button whose dropdown has a switch for each.
//

import { useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders } from "@fortawesome/free-solid-svg-icons";
import { Tip } from "../../../components/tip";
import { OptionRow } from "../../diff/components/file-diff-card";

//
// Which columns of the commit pane show.
//
export interface ICommitColumns {
    //
    // The lanes of the commit graph.
    //
    graph: boolean;

    //
    // The ref badges.
    //
    badges: boolean;

    //
    // The author's name.
    //
    author: boolean;

    //
    // The date the commit was written.
    //
    date: boolean;

    //
    // The short hash.
    //
    hash: boolean;
}

//
// Every column showing, as the pane first draws.
//
export const ALL_COMMIT_COLUMNS: ICommitColumns = {
    graph: true,
    badges: true,
    author: true,
    date: true,
    hash: true,
};

//
// One column's switch in the options dropdown.
//
interface IColumnLabel {
    //
    // The column the switch shows or hides.
    //
    key: keyof ICommitColumns;

    //
    // The column's name.
    //
    label: string;

    //
    // What the column shows.
    //
    detail: string;
}

//
// The columns' switches in the options dropdown, in the order the columns show in a row.
//
const COLUMN_LABELS: IColumnLabel[] = [
    {
        key: "graph",
        label: "Graph",
        detail: "The lanes of the commit graph.",
    },
    {
        key: "badges",
        label: "Badges",
        detail: "The branches and tags on each commit.",
    },
    {
        key: "author",
        label: "Author",
        detail: "Who wrote the commit.",
    },
    {
        key: "date",
        label: "Date",
        detail: "When the commit was written.",
    },
    {
        key: "hash",
        label: "Hash",
        detail: "The commit's short hash.",
    },
];

//
// The key the shown columns are kept under in the browser's storage, named for the explorer so it
// never meets another page's key.
//
const COLUMNS_KEY = "graft-style-guide-commit-columns";

//
// Reads the columns shown on the last visit, every column when none were kept. Storage can be
// missing in a private window, which shows every column and logs why.
//
export function readColumns(): ICommitColumns {
    let stored: unknown;
    try {
        const text = localStorage.getItem(COLUMNS_KEY);
        stored = text ? JSON.parse(text) : undefined;
    }
    catch (error) {
        console.warn("The commit pane's columns could not be read from the browser's storage, so every column shows.", error);
        return ALL_COMMIT_COLUMNS;
    }
    if (typeof stored !== "object" || stored === null) {
        return ALL_COMMIT_COLUMNS;
    }
    const columns = { ...ALL_COMMIT_COLUMNS };
    for (const { key } of COLUMN_LABELS) {
        const value: unknown = key in stored ? Object.getOwnPropertyDescriptor(stored, key)?.value : undefined;
        if (typeof value === "boolean") {
            columns[key] = value;
        }
    }
    return columns;
}

//
// Keeps the columns shown for the next visit. Storage can be missing in a private window, which
// logs why and keeps the choice for this visit only.
//
export function storeColumns(columns: ICommitColumns): void {
    try {
        localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
    }
    catch (error) {
        console.warn("The commit pane's columns could not be kept in the browser's storage, so the choice lasts for this visit only.", error);
    }
}

//
// Renders the options button of the commit pane and, while it is open, its dropdown with a switch
// that shows or hides each column, laid out like the diff card's options.
//
export function CommitColumnOptions({ columns, onChange }: { columns: ICommitColumns; onChange: (columns: ICommitColumns) => void }): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    return (
        <>
            <Tooltip title={<Tip title="Commit list options" detail="Which columns show." />}>
                <IconButton size="small" aria-label="Commit list options" aria-haspopup="dialog" aria-expanded={anchor !== undefined} onClick={event => setAnchor(event.currentTarget)}>
                    <FontAwesomeIcon icon={faSliders} />
                </IconButton>
            </Tooltip>
            <Popover
                open={anchor !== undefined}
                anchorEl={anchor}
                onClose={() => setAnchor(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { role: "dialog", "aria-label": "Commit list options" } }}
            >
                <div className="flex flex-col" style={{ gap: "var(--space-3)", padding: "var(--space-4)", width: "min(calc(var(--space-8) * 10), calc(100vw - var(--space-8)))" }}>
                    {COLUMN_LABELS.map(column => (
                        <OptionRow
                            key={column.key}
                            label={column.label}
                            detail={column.detail}
                            control={
                                <Switch
                                    size="small"
                                    checked={columns[column.key]}
                                    onChange={event => onChange({ ...columns, [column.key]: event.target.checked })}
                                    slotProps={{ input: { "aria-label": `Show the ${column.label.toLowerCase()} column` } }}
                                />
                            }
                        />
                    ))}
                </div>
            </Popover>
        </>
    );
}
