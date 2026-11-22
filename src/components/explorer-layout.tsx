//
// The explorer's frame: a sidebar to search for and choose a page, and the chosen page beside it,
// with Configuration, holding the component mode and explorer theme switches, and About at the
// page's top right.
//

import { useEffect, useState, type ReactNode } from "react";
import { SettingSwitch } from "./setting-switch";
import { AboutDialog } from "./about-dialog";
import { Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faChevronDown, faChevronLeft, faChevronRight, faCircleInfo, faGear, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { explorerPages, PAGE_GROUPS, type IExplorerPage } from "../explorer-pages";
import { setExplorerSettings, useExplorerSettings, type ComponentMode, type ExplorerTheme, type SidebarState } from "../lib/explorer-mode";

//
// Screens narrower than this, such as phones in either orientation and tablets held upright,
// show the sidebar as a drawer over the page instead of a column beside it.
//
const NARROW_SCREEN = "(max-width: 1023.98px)";

//
// The browser storage key that holds the ids of the closed sidebar groups.
//
const CLOSED_GROUPS_KEY = "graft-style-guide-closed-groups";

//
// The backing of the buttons that float over the page's corners: the panel colour, rounded and
// raised, so the page scrolling under them never shows through.
//
const FLOATING_STYLE = {
    background: "var(--color-panel)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-raised)",
};

//
// Renders the sidebar and the page the router has chosen. Pressing Enter in the search box
// opens the first page that matches. The component mode, the explorer theme and whether the
// sidebar is minimised are kept in this browser's storage and remembered between visits; the
// explorer theme also sets the light or dark class on the page. The minimise button hides the sidebar and gives
// the page the full width with a restore button floating in its top-left corner. On a narrow
// screen the sidebar starts minimised, opens as a drawer over the page and closes when a page is
// chosen.
//
export function ExplorerLayout(): ReactNode {
    const [search, setSearch] = useState("");
    const [aboutOpen, setAboutOpen] = useState(false);
    const [configurationAnchor, setConfigurationAnchor] = useState<HTMLElement | undefined>(undefined);
    const navigate = useNavigate();
    const { pageId } = useParams({
        strict: false,
    });
    const { components: componentMode, explorer: explorerTheme, sidebar } = useExplorerSettings();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const narrow = useMediaQuery(NARROW_SCREEN, {
        noSsr: true,
    });
    const sidebarState: SidebarState = narrow ? (isDrawerOpen ? "open" : "minimised") : sidebar;


    useEffect(() => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(explorerTheme);
    }, [explorerTheme]);


    const query = search.trim().toLowerCase();

    //
    // The sidebar groups that are closed, remembered in this browser between visits.
    //
    const [closedGroups, setClosedGroups] = useState<ReadonlySet<string>>(() => {
        try {
            return new Set(JSON.parse(localStorage.getItem(CLOSED_GROUPS_KEY) ?? "[]") as string[]);
        }
        catch {
            return new Set();
        }
    });

    //
    // Opens the sidebar group `id` when it is closed and closes it when it is open.
    //
    function toggleGroup(id: string): void {
        const next = new Set(closedGroups);
        if (next.has(id)) {
            next.delete(id);
        }
        else {
            next.add(id);
        }
        setClosedGroups(next);
        try {
            localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify([...next]));
        }
        catch {
            //
            // The browser keeps no storage here, such as in a private window, so the groups open
            // again on the next visit.
            //
        }
    }
    const matches = explorerPages.filter(page => {
        if (!query) {
            return true;
        }
        if (page.title.toLowerCase().includes(query)) {
            return true;
        }
        return page.keywords.some(keyword => keyword.includes(query));
    });

    //
    // Renders the sidebar link to `page`, filled with the accent colour when it is the open page.
    //
    function pageLink(page: IExplorerPage): ReactNode {
        return (
            <Link
                to="/page/$pageId"
                params={{
                    pageId: page.id,
                }}
                onClick={() => setIsDrawerOpen(false)}
                className="block px-3 py-1.5"
                style={{
                    borderRadius: "var(--radius-md)",
                    color: page.id === pageId ? "var(--color-on-accent)" : "var(--color-text)",
                    background: page.id === pageId ? "var(--color-accent)" : "transparent",
                }}
            >
                {page.title}
            </Link>
        );
    }

    async function openFirstMatch(): Promise<void> {
        const firstMatch = matches[0];
        if (!firstMatch) {
            return;
        }
        await navigate({
            to: "/page/$pageId",
            params: {
                pageId: firstMatch.id,
            },
        });
        setIsDrawerOpen(false);
    }

    //
    // Opens or minimises the sidebar: on a narrow screen the drawer, for this visit only, and on a
    // wide screen the sidebar beside the page, remembered in the browser.
    //
    function setSidebar(value: SidebarState): void {
        if (narrow) {
            setIsDrawerOpen(value === "open");
        }
        else {
            setExplorerSettings({ sidebar: value });
        }
    }

    //
    // The buttons at the page's top right: Configuration, which opens a dropdown with the light and
    // dark settings, and About.
    //
    const aboutButton = (
        <div className="fixed top-2 right-2 z-10 flex items-center gap-2" style={FLOATING_STYLE}>
            <Tooltip title="Configuration" placement="bottom">
                <IconButton onClick={event => setConfigurationAnchor(event.currentTarget)} aria-label="Configuration" aria-haspopup="dialog" aria-expanded={configurationAnchor !== undefined}>
                    <FontAwesomeIcon icon={faGear} />
                </IconButton>
            </Tooltip>
            <Tooltip title="About this style guide" placement="left">
                <IconButton onClick={() => setAboutOpen(true)} aria-label="About">
                    <FontAwesomeIcon icon={faCircleInfo} />
                </IconButton>
            </Tooltip>
            <Popover
                open={configurationAnchor !== undefined}
                anchorEl={configurationAnchor}
                onClose={() => setConfigurationAnchor(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { role: "dialog", "aria-label": "Configuration" } }}
            >
            <div className="flex flex-col gap-4" style={{ padding: "var(--space-4)", width: "min(calc(var(--space-8) * 10), calc(100vw - var(--space-8)))" }}>
                <SettingSwitch
                    label="Components"
                    value={componentMode}
                    options={[
                        {
                            value: "light",
                            label: "Light",
                        },
                        {
                            value: "dark",
                            label: "Dark",
                        },
                        {
                            value: "both",
                            label: "Dark next to light",
                        },
                    ]}
                    onChange={value => {
                        setExplorerSettings({ components: value as ComponentMode });
                    }}
                />
                <SettingSwitch
                    label="Explorer"
                    value={explorerTheme}
                    options={[
                        {
                            value: "light",
                            label: "Light",
                        },
                        {
                            value: "dark",
                            label: "Dark",
                        },
                    ]}
                    onChange={value => {
                        setExplorerSettings({ explorer: value as ExplorerTheme });
                    }}
                />
            </div>
            </Popover>
        </div>
    );
    const aboutDialog = <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />;

    const sidebarContent = (
        <>
            <div className="flex items-center justify-between gap-2">
                <div
                    style={{
                        fontSize: "var(--text-lg)",
                        fontWeight: "var(--weight-bold)",
                    }}
                >
                    Graft Style Explorer
                </div>
                <Tooltip title="Minimise sidebar">
                    <IconButton aria-label="Minimise sidebar" size="small" onClick={() => setSidebar("minimised")}>
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </IconButton>
                </Tooltip>
            </div>
            <TextField
                placeholder="Search components"
                size="small"
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => {
                    if (event.key === "Enter") {
                        //
                        // Ends the key press here. When the drawer closes, focus returns to the
                        // menu button, and the rest of this key press would press it and open
                        // the drawer again.
                        //
                        event.preventDefault();
                        openFirstMatch().catch(error => console.error("Could not open the page.", error));
                    }
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <FontAwesomeIcon icon={faMagnifyingGlass} />
                            </InputAdornment>
                        ),
                    },
                }}
            />
            {/* The style pages first, then each group under its heading. */}
            <ul aria-label="Pages" className="flex flex-col gap-1">
                {matches
                    .filter(page => page.group === undefined)
                    .map(page => (
                        <li key={page.id}>{pageLink(page)}</li>
                    ))}
                {PAGE_GROUPS.map(group => {
                    const pages = matches.filter(page => page.group === group.id);
                    //
                    // A search shows every group open, so no match hides in a closed one.
                    //
                    const isOpen = query !== "" || !closedGroups.has(group.id);
                    return pages.length === 0
                        ? undefined
                        : [
                              <li key={`heading-${group.id}`} role="presentation" style={{ paddingTop: "var(--space-2)" }}>
                                  <button
                                      type="button"
                                      aria-expanded={isOpen}
                                      onClick={() => toggleGroup(group.id)}
                                      className="flex w-full items-center px-3 py-1"
                                      style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-text-muted)", borderRadius: "var(--radius-md)", cursor: "pointer" }}
                                  >
                                      <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} style={{ fontSize: "var(--icon-sm)", width: "var(--icon-sm)" }} />
                                      {group.heading}
                                  </button>
                              </li>,
                              ...(isOpen ? pages.map(page => <li key={page.id}>{pageLink(page)}</li>) : []),
                          ];
                })}
            </ul>
            {matches.length === 0 ? (
                <div
                    style={{
                        color: "var(--color-text-muted)",
                    }}
                >
                    No components match.
                </div>
            ) : undefined}
        </>
    );

    const pageArea = (
        <>
            {aboutButton}
            {aboutDialog}
            <Outlet />
        </>
    );

    const restoreButton = (
        <Tooltip title={narrow ? "Show the page list" : "Restore sidebar"} placement="right">
            <IconButton aria-label="Restore sidebar" onClick={() => setSidebar("open")}>
                <FontAwesomeIcon icon={narrow ? faBars : faChevronRight} />
            </IconButton>
        </Tooltip>
    );

    if (narrow) {
        return (
            <div className="min-h-screen">
                <div className="fixed top-2 left-2 z-10" style={FLOATING_STYLE}>{restoreButton}</div>
                <Drawer open={sidebarState === "open"} onClose={() => setSidebar("minimised")} disableScrollLock>
                    <nav className="flex min-h-full w-64 flex-col gap-3 p-4">{sidebarContent}</nav>
                </Drawer>
                <main className="min-w-0 pt-3.5 pr-4 pb-8 pl-4 [&_h1]:pr-8 [&_h1]:pl-12">{pageArea}</main>
            </div>
        );
    }

    if (sidebarState === "minimised") {
        return (
            <div className="min-h-screen">
                <nav className="fixed top-2 left-2 z-10" style={FLOATING_STYLE}>{restoreButton}</nav>
                <main className="min-w-0 pt-3.5 pr-8 pb-8 pl-8 [&_h1]:pl-8">{pageArea}</main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <nav
                className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-3 overflow-y-auto p-4"
                style={{
                    background: "var(--color-panel)",
                    borderRight: "1px solid var(--color-border)",
                }}
            >
                {sidebarContent}
            </nav>
            <main className="min-w-0 flex-1 pt-3.5 pr-8 pb-8 pl-8">{pageArea}</main>
        </div>
    );
}
