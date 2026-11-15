//
// The tabs page: a row of tabs that switches the view below it, built from MUI's Tabs, with
// counts, icons, a disabled tab and a row too long for its space.
//

import { useEffect, useRef, useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive, faClockRotateLeft, faCodeCompare, faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";
import { FileIcon } from "../../components/file-icon";
import { FilterBox, matchesSearch } from "../../components/search-box";
import { Tip } from "../../components/tip";

//
// The views the example tabs switch between, with what each shows.
//
const views = [
    {
        label: "Changes",
        icon: faCodeCompare,
        count: 3,
        content: "3 changed files in the working tree.",
    },
    {
        label: "History",
        icon: faClockRotateLeft,
        count: 128,
        content: "128 commits on main.",
    },
    {
        label: "Stashes",
        icon: faBoxArchive,
        count: 2,
        content: "2 stashed sets of changes.",
    },
];

//
// Renders tabs with icons and counts over the view each one shows. Clicking a tab, or moving
// to it with the arrow keys, switches the view.
//
export function ViewTabs(): ReactNode {
    const [current, setCurrent] = useState(0);

    return (
        <div>
            <Tabs value={current} onChange={(_event, index: number) => setCurrent(index)} aria-label="Repository views">
                {views.map(view => (
                    <Tab
                        key={view.label}
                        iconPosition="start"
                        icon={<FontAwesomeIcon icon={view.icon} style={{ fontSize: "var(--icon-md)" }} />}
                        label={
                            <span className="inline-flex items-center" style={{ gap: "var(--space-2)" }}>
                                {view.label}
                                <Chip variant="count" label={view.count} component="span" />
                            </span>
                        }
                    />
                ))}
            </Tabs>
            <div role="tabpanel" style={{ padding: "var(--space-4) 0", color: "var(--color-text-muted)" }}>
                {views[current].content}
            </div>
        </div>
    );
}

//
// Renders one section per kind of tab row, each shown in the themes of the current mode.
//
//
// The open files of the example with more tabs than fit.
//
const openFiles = ["graph.ts", "lanes.ts", "commit-list.tsx", "diff-view.tsx", "status-bar.tsx", "README.md", "theme.ts", "zoom.ts", "settings.tsx", "build.zig"];

//
// Renders a row of tabs, one per name in `names`, that scrolls sideways when it is wider than its
// space. While the tabs overflow, a More button at the row's end opens a dropdown listing every tab
// under a filter box: typing keeps only the matching names, Enter picks the first of them, and a
// click picks one. Picking a tab selects it and scrolls it into view.
//
export function OverflowTabs({ names, label }: { names: string[]; label: string }): ReactNode {
    const [current, setCurrent] = useState(0);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [filter, setFilter] = useState("");
    const [isOverflowing, setIsOverflowing] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);
    const shown = names.map((name, index) => ({ name, index })).filter(tab => matchesSearch(tab.name, filter));

    //
    // Watches the row's width, so the More button shows only while the tabs do not all fit.
    //
    useEffect(() => {
        const scroller = rowRef.current?.querySelector<HTMLElement>(".MuiTabs-scroller");
        if (!scroller) {
            return;
        }
        const measure = (): void => setIsOverflowing(scroller.scrollWidth > scroller.clientWidth + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(scroller);
        return () => observer.disconnect();
    }, [names]);

    function pick(index: number): void {
        setCurrent(index);
        setAnchor(null);
        setFilter("");
    }

    return (
        <div ref={rowRef} className="flex items-center" style={{ gap: "var(--space-2)", borderBottom: "1px solid var(--color-border)" }}>
            <Tabs value={current} onChange={(_event, index: number) => setCurrent(index)} variant="scrollable" scrollButtons={false} aria-label={label} sx={{ flex: 1, minWidth: 0, borderBottom: "none" }}>
                {names.map(name => (
                    <Tab
                        key={name}
                        iconPosition="start"
                        icon={<FileIcon path={name} />}
                        label={<span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{name}</span>}
                    />
                ))}
            </Tabs>
            {isOverflowing ? (
                <Tooltip title={<Tip title="All tabs" detail={`${names.length} open; type to find one.`} />}>
                    <IconButton size="small" aria-label="All tabs" aria-haspopup="dialog" aria-expanded={anchor !== null} onClick={event => setAnchor(event.currentTarget)} sx={{ flex: "none", marginRight: "var(--space-1)" }}>
                        <FontAwesomeIcon icon={faEllipsis} />
                    </IconButton>
                </Tooltip>
            ) : undefined}
            <Popover
                open={anchor !== null}
                anchorEl={anchor}
                onClose={() => {
                    setAnchor(null);
                    setFilter("");
                }}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { role: "dialog", "aria-label": "All tabs", sx: { width: "min(calc(var(--space-8) * 9), calc(100vw - var(--space-8)))" } } }}
            >
                <div style={{ padding: "var(--space-2)", borderBottom: "1px solid var(--color-border)" }}>
                    <div
                        onKeyDown={event => {
                            if (event.key === "Enter" && shown.length > 0) {
                                event.preventDefault();
                                pick(shown[0].index);
                            }
                        }}
                    >
                        <FilterBox value={filter} onChange={setFilter} label="Filter the tabs" placeholder="Filter the tabs" />
                    </div>
                </div>
                {shown.length === 0 ? <p style={{ padding: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>No tabs match the filter.</p> : undefined}
                <List dense aria-label="Tabs" sx={{ padding: "var(--space-1)", maxHeight: "calc(var(--space-8) * 8)", overflowY: "auto" }}>
                    {shown.map(tab => (
                        <ListItemButton key={tab.name} selected={tab.index === current} onClick={() => pick(tab.index)} sx={{ gap: "var(--space-2)" }}>
                            <FileIcon path={tab.name} />
                            <ListItemText primary={tab.name} slotProps={{ primary: { sx: { fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" } } }} />
                        </ListItemButton>
                    ))}
                </List>
            </Popover>
        </div>
    );
}

export function TabsPage(): ReactNode {
    const [plainTab, setPlainTab] = useState(0);

    return (
        <div>
            <Section title="With icons and counts" description="Tabs with an icon and a count.">
                <ViewTabs />
            </Section>

            <Section title="Plain, with a disabled tab" description="Text-only tabs, one disabled.">
                <Tabs value={plainTab} onChange={(_event, index: number) => setPlainTab(index)} aria-label="Diff layout">
                    <Tab label="Unified" />
                    <Tab label="Side by side" />
                    <Tab label="Blame (loading)" disabled />
                </Tabs>
            </Section>

            <Section
                title="More tabs than fit"
                description="More tabs than fit, with a More button listing them all."
            >
                <div style={{ maxWidth: "420px" }}>
                    <OverflowTabs names={openFiles} label="Open files" />
                </div>
            </Section>
        </div>
    );
}
