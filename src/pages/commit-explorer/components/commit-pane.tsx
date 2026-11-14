//
// The commit pane: the first column of the commit explorer, listing the commits newest first, one
// row each with its lanes of the commit graph, title, refs, author, date and short hash.
//

import { useEffect, useRef, type ReactNode } from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import { RefBadge, type RefKind } from "../../badges";
import { GraphLanes } from "../../commit-graph/components/graph-row";
import { graphLaneCount, type ICommit } from "../data";
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
    // Called with the hash of the commit the person clicks.
    //
    onSelectCommit: (hash: string) => void;
}

//
// Renders the pane. The selected row scrolls into view when the keys move the selection past the
// top or bottom of the pane.
//
export function CommitPane({ commits, selectedHash, openHash, isActive, onSelectCommit }: ICommitPaneProps): ReactNode {
    const selectedRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        scrollSelectionIntoView(selectedRef.current);
    }, [selectedHash]);

    return (
        <Pane label="Commits" width="680px" isActive={isActive}>
            <List aria-label="Commits" sx={{ padding: "var(--space-2) 0" }}>
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
                            <GraphLanes shape={commit.graph} laneCount={graphLaneCount} ringColour="var(--row-background)" />
                            <span className="flex min-w-0 flex-1 items-center" style={{ gap: "var(--space-2)" }}>
                                <span className="truncate" style={{ fontWeight: isOpen ? "var(--weight-bold)" : "var(--weight-normal)" }}>
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
                            <span className="flex-none truncate" style={{ width: "80px", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                {commit.authorName}
                            </span>
                            <span className="flex-none text-right" style={{ width: "52px", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                {shortDate(commit.authorDate)}
                            </span>
                            <code className="flex-none" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                                {commit.hash.slice(0, 7)}
                            </code>
                        </ListItemButton>
                    );
                })}
            </List>
        </Pane>
    );
}
