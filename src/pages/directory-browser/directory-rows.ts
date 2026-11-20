//
// The rows the directory browser draws: the breadcrumbs of the directory being looked at, the
// tree of directories under it with the open ones' contents, and a search's matches laid out as a
// tree under the directories above them.
//

import { treeGuides, type TreeGuide } from "../commit-explorer/file-views";
import type { IDirectoryEntry, IDirectoryMatch } from "./directories";

//
// One step of the breadcrumbs: a directory's name and its full path, which a click goes to.
//
export interface ICrumb {
    //
    // The name the crumb shows: "/" for the top of the file system.
    //
    name: string;

    //
    // The directory's full path.
    //
    path: string;
}

//
// Returns the breadcrumbs of `path`, from the top of the file system down to the directory itself.
//
export function crumbsOf(path: string): ICrumb[] {
    const crumbs: ICrumb[] = [
        {
            name: "/",
            path: "/",
        },
    ];
    let prefix = "";
    for (const part of path.split("/").filter(name => name !== "")) {
        prefix = `${prefix}/${part}`;
        crumbs.push({
            name: part,
            path: prefix,
        });
    }
    return crumbs;
}

//
// One row of the tree: a directory, how deep it sits and its tree lines.
//
export interface IVisibleRow {
    //
    // The directory the row stands for.
    //
    entry: IDirectoryEntry;

    //
    // How many directories deep the row sits under the directory being looked at.
    //
    depth: number;

    //
    // The row's tree lines.
    //
    guides: TreeGuide[];
}

//
// Returns the rows of the tree: each directory of `entries`, and under each open directory, in
// `expanded`, the directories `listChildren` reads inside it, drawn one level in.
//
export function visibleRows(entries: IDirectoryEntry[], expanded: ReadonlySet<string>, listChildren: (path: string) => IDirectoryEntry[]): IVisibleRow[] {
    const rows: { entry: IDirectoryEntry; depth: number }[] = [];
    const pending = entries.map(entry => ({ entry, depth: 0 })).reverse();
    while (pending.length > 0) {
        const next = pending.pop();
        if (!next) {
            break;
        }
        rows.push(next);
        if (expanded.has(next.entry.path)) {
            for (const child of [...listChildren(next.entry.path)].reverse()) {
                pending.push({ entry: child, depth: next.depth + 1 });
            }
        }
    }
    const guides = treeGuides(rows);
    return rows.map((row, index) => ({ ...row, guides: guides[index] ?? [] }));
}

//
// One row of a search's tree: a match, or a directory above matches that the search did not match
// itself.
//
export interface ISearchRow extends IVisibleRow {
    //
    // Whether the directory matched the search, which draws its name in the text colour.
    //
    isMatch: boolean;
}

//
// Returns a search's matches as a tree under `base`, the directory searched: each match under the
// directories between it and `base`, which are added as rows of their own, in name order. The rows
// inside a directory in `collapsed` are left out.
//
export function searchTreeRows(base: string, matches: IDirectoryMatch[], collapsed: ReadonlySet<string>): ISearchRow[] {
    const prefix = base.endsWith("/") ? base : `${base}/`;
    const byPath = new Map<string, { entry: IDirectoryEntry; isMatch: boolean; parts: string[] }>();
    for (const match of matches) {
        const parts = match.relativePath.split("/");
        for (let index = 1; index < parts.length; index += 1) {
            const relative = parts.slice(0, index).join("/");
            if (!byPath.has(relative)) {
                byPath.set(relative, { entry: { name: parts[index - 1] ?? "", path: `${prefix}${relative}`, isRepository: false }, isMatch: false, parts: parts.slice(0, index) });
            }
        }
        byPath.set(match.relativePath, { entry: match, isMatch: true, parts });
    }
    const ordered = [...byPath.values()].sort((first, second) => {
        const length = Math.min(first.parts.length, second.parts.length);
        for (let index = 0; index < length; index += 1) {
            const order = (first.parts[index] ?? "").localeCompare(second.parts[index] ?? "");
            if (order !== 0) {
                return order;
            }
        }
        return first.parts.length - second.parts.length;
    });
    const shown = ordered.filter(row => !row.parts.some((_part, index) => index < row.parts.length - 1 && collapsed.has(`${prefix}${row.parts.slice(0, index + 1).join("/")}`)));
    const rows = shown.map(row => ({ entry: { ...row.entry, name: row.parts[row.parts.length - 1] ?? row.entry.name }, depth: row.parts.length - 1, isMatch: row.isMatch }));
    const guides = treeGuides(rows);
    return rows.map((row, index) => ({ ...row, guides: guides[index] ?? [] }));
}
