//
// The browser for finding a repository by walking the directories. It starts in the directory
// browsed to last, or the home directory. The directories show as a tree drawn with the same rows
// as the file trees, closed at first, with the Git icon on each repository: a click selects a
// directory, its +/- button opens or closes it in place, and its focus button, a double click or
// Enter goes into it. The search box shows when the toolbar's search button, Ctrl+F or typing
// opens it. Searching walks every directory under the one being looked at, which is slow on a
// real disk, so it runs only on Enter or the box's search button, and shows its matches as a tree,
// each under the directories above it. The Open repository button opens the
// selected repository or the one being looked at. The directories are the made-up ones in
// directories.ts.
//

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGitAlt } from "@fortawesome/free-brands-svg-icons";
import { faArrowUp, faChevronRight, faHouse, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { allDirectoriesUnder, directoryEntries, HOME_DIRECTORY, listDirectory, searchDirectories, type IDirectoryEntry, type IDirectorySearch } from "../directories";
import { crumbsOf, searchTreeRows, visibleRows, type IVisibleRow } from "../directory-rows";
import { directoryKeyAction } from "../../../components/tree-guides";
import { FilePathMenu } from "../../../components/file-path-menu";
import { TreeBar, TreeDirectoryRow } from "../../../components/tree-rows";
import { Tip } from "../../../components/tip";
import { isSearchKey } from "../../../components/search-box";

//
// Returns true for a key that types a character, which starts a search when no text box has the
// keys.
//
export function isTypingKey(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
    return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

//
// The key the directory browsed to last is kept under in the browser's storage, named for the
// style guide so it never meets another page's key.
//
const DIRECTORY_KEY = "graft-style-guide-browse-directory";

//
// The most directories expand all opens, so expanding a large tree such as a home directory stops
// rather than running on.
//
const EXPAND_ALL_MAX = 300;

//
// How long reading a directory of the example file system takes, in milliseconds, long enough to
// see "Reading…" in place of the breadcrumbs, as Graft waits on the disk.
//
const LISTING_READ_DELAY_MS = 200;

//
// How long the example search takes, in milliseconds, long enough to see "Searching…".
//
const SEARCH_DELAY_MS = 400;

//
// Reads the directory browsed to last, or the home directory when none was kept or the kept one is
// gone. Storage can be missing in a private window, which starts in the home directory and logs
// why.
//
export function readStoredDirectory(): string {
    let stored: string | null;
    try {
        stored = localStorage.getItem(DIRECTORY_KEY);
    }
    catch (error) {
        console.warn("The directory browsed to last could not be read from the browser's storage, so the browser starts in the home directory.", error);
        return HOME_DIRECTORY;
    }
    if (stored && listDirectory(stored)) {
        return stored;
    }
    return HOME_DIRECTORY;
}

//
// Keeps the directory browsed to, so the browser starts there next time. Storage can be missing in
// a private window, which logs why and keeps the directory for this visit only.
//
export function storeDirectory(path: string): void {
    try {
        localStorage.setItem(DIRECTORY_KEY, path);
    }
    catch (error) {
        console.warn("The directory browsed to could not be kept in the browser's storage, so the next visit starts in the home directory.", error);
    }
}

//
// Renders a muted line, for a tree that has nothing to show or is still being read.
//
export function QuietNote({ children }: { children: ReactNode }): ReactNode {
    return <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{children}</p>;
}

//
// Renders the browser: the home and up buttons, the breadcrumbs and the Open repository button,
// then the search box and the tree, which takes the rest of the browser's height and scrolls
// inside it. `onPick` is called with the repository to open.
//
export function DirectoryBrowser({ onPick }: { onPick: (path: string) => void }): ReactNode {
    const [path, setPath] = useState(readStoredDirectory);
    const [readPath, setReadPath] = useState<string | undefined>(undefined);
    const [found, setFound] = useState<IDirectorySearch | undefined>(undefined);
    const [isExpandCut, setIsExpandCut] = useState(false);
    const [selected, setSelected] = useState<IDirectoryEntry | undefined>(undefined);
    const [draft, setDraft] = useState("");
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
    const [searchCollapsed, setSearchCollapsed] = useState<ReadonlySet<string>>(new Set());
    const searchRef = useRef<HTMLInputElement>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const listRef = useRef<HTMLUListElement>(null);
    const selectedRef = useRef<HTMLLIElement>(null);
    //
    // The directory being looked at, once its example listing has been read after a short wait.
    //
    const listing = readPath === path ? listDirectory(path) : undefined;

    useEffect(() => {
        selectedRef.current?.scrollIntoView({ block: "nearest" });
    }, [selected]);

    //
    // Going into another directory starts it afresh: nothing selected, no search and every
    // directory closed.
    //
    useEffect(() => {
        setSelected(undefined);
        setDraft("");
        setQuery("");
        setExpanded(new Set());
        setSearchCollapsed(new Set());
        setIsExpandCut(false);
        storeDirectory(path);
        const timer = window.setTimeout(() => setReadPath(path), LISTING_READ_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [path]);

    //
    // Runs the search Enter or the search button started after a short wait, so "Searching…" shows
    // meanwhile.
    //
    useEffect(() => {
        setFound(undefined);
        if (query.trim() === "") {
            return undefined;
        }
        const timer = window.setTimeout(() => setFound(searchDirectories(path, query)), SEARCH_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [path, query]);

    //
    // Typing anywhere on the page, outside another text box, opens the search box and types into
    // it. A key a handler on the page has already acted on is left alone.
    //
    useEffect(() => {
        function startSearch(event: globalThis.KeyboardEvent): void {
            if (event.defaultPrevented) {
                return;
            }
            const target = event.target;
            const isInTextBox = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
            if (isInTextBox || !isTypingKey(event)) {
                return;
            }
            event.preventDefault();
            setIsSearchOpen(true);
            searchRef.current?.focus();
            setDraft(text => text + event.key);
        }
        window.addEventListener("keydown", startSearch);
        return () => window.removeEventListener("keydown", startSearch);
    }, []);

    const repositoryPath = selected?.isRepository ? selected.path : listing?.isRepository ? listing.path : undefined;
    const isSearching = query.trim() !== "";
    const searchRows = found ? searchTreeRows(found.path, found.matches, searchCollapsed) : [];
    const rows: IVisibleRow[] = isSearching ? searchRows : visibleRows(listing?.entries ?? [], expanded, directoryEntries);
    const matchedPaths = new Set(searchRows.filter(row => row.isMatch).map(row => row.entry.path));

    //
    // Goes into the directory at `target`. The keys move to the tree, as the row that held them no
    // longer shows.
    //
    function goTo(target: string): void {
        listRef.current?.focus();
        setPath(target);
    }

    //
    // Closes a directory of the search's tree, hiding the matches under it, or opens it again.
    //
    function toggleSearchDirectory(entry: IDirectoryEntry): void {
        setSearchCollapsed(current => {
            const next = new Set(current);
            if (next.has(entry.path)) {
                next.delete(entry.path);
            }
            else {
                next.add(entry.path);
            }
            return next;
        });
    }

    //
    // Opens a directory of the tree in place, showing the directories inside it, or closes it.
    //
    function toggleDirectory(entry: IDirectoryEntry): void {
        setExpanded(current => {
            const next = new Set(current);
            if (next.has(entry.path)) {
                next.delete(entry.path);
            }
            else {
                next.add(entry.path);
            }
            return next;
        });
    }

    //
    // Opens every directory under the one being looked at, stopping after EXPAND_ALL_MAX and saying
    // so.
    //
    function expandAll(): void {
        const opened = allDirectoriesUnder(path, EXPAND_ALL_MAX);
        setExpanded(new Set(opened.paths));
        setIsExpandCut(opened.isCut);
    }

    //
    // Closes every directory of the tree.
    //
    function collapseAll(): void {
        setExpanded(new Set());
        setIsExpandCut(false);
    }

    //
    // Starts searching for what is typed, from Enter or the search button.
    //
    function runSearch(): void {
        setQuery(draft);
        setSearchCollapsed(new Set());
    }

    //
    // Ends the search and hides its box, so the tree shows again with the keys in it.
    //
    function clearSearch(): void {
        setDraft("");
        setQuery("");
        setIsSearchOpen(false);
        listRef.current?.focus();
    }

    //
    // Shows the search box, which takes the keys as it mounts, or hides it and ends the search.
    //
    function toggleSearch(): void {
        if (isSearchOpen) {
            clearSearch();
        }
        else {
            setIsSearchOpen(true);
        }
    }

    //
    // Runs the search on Enter, or goes into the only match when Enter is pressed again; moves
    // the keys to the tree on Down; and ends the search on Escape.
    //
    function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        const first = rows[0];
        if (event.key === "Enter") {
            event.preventDefault();
            if (draft !== query) {
                runSearch();
            }
            else if (rows.length === 1 && first) {
                setPath(first.entry.path);
            }
        }
        else if (event.key === "ArrowDown" && first) {
            event.preventDefault();
            listRef.current?.focus();
            const isShown = selected !== undefined && rows.some(row => row.entry.path === selected.path);
            setSelected(isShown && selected ? selected : first.entry);
        }
        else if (event.key === "Escape") {
            clearSearch();
        }
    }

    //
    // Moves through the tree and acts on the selected directory: Up and Down move the selection,
    // Right opens and Left closes or goes to the directory above in the tree, E or Space opens or
    // closes, F or Enter goes into it, U or Backspace goes up a directory and A expands or
    // collapses every directory. Any other character goes on to the page, which starts a search
    // with it.
    //
    function onListKeyDown(event: KeyboardEvent<HTMLUListElement>): void {
        if ((event.key === "Enter" || event.key === " ") && event.target instanceof HTMLElement && event.target.closest("button") !== null) {
            return;
        }
        const index = selected ? rows.findIndex(row => row.entry.path === selected.path) : -1;
        const current = rows[index];
        //
        // A directory key held with Ctrl, Meta or Alt belongs to the browser or the system.
        //
        const action = event.ctrlKey || event.metaKey || event.altKey ? undefined : directoryKeyAction(event);
        if (action === "toggle" && current) {
            event.preventDefault();
            if (isSearching) {
                toggleSearchDirectory(current.entry);
            }
            else {
                toggleDirectory(current.entry);
            }
        }
        else if (action === "focus" && selected) {
            event.preventDefault();
            goTo(selected.path);
        }
        else if (action === "up" && listing?.parent) {
            event.preventDefault();
            goTo(listing.parent);
        }
        else if (action === "all" && isSearching) {
            event.preventDefault();
            const searchDirectories = rows.map(row => row.entry.path);
            setSearchCollapsed(collapsed => (searchDirectories.some(directory => !collapsed.has(directory)) ? new Set(searchDirectories) : new Set()));
        }
        else if (action === "all" && !isSearching) {
            event.preventDefault();
            if (expanded.size > 0) {
                collapseAll();
            }
            else {
                expandAll();
            }
        }
        else if (event.key === "ArrowDown") {
            event.preventDefault();
            const next = rows[Math.min(index + 1, rows.length - 1)];
            if (next) {
                setSelected(next.entry);
            }
        }
        else if (event.key === "ArrowUp") {
            event.preventDefault();
            const previous = rows[index - 1];
            if (previous) {
                setSelected(previous.entry);
            }
            else {
                searchRef.current?.focus();
            }
        }
        else if (event.key === "Enter" && selected) {
            event.preventDefault();
            goTo(selected.path);
        }
        else if (!isSearching && event.key === "ArrowRight" && current) {
            event.preventDefault();
            if (!expanded.has(current.entry.path)) {
                toggleDirectory(current.entry);
            }
        }
        else if (!isSearching && event.key === "ArrowLeft" && current) {
            event.preventDefault();
            if (expanded.has(current.entry.path)) {
                toggleDirectory(current.entry);
            }
            else {
                const parent = rows.slice(0, index).reverse().find(row => row.depth < current.depth);
                if (parent) {
                    setSelected(parent.entry);
                }
            }
        }
        else if (event.key === "Backspace" && listing?.parent) {
            event.preventDefault();
            goTo(listing.parent);
        }
    }

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col"
            style={{ gap: "var(--space-3)" }}
            onKeyDownCapture={event => {
                //
                // Ctrl+F shows the search box, or puts the keys back in it when it shows.
                //
                if (isSearchKey(event)) {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsSearchOpen(true);
                    searchRef.current?.focus();
                }
            }}
        >
            <div className="flex flex-none flex-wrap items-center" style={{ gap: "var(--space-2)" }}>
                <Tooltip title="Home directory">
                    <IconButton size="small" aria-label="Home directory" onClick={() => setPath(HOME_DIRECTORY)}>
                        <FontAwesomeIcon icon={faHouse} style={{ fontSize: "var(--icon-sm)" }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Up one directory">
                    <span>
                        <IconButton size="small" aria-label="Up one directory" disabled={!listing?.parent} onClick={() => setPath(listing?.parent ?? path)}>
                            <FontAwesomeIcon icon={faArrowUp} style={{ fontSize: "var(--icon-sm)" }} />
                        </IconButton>
                    </span>
                </Tooltip>
                <div className="min-w-0 flex-1" style={{ flexBasis: "calc(var(--space-8) * 6)" }}>
                    {listing ? (
                        <Breadcrumbs
                            aria-label="Directory path"
                            maxItems={8}
                            itemsBeforeCollapse={2}
                            itemsAfterCollapse={4}
                            separator={<FontAwesomeIcon icon={faChevronRight} style={{ fontSize: "var(--icon-sm)", color: "var(--color-text-muted)" }} />}
                            sx={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", "& .MuiBreadcrumbs-separator": { margin: "0 var(--space-2)" }, "& .MuiBreadcrumbs-ol": { flexWrap: "wrap" } }}
                        >
                            {crumbsOf(path).map((crumb, index, crumbs) =>
                                index === crumbs.length - 1 ? (
                                    <span key={crumb.path} aria-current="page" style={{ color: "var(--color-text)", fontWeight: "var(--weight-bold)" }}>
                                        {crumb.name}
                                    </span>
                                ) : (
                                    <button
                                        key={crumb.path}
                                        type="button"
                                        onClick={() => setPath(crumb.path)}
                                        className="cursor-pointer hover:underline"
                                        style={{ color: "var(--color-text-muted)", background: "none", border: "none", padding: 0, font: "inherit" }}
                                    >
                                        {crumb.name}
                                    </button>
                                ),
                            )}
                        </Breadcrumbs>
                    ) : (
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Reading…</span>
                    )}
                </div>
                <Tooltip title={<Tip title="Search the directories" detail="Keys: Ctrl+F, or start typing" />}>
                    <IconButton size="small" aria-label="Search the directories" aria-pressed={isSearchOpen} onClick={toggleSearch}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-sm)" }} />
                    </IconButton>
                </Tooltip>
                <Button
                    variant="contained"
                    disabled={!repositoryPath}
                    onClick={() => {
                        if (repositoryPath) {
                            onPick(repositoryPath);
                        }
                    }}
                >
                    Open repository
                </Button>
            </div>
            {isSearchOpen ? (
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Search the directories"
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={onSearchKeyDown}
                    inputRef={searchRef}
                    autoFocus
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-sm)" }} />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end" sx={{ gap: "var(--space-1)" }}>
                                    <Tooltip title={<Tip title="Search" detail="Key: Enter. Searching walks every directory below, so it waits for Enter." />}>
                                        <span>
                                            <IconButton size="small" aria-label="Search" disabled={draft.trim() === "" || draft === query} onClick={runSearch}>
                                                <FontAwesomeIcon icon={faMagnifyingGlass} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    {draft !== "" || isSearching ? (
                                        <Tooltip title="Clear the search">
                                            <IconButton size="small" aria-label="Clear the search" onClick={clearSearch} edge="end">
                                                <FontAwesomeIcon icon={faXmark} />
                                            </IconButton>
                                        </Tooltip>
                                    ) : undefined}
                                </InputAdornment>
                            ),
                        },
                        htmlInput: {
                            "aria-label": "Search the directories",
                            spellCheck: false,
                        },
                    }}
                />
            ) : undefined}
            {listing && listing.entries.length === 0 ? <QuietNote>This directory has no directories inside it.</QuietNote> : undefined}
            {isSearching && !found ? <QuietNote>Searching…</QuietNote> : undefined}
            {isSearching && found && found.matches.length === 0 ? <QuietNote>No directory under this one matches the search.</QuietNote> : undefined}
            {isExpandCut ? <QuietNote>Expand all stopped after {EXPAND_ALL_MAX} directories. Go into a directory nearer the one you want to expand all of it.</QuietNote> : undefined}
            {rows.length > 0 ? (
                <List
                    ref={listRef}
                    tabIndex={0}
                    onKeyDown={onListKeyDown}
                    aria-label="Directories"
                    sx={{
                        //
                        // The list takes the height the browser has left under its bar and search
                        // box, and scrolls inside it.
                        //
                        flex: "1 1 auto",
                        minHeight: "calc(var(--space-8) * 4)",
                        overflowY: "auto",
                        padding: "var(--space-2)",
                        outline: "none",
                        background: "var(--color-panel)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-lg)",
                        "&:focus-visible": {
                            boxShadow: "0 0 0 var(--focus-ring-width) var(--color-focus)",
                        },
                    }}
                >
                    {isSearching ? (
                        <TreeBar focusedPath="" onBack={() => undefined} onExpandAll={() => setSearchCollapsed(new Set())} onCollapseAll={() => setSearchCollapsed(new Set(searchRows.map(row => row.entry.path)))} hasAllButtons />
                    ) : (
                        <TreeBar focusedPath="" onBack={() => undefined} onExpandAll={expandAll} onCollapseAll={collapseAll} hasAllButtons />
                    )}
                    {rows.map(row => {
                        const isSelected = row.entry.path === selected?.path;
                        return (
                            <TreeDirectoryRow
                                key={row.entry.path}
                                path={row.entry.path}
                                name={row.entry.name}
                                guides={row.guides}
                                isCollapsed={isSearching ? searchCollapsed.has(row.entry.path) : !expanded.has(row.entry.path)}
                                isSelected={isSelected}
                                isHighlighted={matchedPaths.has(row.entry.path)}
                                isOpen={false}
                                icon={row.entry.isRepository ? <FontAwesomeIcon icon={faGitAlt} aria-label="Git repository" style={{ fontSize: "calc(var(--icon-sm) + 2px)", color: "var(--color-text)", flex: "none" }} /> : undefined}
                                tint={undefined}
                                isDiscarded={false}
                                lead={undefined}
                                menu={<FilePathMenu path={row.entry.path} repoRoot="" kind="working-directory" />}
                                trail={undefined}
                                rowRef={isSelected ? selectedRef : undefined}
                                onSelect={() => setSelected(row.entry)}
                                onToggle={isSearching ? () => toggleSearchDirectory(row.entry) : () => toggleDirectory(row.entry)}
                                onFocus={() => goTo(row.entry.path)}
                            />
                        );
                    })}
                </List>
            ) : undefined}
        </div>
    );
}
