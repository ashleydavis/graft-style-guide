//
// The commit pane: the first column of the commit explorer, listing the commits newest first, one
// row each with its lanes of the commit graph, title, refs, author, date and short hash. Its header
// holds the search button, which shows the search box, and the options button, which picks the
// columns that show.
//

import { useEffect, useRef, useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import type { ISearchMode } from "../../../components/search-box";
import { ExplorerSearchBox } from "./explorer-search";
import { CommitColumnOptions, readColumns, storeColumns, type ICommitColumns } from "./commit-columns";
import { type RefKind } from "../../badges";
import { BADGES_COLUMN_WIDTH, RefBadges } from "../../../components/ref-badges";
import { codeField, CopyTip, textField } from "../../../components/copy-tip";
import { PinnableTooltip } from "../../../components/pinnable-tooltip";
import { GraphLanes } from "../../commit-graph/components/graph-row";
import type { ICommit } from "../data";
import { Tip } from "../../../components/tip";
import { localIsoDate, longDate, shortDate } from "../dates";
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
// What the commit pane shows and reports.
//
export interface ICommitPaneProps {
    //
    // The commits read so far, newest first, and while a search is applied only those it matches.
    //
    commits: ICommit[];

    //
    // How many lanes the commits' graph is wide.
    //
    laneCount: number;

    //
    // The pane's width in pixels once a resize handle has set it, or undefined while the pane takes
    // its own width of 850px. An open diff to its right scrolls the row of panes sideways.
    //
    width: number | undefined;

    //
    // True while a search is applied. The list then shows only the matching commits, without the
    // lanes of the graph, which only join up with every commit in place.
    //
    isSearching: boolean;

    //
    // True while the history has commits not read yet.
    //
    hasMore: boolean;

    //
    // True while the next page of the history is being read.
    //
    isReading: boolean;

    //
    // Called when the end of the list scrolls into view, to read the next page.
    //
    onReachEnd: () => void;

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
    // The search mode of the commits: the search button and Ctrl+F show its box, it searches once
    // typing pauses or on Enter and Escape ends it.
    //
    search: ISearchMode;

    //
    // How many commits match the search.
    //
    matchCount: number;

    //
    // How many commits have been read so far, which the search's count is out of.
    //
    totalCount: number;

    //
    // True while the pane fills the explorer.
    //
    isMaximised: boolean;

    //
    // Called by the pane's maximise button.
    //
    onToggleMaximise: () => void;

    //
    // True while the pane is collapsed into a narrow strip at its left.
    //
    isCollapsed: boolean;

    //
    // Called by the collapse button and the strip's restore button.
    //
    onToggleCollapse: () => void;

    //
    // Called with the hash of the commit the person clicks.
    //
    onSelectCommit: (hash: string) => void;
}

//
// Renders the pane, with the search box above the list while searching. The columns picked in the
// options dropdown show, and the choice is kept for the next visit. A row leaves out the author,
// then the date, when the list is too narrow for them; the commit's details show both. The selected
// row scrolls into view when the keys move the selection past the top or bottom of the pane. A line
// at the end of the list says when more commits are being read, and the next page is read as it
// scrolls into view.
//
export function CommitPane({ commits, laneCount, width, isMaximised, onToggleMaximise, isCollapsed, onToggleCollapse, isSearching, hasMore, isReading, onReachEnd, search, matchCount, totalCount, selectedHash, openHash, isActive, onSelectCommit }: ICommitPaneProps): ReactNode {
    const [columns, setColumns] = useState<ICommitColumns>(readColumns);
    const selectedRef = useRef<HTMLLIElement>(null);
    const endMarker = useRef<HTMLLIElement>(null);

    useEffect(() => {
        const marker = endMarker.current;
        if (!marker || !hasMore) {
            return undefined;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                onReachEnd();
            }
        });
        observer.observe(marker);
        return () => observer.disconnect();
    }, [hasMore, commits.length, onReachEnd]);

    let endText = "";
    if (isReading) {
        endText = "Reading more commits…";
    }
    else if (commits.length === 0) {
        endText = "There are no commits.";
    }
    else if (!hasMore) {
        endText = "That is every commit.";
    }

    useEffect(() => {
        scrollSelectionIntoView(selectedRef.current);
    }, [selectedHash]);

    return (
        <Pane
            label="Commits"
            isMaximised={isMaximised}
            onToggleMaximise={onToggleMaximise}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            railTitle="Commits"
            width={width === undefined ? "850px" : `${width}px`}
            isActive={isActive}
            title="Commits"
            fillsHeight
            toolbar={
                search.isOpen ? (
                    <ExplorerSearchBox
                        search={search}
                        label="Search commits"
                        placeholder="Search commits"
                        closeLabel="Close the commit search"
                        result={isSearching ? `${matchCount} of ${totalCount}${hasMore ? " read" : ""}` : undefined}
                    />
                ) : undefined
            }
            headerExtra={
                <>
                    <Tooltip title={<Tip title="Search commits" detail="Keys: Ctrl+F" />}>
                        <IconButton size="small" aria-label="Search commits" aria-pressed={search.isOpen} onClick={() => (search.isOpen ? search.close() : search.open())}>
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </IconButton>
                    </Tooltip>
                    <CommitColumnOptions
                        columns={columns}
                        onChange={next => {
                            setColumns(next);
                            storeColumns(next);
                        }}
                    />
                </>
            }
        >
            {isSearching && commits.length === 0 ? (
                <p style={{ padding: "var(--space-3) var(--space-4) 0", textAlign: "center", color: "var(--color-text-muted)" }}>No commits read so far match the search.</p>
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
                                boxShadow: isOpen ? "inset 2px 0 0 var(--color-select-item)" : "none",
                                //
                                // The row's background, which the commit's dot rings itself in so
                                // it stands clear of the lane lines on a plain, hovered or selected
                                // row.
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
                            {columns.graph && !isSearching ? <GraphLanes shape={commit.graph} laneCount={laneCount} ringColour="var(--row-background)" /> : undefined}
                            <PinnableTooltip
                                enterDelayMs={500}
                                maxWidth="calc(var(--space-8) * 16)"
                                tip={pinButton => <CopyTip fields={commit.description ? [textField("Title", commit.title), { ...textField("Description", commit.description), isMultiline: true }] : [textField("Title", commit.title)]} action={pinButton} />}
                            >
                                <span className="min-w-0 flex-1 truncate" style={{ fontWeight: isOpen ? "var(--weight-bold)" : "var(--weight-normal)" }}>
                                    {commit.title}
                                </span>
                            </PinnableTooltip>
                            {columns.badges && commit.refs.length > 0 ? (
                                //
                                // The badges keep a column of their own, so the columns after them
                                // line up from row to row. A list too narrow for it leaves it out;
                                // the commit's details show its refs.
                                //
                                <span className="hidden flex-none @min-[480px]:block">
                                    <RefBadges refs={commit.refs.map(refBadge)} />
                                </span>
                            ) : columns.badges ? (
                                <span aria-hidden="true" className="hidden flex-none @min-[480px]:block" style={{ width: `${BADGES_COLUMN_WIDTH}px` }} />
                            ) : undefined}
                            {columns.author ? (
                                <PinnableTooltip enterDelayMs={400} maxWidth="calc(var(--space-8) * 12)" tip={pinButton => <CopyTip fields={[textField("Author", commit.authorName), codeField("Email", commit.authorEmail)]} action={pinButton} />}>
                                    <span className="hidden flex-none truncate @min-[560px]:block" style={{ width: "80px", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                        {commit.authorName}
                                    </span>
                                </PinnableTooltip>
                            ) : undefined}
                            {columns.date ? (
                                <PinnableTooltip enterDelayMs={400} maxWidth="calc(var(--space-8) * 12)" tip={pinButton => <CopyTip fields={[textField("Written", longDate(commit.authorDate)), codeField("ISO 8601", localIsoDate(commit.authorDate))]} action={pinButton} />}>
                                    <span className="hidden flex-none text-right @min-[440px]:block" style={{ width: "52px", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                        {shortDate(commit.authorDate)}
                                    </span>
                                </PinnableTooltip>
                            ) : undefined}
                            {columns.hash ? (
                                <PinnableTooltip enterDelayMs={400} maxWidth="calc(var(--space-8) * 16)" tip={pinButton => <CopyTip fields={[codeField("Commit hash", commit.hash), codeField("Short hash", commit.hash.slice(0, 7))]} action={pinButton} />}>
                                    <code className="flex-none" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                        {commit.hash.slice(0, 7)}
                                    </code>
                                </PinnableTooltip>
                            ) : undefined}
                        </ListItemButton>
                    );
                })}
                <li ref={endMarker} aria-live="polite" style={{ listStyle: "none", padding: "var(--space-2) var(--space-4)", minHeight: "var(--space-8)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    {endText}
                </li>
            </List>
        </Pane>
    );
}
