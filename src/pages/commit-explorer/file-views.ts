//
// The ways a list of changed files shows, in the commit details pane and the Changes pane, and the
// order each way puts them in, so the arrow keys step through the files in the order they show.
//

import type { IChangedFile } from "./data";

//
// How the changed files are listed: full paths one per row, columns of file name and directory, or
// a tree of directories.
//
export type FileListView = "paths" | "columns" | "tree";

//
// One row of the tree view: a directory, or a file inside the directories above it.
//
export type TreeRow<File extends { path: string } = IChangedFile> =
    | {
          kind: "directory";

          //
          // The directory's name, or the names of a run of directories that each hold only the next
          // one, joined with "/", as in "frontend/src/components".
          //
          name: string;

          //
          // The directory's full path from the root of the repository, which drilling into it
          // shows.
          //
          path: string;

          //
          // How many directories deep the row sits.
          //
          depth: number;
      }
    | {
          kind: "file";

          //
          // The changed file.
          //
          file: File;

          //
          // The file's name, without its directories.
          //
          name: string;

          //
          // How many directories deep the row sits.
          //
          depth: number;
      };

//
// A directory while the tree is being built: the directories and files directly inside it.
//
interface IDirectory<File> {
    //
    // The directories inside, by name.
    //
    directories: Map<string, IDirectory<File>>;

    //
    // The files inside.
    //
    files: File[];
}

//
// Lays the files out as a tree: each directory's subdirectories first and then its files, both in
// name order, and a run of directories that each hold only the next one shown as one row. With
// `from`, a directory's path, the tree holds only the files inside that directory, drawn from it
// down.
//
export function treeRows<File extends { path: string }>(files: File[], from = ""): TreeRow<File>[] {
    const root: IDirectory<File> = { directories: new Map(), files: [] };
    for (const file of files.filter(each => isUnder(each.path, from))) {
        const parts = (from === "" ? file.path : file.path.slice(from.length + 1)).split("/");
        let directory = root;
        for (const part of parts.slice(0, -1)) {
            let next = directory.directories.get(part);
            if (!next) {
                next = { directories: new Map(), files: [] };
                directory.directories.set(part, next);
            }
            directory = next;
        }
        directory.files.push(file);
    }
    const rows: TreeRow<File>[] = [];
    function addDirectory(directory: IDirectory<File>, depth: number, directoryPath: string): void {
        for (const name of [...directory.directories.keys()].sort()) {
            let names = [name];
            let inner = directory.directories.get(name) as IDirectory<File>;
            while (inner.files.length === 0 && inner.directories.size === 1) {
                const [onlyName, only] = [...inner.directories.entries()][0];
                names = [...names, onlyName];
                inner = only;
            }
            const path = [directoryPath, ...names].filter(part => part !== "").join("/");
            rows.push({ kind: "directory", name: names.join("/"), path, depth });
            addDirectory(inner, depth + 1, path);
        }
        for (const file of [...directory.files].sort((a, b) => a.path.localeCompare(b.path))) {
            rows.push({ kind: "file", file, name: file.path.slice(file.path.lastIndexOf("/") + 1), depth });
        }
    }
    addDirectory(root, 0, from);
    return rows;
}

//
// Returns the files' paths in the order `view` lists them: Git's order for full paths and
// columns, and the tree's order for the tree, holding only the files inside `from` when the tree
// starts at a directory.
//
export function filePathsInViewOrder(files: { path: string }[], view: FileListView, from = "", collapsed: ReadonlySet<string> = new Set()): string[] {
    if (view === "tree") {
        return withoutCollapsed(treeRows(files, from), collapsed).flatMap(row => (row.kind === "file" ? [row.file.path] : []));
    }
    return files.map(file => file.path);
}

//
// Returns true when `path` lies inside the directory `directory`, a path from the root of the
// repository, or `directory` is empty, the root itself.
//
export function isUnder(path: string, directory: string): boolean {
    return directory === "" || path.startsWith(`${directory}/`);
}

//
// Returns the directory that holds `directory`, or empty for a directory at the root.
//
export function parentDirectory(directory: string): string {
    const slash = directory.lastIndexOf("/");
    return slash < 0 ? "" : directory.slice(0, slash);
}

//
// Returns the rows of a list in the order `view` shows them, as the paths the keys move through:
// each file's path and, in the tree, each directory's path after `directoryPrefix`, above its
// files.
//
export function rowPathsInViewOrder(files: { path: string }[], view: FileListView, from: string, directoryPrefix: string, collapsed: ReadonlySet<string> = new Set()): string[] {
    if (view !== "tree") {
        return files.map(file => file.path);
    }
    return withoutCollapsed(treeRows(files, from), collapsed).map(row => (row.kind === "directory" ? `${directoryPrefix}${row.path}` : row.file.path));
}

//
// Returns the tree's rows without the rows inside a collapsed directory, `collapsed` holding the
// collapsed directories' paths; a collapsed directory's own row stays.
//
export function withoutCollapsed<File extends { path: string }>(rows: TreeRow<File>[], collapsed: ReadonlySet<string>): TreeRow<File>[] {
    if (collapsed.size === 0) {
        return rows;
    }
    return rows.filter(row => {
        const path = row.kind === "directory" ? row.path : row.file.path;
        return ![...collapsed].some(directory => isUnder(path, directory));
    });
}

//
// The piece of tree line one indent column of a row draws: nothing, a line straight down for a
// directory above whose rows carry on below, a junction for an item with more items after it in its
// directory, or a corner for the last item in its directory.
//
export type TreeGuide = "none" | "line" | "tee" | "corner";

//
// Returns, for each row of the tree, the pieces of tree line its indent columns draw, one column
// per directory it sits inside: a line down where an outer directory's rows carry on, and a
// junction or a corner beside the row itself, joining it to its directory.
//
export function treeGuides(rows: { depth: number }[]): TreeGuide[][] {
    const isLast = rows.map((row, index) => {
        for (const later of rows.slice(index + 1)) {
            if (later.depth < row.depth) {
                return true;
            }
            if (later.depth === row.depth) {
                return false;
            }
        }
        return true;
    });
    const carriesOn: boolean[] = [];
    return rows.map((row, index) => {
        carriesOn[row.depth] = !isLast[index];
        return Array.from({ length: row.depth }, (_unused, column): TreeGuide => {
            if (column === row.depth - 1) {
                return isLast[index] ? "corner" : "tee";
            }
            return carriesOn[column + 1] ? "line" : "none";
        });
    });
}
