//
// The sidebar navigation page: Graft's left sidebar, with the repository's branches, remotes,
// tags and stashes in groups that open and close, and the current item marked.
//

import { useState, type ReactNode } from "react";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBoxArchive,
    faChevronDown,
    faChevronRight,
    faCloud,
    faCodeBranch,
    faCodeCompare,
    faTag,
    type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";
import { openOnSearchKey, SearchToolbar, useSearchMode } from "../../components/search-box";

//
// One group of the sidebar.
//
interface ISidebarGroup {
    //
    // The group's heading.
    //
    title: string;

    //
    // The icon before each item.
    //
    icon: IconDefinition;

    //
    // The items in the group.
    //
    items: string[];
}

//
// The groups of the sidebar, top to bottom.
//
//
// The current item: the selected background with a bar down its left edge in the selection colour,
// like the open commit's row.
//
const currentItemStyle = {
    "&.Mui-selected, &.Mui-selected:hover": {
        boxShadow: "inset 2px 0 0 var(--color-select-item)",
    },
};

const groups: ISidebarGroup[] = [
    {
        title: "Branches",
        icon: faCodeBranch,
        items: ["main", "feature/commit-graph", "fix/merge-base"],
    },
    {
        title: "Remotes",
        icon: faCloud,
        items: ["origin", "upstream"],
    },
    {
        title: "Tags",
        icon: faTag,
        items: ["v1.0.0", "v0.9.0"],
    },
    {
        title: "Stashes",
        icon: faBoxArchive,
        items: ["WIP on main: graph spacing"],
    },
];

//
// Renders a group heading that opens and closes its group, with the number of items in it.
//
export function GroupHeading({ group, isOpen, onToggle }: { group: ISidebarGroup; isOpen: boolean; onToggle: () => void }): ReactNode {
    return (
        <ListSubheader component="div" sx={{ padding: 0 }}>
            <ListItemButton onClick={onToggle} aria-expanded={isOpen} sx={{ gap: "var(--space-2)", color: "inherit", font: "inherit" }}>
                <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} style={{ fontSize: "var(--icon-sm)", width: "var(--space-3)" }} />
                <span className="flex-1">{group.title}</span>
                <Chip variant="count" label={group.items.length} component="span" />
            </ListItemButton>
        </ListSubheader>
    );
}

//
// Renders the sidebar with every group open and "main" as the current item. Clicking an item
// makes it current, and clicking a heading opens or closes its group. The search button in the
// toolbar or Ctrl+F shows the search box, which narrows every group to the items whose names contain what is typed, ignoring case: groups with
// no match are left out, groups with a match open whatever their state, and the counts show the
// matches.
//
export function RepositorySidebar(): ReactNode {
    const [current, setCurrent] = useState("Branches/main");
    const [closedGroups, setClosedGroups] = useState(new Set<string>());
    const search = useSearchMode("");
    const needle = search.query.trim().toLowerCase();
    const isSearching = needle !== "";
    const shownGroups = groups
        .map(group => ({ ...group, items: group.items.filter(item => item.toLowerCase().includes(needle)) }))
        .filter(group => group.items.length > 0);

    function toggle(title: string): void {
        const next = new Set(closedGroups);
        if (next.has(title)) {
            next.delete(title);
        }
        else {
            next.add(title);
        }
        setClosedGroups(next);
    }

    return (
        <Paper component="nav" aria-label="Repository" variant="outlined" tabIndex={-1} onKeyDownCapture={event => openOnSearchKey(search, event)} sx={{ width: "260px", maxWidth: "100%", padding: "var(--space-2)" }}>
            <div style={{ margin: "calc(var(--space-2) * -1) calc(var(--space-2) * -1) var(--space-2)" }}>
                <SearchToolbar mode={search} what="the repository" title="Repository" placeholder="Search branches, tags…" result={`${shownGroups.reduce((total, group) => total + group.items.length, 0)} found`} />
            </div>
            {isSearching && shownGroups.length === 0 ? (
                <p style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Nothing matches "{search.query.trim()}".</p>
            ) : undefined}
            <List disablePadding sx={isSearching ? { display: "none" } : undefined}>
                <ListItemButton sx={currentItemStyle} selected={current === "Changes"} onClick={() => setCurrent("Changes")}>
                    <ListItemIcon>
                        <FontAwesomeIcon icon={faCodeCompare} />
                    </ListItemIcon>
                    <ListItemText primary="Changes" />
                    <Chip variant="count" label={3} component="span" />
                </ListItemButton>
            </List>
            {shownGroups.map(group => {
                const isOpen = isSearching || !closedGroups.has(group.title);
                return (
                    <List key={group.title} disablePadding subheader={<GroupHeading group={group} isOpen={isOpen} onToggle={() => toggle(group.title)} />}>
                        {isOpen
                            ? group.items.map(item => {
                                  const id = `${group.title}/${item}`;
                                  return (
                                      <ListItemButton sx={currentItemStyle} key={id} selected={current === id} onClick={() => setCurrent(id)} aria-current={current === id ? "page" : undefined}>
                                          <ListItemIcon>
                                              <FontAwesomeIcon icon={group.icon} />
                                          </ListItemIcon>
                                          <ListItemText
                                              primary={item}
                                              slotProps={{
                                                  primary: {
                                                      className: "truncate",
                                                      sx: {
                                                          fontFamily: group.title === "Stashes" ? "var(--font-sans)" : "var(--font-mono)",
                                                          fontSize: "var(--text-sm)",
                                                      },
                                                  },
                                              }}
                                          />
                                      </ListItemButton>
                                  );
                              })
                            : undefined}
                    </List>
                );
            })}
        </Paper>
    );
}

//
// Renders the sidebar in a section shown in the themes of the current mode.
//
export function SidebarPage(): ReactNode {
    return (
        <div>
            <Section
                title="Repository sidebar"
                description="A repository's views by group, with a search button in the toolbar."
            >
                <RepositorySidebar />
            </Section>
        </div>
    );
}
