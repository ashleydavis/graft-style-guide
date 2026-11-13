//
// The explorer's frame: a sidebar to search for and choose a page, the component mode and
// explorer theme switches and the chosen page beside them.
//

import { useEffect, useState, type ReactNode } from "react";
import { SettingSwitch } from "./setting-switch";
import { Link, Outlet, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { explorerPages } from "../explorer-pages";
import { readExplorerSearch } from "../lib/explorer-mode";

//
// Renders the sidebar and the page the router has chosen. Pressing Enter in the search box
// opens the first page that matches. The component mode switch sets ?components= in the URL
// and the explorer theme switch sets ?explorer=, which also sets data-theme on the page.
//
export function ExplorerLayout(): ReactNode {
    const [search, setSearch] = useState("");
    const navigate = useNavigate();
    const { pageId } = useParams({
        strict: false,
    });
    const { components, explorer } = useSearch({
        strict: false,
    });
    const componentMode = components ?? "both";
    const explorerTheme = explorer ?? "light";

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
            search: true,
        });
    }

    async function changeSetting(name: string, value: string): Promise<void> {
        await navigate({
            to: ".",
            search: readExplorerSearch({
                components,
                explorer,
                [name]: value,
            }),
        });
    }

    return (
        <div className="flex min-h-screen">
            <nav
                className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-3 p-4"
                style={{
                    background: "var(--color-panel)",
                    borderRight: "1px solid var(--color-border)",
                }}
            >
                <div
                    style={{
                        fontSize: "var(--text-lg)",
                        fontWeight: "var(--weight-bold)",
                    }}
                >
                    Graft style explorer
                </div>
                <TextField
                    placeholder="Search components"
                    size="small"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === "Enter") {
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
                <ul className="flex flex-col gap-1">
                    {matches.map(page => (
                        <li key={page.id}>
                            <Link
                                to="/page/$pageId"
                                params={{
                                    pageId: page.id,
                                }}
                                search={true}
                                className="block px-3 py-1.5"
                                style={{
                                    borderRadius: "var(--radius-md)",
                                    color: page.id === pageId ? "var(--color-on-accent)" : "var(--color-text)",
                                    background: page.id === pageId ? "var(--color-accent)" : "transparent",
                                }}
                            >
                                {page.title}
                            </Link>
                        </li>
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
                                label: "Light next to dark",
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
            </nav>
            <main className="min-w-0 flex-1 p-8">
                <Outlet />
            </main>
        </div>
    );
}
