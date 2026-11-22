//
// The icons page: every Font Awesome icon the style guide's packages hold, solid and brands, with
// a search box that narrows them by name, so the right icon can be found and its import name
// copied.
//

import { useState, type ReactNode } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition, IconPack } from "@fortawesome/fontawesome-svg-core";
import { FilterBox, matchesSearch, useDebouncedQuery } from "../../components/search-box";

//
// One icon as the page lists it.
//
export interface IIconEntry {
    //
    // The icon itself, drawn in its tile.
    //
    icon: IconDefinition;

    //
    // The name code imports the icon by, such as faAnglesDown.
    //
    importName: string;

    //
    // The other names the package exports the same icon under, which the search matches too.
    //
    aliases: string[];

    //
    // The package code imports the icon from.
    //
    packageName: string;
}

//
// Returns the import name Font Awesome gives an icon called `iconName`: "fa" and the name in
// PascalCase, so "angles-down" becomes "faAnglesDown".
//
export function importNameOf(iconName: string): string {
    const words = iconName.split("-");
    return `fa${words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("")}`;
}

//
// Returns one entry per icon in `pack`, sorted by name. A pack exports some icons under several
// names; each icon is listed once under the name its own icon name gives, with the rest kept as
// aliases.
//
export function iconEntriesOf(pack: IconPack, packageName: string): IIconEntry[] {
    const byIconName = new Map<string, { icon: IconDefinition; names: string[] }>();
    for (const [name, icon] of Object.entries(pack)) {
        const group = byIconName.get(icon.iconName);
        if (group) {
            group.names.push(name);
        }
        else {
            byIconName.set(icon.iconName, { icon, names: [name] });
        }
    }
    const entries = [...byIconName.values()].map(group => {
        const canonical = importNameOf(group.icon.iconName);
        const importName = group.names.includes(canonical) ? canonical : group.names[0];
        return {
            icon: group.icon,
            importName,
            aliases: group.names.filter(name => name !== importName),
            packageName,
        };
    });
    return entries.sort((left, right) => left.icon.iconName.localeCompare(right.icon.iconName));
}

//
// Every icon on the page, in the two packages the style guide depends on. Worked out once when
// the module loads, because the packs never change while the page runs.
//
const ICON_SETS = [
    {
        title: "Solid",
        entries: iconEntriesOf(fas, "@fortawesome/free-solid-svg-icons"),
    },
    {
        title: "Brands",
        entries: iconEntriesOf(fab, "@fortawesome/free-brands-svg-icons"),
    },
];

//
// Returns true when `entry` matches `query` by its icon name, its import name or an alias.
//
export function isIconMatch(entry: IIconEntry, query: string): boolean {
    return [entry.icon.iconName, entry.importName, ...entry.aliases].some(name => matchesSearch(name, query));
}

//
// Renders the search box, the count of icons that match, and a grid of the matching icons for
// each package. A click on an icon copies its import name.
//
export function IconsPage(): ReactNode {
    const [draft, setDraft] = useState("");
    const { query } = useDebouncedQuery(draft);
    const [copiedName, setCopiedName] = useState<string | undefined>(undefined);
    const total = ICON_SETS.reduce((sum, set) => sum + set.entries.length, 0);
    const shownSets = ICON_SETS.map(set => ({
        title: set.title,
        entries: set.entries.filter(entry => isIconMatch(entry, query)),
    }));
    const shownCount = shownSets.reduce((sum, set) => sum + set.entries.length, 0);

    function copy(importName: string): void {
        navigator.clipboard
            .writeText(importName)
            .then(() => setCopiedName(importName))
            .catch(error => {
                console.error(`Could not copy "${importName}" to the clipboard: ${String(error)}. Nothing was copied, so look at whether the page is allowed to use the clipboard.`);
            });
    }

    return (
        <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
            <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                <FilterBox value={draft} onChange={setDraft} label="Search icons" placeholder="Search icons by name" />
                <p aria-live="polite" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    {query.trim() === "" ? `${total} icons. Click an icon to copy its import name.` : `${shownCount} of ${total} icons match.`}
                </p>
            </div>
            {shownSets.map(set =>
                set.entries.length === 0 ? undefined : (
                    <section key={set.title} aria-label={`${set.title} icons`}>
                        <h2 className="mb-3" style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)" }}>
                            {set.title} ({set.entries.length})
                        </h2>
                        <ul className="grid" style={{ gap: "var(--space-2)", gridTemplateColumns: "repeat(auto-fill, minmax(calc(var(--space-8) * 4), 1fr))", margin: 0, padding: 0, listStyle: "none" }}>
                            {set.entries.map(entry => (
                                <li key={entry.importName}>
                                    <ButtonBase
                                        aria-label={`Copy ${entry.importName}`}
                                        title={`${entry.importName} from ${entry.packageName}${entry.aliases.length > 0 ? `, also ${entry.aliases.join(", ")}` : ""}`}
                                        onClick={() => copy(entry.importName)}
                                        className="flex w-full flex-col items-center"
                                        sx={{
                                            gap: "var(--space-2)",
                                            padding: "var(--space-3) var(--space-2)",
                                            border: "1px solid var(--color-border)",
                                            borderRadius: "var(--radius-md)",
                                            color: "var(--color-text)",
                                            "&:hover": { backgroundColor: "var(--color-hover)" },
                                            "&.Mui-focusVisible": { boxShadow: "0 0 0 var(--focus-ring-width) var(--color-focus)" },
                                        }}
                                    >
                                        <FontAwesomeIcon icon={entry.icon} style={{ fontSize: "var(--icon-lg)" }} />
                                        <span className="w-full truncate text-center" style={{ fontSize: "var(--text-xs)", color: copiedName === entry.importName ? "var(--color-success)" : "var(--color-text-muted)" }}>
                                            {copiedName === entry.importName ? "Copied" : entry.importName}
                                        </span>
                                    </ButtonBase>
                                </li>
                            ))}
                        </ul>
                    </section>
                ),
            )}
            {shownCount === 0 ? <p style={{ color: "var(--color-text-muted)" }}>No icon matches the search.</p> : undefined}
        </div>
    );
}
