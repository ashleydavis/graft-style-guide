//
// The commit pane: the first column of the commit explorer, listing the commits newest first, one
// row each with its lanes of the commit graph, title, refs, author, date and short hash.
//

import { useEffect, useRef, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import TextField from "@mui/material/TextField";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { RefBadge, type RefKind } from "../../badges";
import { GraphLanes } from "../../commit-graph/components/graph-row";
import type { ICommit } from "../data";
import { Tip } from "../../../components/tip";
import { longDate } from "./commit-details-pane";
import { Pane } from "./pane";
import { scrollSelectionIntoView } from "../scroll";

//
// Returns the kind of badge and the name shown for a ref as `git log` names it: "HEAD -> main"
// is the checked-out branch, "tag: v1" a tag, a name with a slash after a remote a remote branch
// and any other name a local branch.
//
export function refBadge(gitRef: string): { kind: RefKind; name: string } {
    if (gitRef.startsWith("HEAD -> ")) {
        return { kind: "current", name: gitRef.slice("HEAD -> ".length) };
    }
    if (gitRef.startsWith("tag: ")) {
        return { kind: "tag", name: gitRef.slice("tag: ".length) };
    }
    if (gitRef.startsWith("origin/")) {
        return { kind: "remote", name: gitRef };
    }
    return { kind: "branch", name: gitRef };
}

//
// Formats a commit's day for its row, as in "14 Nov", in the browser's own locale.
//
export function shortDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
    });
}

//
// What the commit pane shows and reports.
//
export interface ICommitPaneProps {
    //
    // The commits, newest first.
    //
    commits: ICommit[];

    //
    // How many lanes the commits' graph is wide.
    //
    laneCount: number;

    //
    // The pane's width in pixels once a resize handle has set it, or undefined while the pane sizes
    // itself: 680px, narrowing to 320px to make room for an open diff.
    //
    width: number | undefined;

    //
    // True to draw each row's lanes of the commit graph, false while a search leaves rows out.
    //
    showGraph: boolean;

    //
    // The hash of the selected commit, drawn on the selected background, or undefined.
    //
    selectedHash: string | undefined;

    //
    // The hash of the commit whose details are open, drawn with an accent bar and a bold title,
    // or undefined.
    //
    openHash: string | undefined;

    //
    // True while the pane is the one the keys act on.
    //
    isActive: boolean;

    //
    // What the search box holds.
    //
    search: string;

    //
    // How many commits match the search.
    //
    matchCount: number;

    //
    // How many commits there are in all.
    //
    totalCount: number;

    //
    // Called with what the person types in the search box.
    //
    onSearch: (search: string) => void;

    //
    // True while the pane fills the explorer.
    //
    isMaximised: boolean;

    //
    // Called by the pane's maximise button.
    //
    onToggleMaximise: () => void;

    //
    // Called with the hash of the commit the person clicks.
    //
    onSelectCommit: (hash: string) => void;
}

//
// Renders the pane, with the search box above the list. The pane narrows to make room for an open
// diff, and a row leaves out the author, then the date, when the list is too narrow for them; the
// commit's details show both. The selected row scrolls into view when the keys move the selection past the
// top or bottom of the pane.
//
export function CommitPane({ commits, laneCount, width, isMaximised, onToggleMaximise, showGraph, search, matchCount, totalCount, onSearch, selectedHash, openHash, isActive, onSelectCommit }: ICommitPaneProps): ReactNode {
    const isSearching = search.trim() !== "";
    const selectedRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        scrollSelectionIntoView(selectedRef.current);
    }, [selectedHash]);

    return (
        <Pane
            label="Commits"
            isMaximised={isMaximised}
            onToggleMaximise={onToggleMaximise}
            width={width === undefined ? "680px" : `${width}px`}
            shrinksTo={width === undefined ? "320px" : undefined}
            isActive={isActive}
            toolbar={
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Search commits by message, author, hash or ref"
                    value={search}
                    onChange={event => onSearch(event.target.value)}
                    slotProps={{
                        htmlInput: {
                            "aria-label": "Search commits",
                        },
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-md)" }} />
                                </InputAdornment>
                            ),
                            endAdornment: isSearching ? (
                                <InputAdornment position="end" sx={{ gap: "var(--space-2)" }}>
                                    <span aria-live="polite" style={{ fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>
                                        {matchCount} of {totalCount}
                                    </span>
                                    <Tooltip title="Clear the search">
                                        <IconButton size="small" aria-label="Clear search" onClick={() => onSearch("")} edge="end">
                                            <FontAwesomeIcon icon={faXmark} />
                                        </IconButton>
                                    </Tooltip>
                                </InputAdornment>
                            ) : undefined,
                        },
                    }}
                />
            }
        >
            {commits.length === 0 ? (
                <p style={{ padding: "var(--space-6) var(--space-4)", textAlign: "center", color: "var(--color-text-muted)" }}>No commits match the search.</p>
            ) : undefined}
            <List aria-label="Commits" className="@container" sx={{ padding: "var(--space-2) 0" }}>
                {commits.map(commit => {
                    const isOpen = commit.hash === openHash;
                    const isSelected = commit.hash === selectedHash;
                    return (
                        <ListItemButton
                            key={commit.hash}
                            component="li"
                            ref={isSelected ? selectedRef : undefined}
                            selected={isSelected}
                            aria-current={isOpen ? "true" : undefined}
                            onClick={() => onSelectCommit(commit.hash)}
                            sx={{
                                gap: "var(--space-3)",
                                minHeight: "calc(var(--space-8) + var(--space-1))",
                                paddingTop: 0,
                                paddingBottom: 0,
                                borderRadius: 0,
                                boxShadow: isOpen ? "inset 2px 0 0 var(--color-accent)" : "none",
                                //
                                // The row's background, which the commit's dot rings itself in so it
                                // stands clear of the lane lines on a plain, hovered or selected row.
                                //
                                "--row-background": "var(--color-panel)",
                                "&:hover": {
                                    "--row-background": "var(--color-hover)",
                                },
                                "&.Mui-selected, &.Mui-selected:hover": {
                                    "--row-background": "var(--color-selected)",
                                },
                            }}
                        >
                            {showGraph ? <GraphLanes shape={commit.graph} laneCount={laneCount} ringColour="var(--row-background)" /> : undefined}
                            <span className="flex min-w-0 flex-1 items-center overflow-hidden" style={{ gap: "var(--space-2)" }}>
                                <span className="truncate" style={{ minWidth: "min(calc(var(--space-8) * 4), 100%)", fontWeight: isOpen ? "var(--weight-bold)" : "var(--weight-normal)" }}>
                                    {commit.title}
                                </span>
                                {commit.refs.map(gitRef => {
                                    const badge = refBadge(gitRef);
                                    return (
                                        <span key={gitRef} className="flex-none">
                                            <RefBadge kind={badge.kind} name={badge.name} />
                                        </span>
                                    );
                                })}
                            </span>
                            <Tooltip title={<Tip title={commit.authorName} detail={commit.authorEmail} />}>
                                <span className="hidden flex-none truncate @min-[560px]:block" style={{ width: "80px", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                    {commit.authorName}
                                </span>
                            </Tooltip>
                            <Tooltip title={<Tip title="Written" detail={longDate(commit.authorDate)} />}>
                                <span className="hidden flex-none text-right @min-[440px]:block" style={{ width: "52px", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                    {shortDate(commit.authorDate)}
                                </span>
                            </Tooltip>
                            <Tooltip title={<Tip title="Commit hash" detail={<span style={{ fontFamily: "var(--font-mono)" }}>{commit.hash}</span>} />}>
                                <code className="flex-none" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                    {commit.hash.slice(0, 7)}
                                </code>
                            </Tooltip>
                        </ListItemButton>
                    );
                })}
            </List>
        </Pane>
    );
}
