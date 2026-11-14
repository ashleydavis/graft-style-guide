//
// The explorer's frame: a sidebar to search for and choose a page, the component mode and
// explorer theme switches and the chosen page beside them.
//

import { useEffect, useState, type ReactNode } from "react";
import { SettingSwitch } from "./setting-switch";
import { AboutDialog } from "./about-dialog";
import { Link, Outlet, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnglesLeft, faAnglesRight, faBars, faCircleInfo, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { explorerPages, type IExplorerPage } from "../explorer-pages";
import { readExplorerSearch } from "../lib/explorer-mode";

//
// Screens narrower than this, such as phones in either orientation and tablets held upright,
// show the sidebar as a drawer over the page instead of a column beside it.
//
const NARROW_SCREEN = "(max-width: 1023.98px)";

//
// Renders the sidebar and the page the router has chosen. Pressing Enter in the search box
// opens the first page that matches. The component mode switch sets ?components= in the URL
// and the explorer theme switch sets ?explorer=, which also sets data-theme on the page. The
// minimise button hides the sidebar, gives the page the full width with a restore button
// floating in its top-left corner and sets ?sidebar=minimised. On a narrow screen the sidebar
// starts minimised, opens as a drawer over the page and closes when a page is chosen.
//
export function ExplorerLayout(): ReactNode {
    const [search, setSearch] = useState("");
    const [aboutOpen, setAboutOpen] = useState(false);
    const navigate = useNavigate();
    const { pageId } = useParams({
        strict: false,
    });
    const { components, explorer, sidebar } = useSearch({
        strict: false,
    });
    const componentMode = components ?? "both";
    const explorerTheme = explorer ?? "light";
    const narrow = useMediaQuery(NARROW_SCREEN, {
        noSsr: true,
    });
    const sidebarState = sidebar ?? (narrow ? "minimised" : "open");

    //
    // The settings a page link or a search keeps in the URL. On a narrow screen choosing a page
    // also closes the drawer.
    //
    const pageSearch = readExplorerSearch({
        components,
        explorer,
        sidebar: narrow ? "minimised" : sidebar,
    });

    useEffect(() => {
        document.documentElement.dataset.theme = explorerTheme;
    }, [explorerTheme]);

    const query = search.trim().toLowerCase();
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
                search={pageSearch}
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
            search: pageSearch,
        });
    }

    async function changeSetting(name: string, value: string): Promise<void> {
        await navigate({
            to: ".",
            search: readExplorerSearch({
                components,
                explorer,
                sidebar,
                [name]: value,
            }),
        });
    }

    function setSidebar(value: string): void {
        changeSetting("sidebar", value).catch(error => console.error("Could not change the sidebar.", error));
    }

    const aboutButton = (
        <IconButton
            onClick={() => setAboutOpen(true)}
            aria-label="About"
            title="About"
            className="fixed top-2 right-2 z-10"
        >
            <FontAwesomeIcon icon={faCircleInfo} />
        </IconButton>
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
                <IconButton
                    aria-label="Minimise sidebar"
                    title="Minimise sidebar"
                    size="small"
                    onClick={() => setSidebar("minimised")}
                >
                    <FontAwesomeIcon icon={faAnglesLeft} />
                </IconButton>
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
            <ul aria-label="Pages" className="flex flex-col gap-1">
                {matches.map(page => (
                    <li key={page.id}>{pageLink(page)}</li>
                ))}
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
            <div className="mt-auto flex flex-col gap-4">
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
                        changeSetting("components", value).catch(error => console.error("Could not change the component mode.", error));
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
                        changeSetting("explorer", value).catch(error => console.error("Could not change the explorer theme.", error));
                    }}
                />
            </div>
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
        <IconButton aria-label="Restore sidebar" title="Restore sidebar" onClick={() => setSidebar("open")}>
            <FontAwesomeIcon icon={narrow ? faBars : faAnglesRight} />
        </IconButton>
    );

    if (narrow) {
        return (
            <div className="min-h-screen">
                <div className="fixed top-2 left-2 z-10">{restoreButton}</div>
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
                <nav className="fixed top-2 left-2 z-10">{restoreButton}</nav>
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
