//
// The tabs page: a row of tabs that switches the view below it, built from MUI's Tabs, with
// counts, icons, a disabled tab and a row too long for its space.
//

import { useState, type ReactNode } from "react";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive, faClockRotateLeft, faCodeCompare } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";

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
export function TabsPage(): ReactNode {
    const [plainTab, setPlainTab] = useState(0);
    const [manyTab, setManyTab] = useState(0);

    return (
        <div>
            <Section title="With icons and counts" description="The tabs above a repository's views. The selected tab is marked and its view shows below.">
                <ViewTabs />
            </Section>

            <Section title="Plain, with a disabled tab" description="Text-only tabs. A tab whose view is not available yet cannot be selected.">
                <Tabs value={plainTab} onChange={(_event, index: number) => setPlainTab(index)} aria-label="Diff layout">
                    <Tab label="Unified" />
                    <Tab label="Side by side" />
                    <Tab label="Blame (loading)" disabled />
                </Tabs>
            </Section>

            <Section title="More tabs than fit" description="A row of open files wider than its space scrolls sideways, with arrows at each end.">
                <div style={{ maxWidth: "420px" }}>
                    <Tabs
                        value={manyTab}
                        onChange={(_event, index: number) => setManyTab(index)}
                        variant="scrollable"
                        scrollButtons
                        allowScrollButtonsMobile
                        aria-label="Open files"
                    >
                        {["graph.ts", "lanes.ts", "commit-list.tsx", "diff-view.tsx", "status-bar.tsx", "README.md"].map(name => (
                            <Tab key={name} label={<span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{name}</span>} />
                        ))}
                    </Tabs>
                </div>
            </Section>
        </div>
    );
}
