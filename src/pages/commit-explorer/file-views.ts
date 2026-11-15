//
// The ways a list of changed files shows, in the commit details pane and the Changes pane, and the
// order each way puts them in, so the arrow keys step through the files in the order they show.
//

import type { IChangedFile } from "./data";

//
// How the changed files are listed: full paths one per row, columns of file name and folder, or a
// tree of folders.
//
export type FileListView = "paths" | "columns" | "tree";

//
// One row of the tree view: a folder, or a file inside the folders above it.
//
export type TreeRow<File extends { path: string } = IChangedFile> =
    | {
          kind: "folder";

          //
          // The folder's name, or the names of a run of folders that each hold only the next one,
          // joined with "/", as in "frontend/src/components".
          //
          name: string;

          //
          // The folder's full path from the root of the repository, which drilling into it shows.
          //
          path: string;

          //
          // How many folders deep the row sits.
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
          // The file's name, without its folders.
          //
          name: string;

          //
          // How many folders deep the row sits.
          //
          depth: number;
      };

//
// A folder while the tree is being built: the folders and files directly inside it.
//
interface IFolder<File> {
    //
    // The folders inside, by name.
    //
    folders: Map<string, IFolder<File>>;

    //
    // The files inside.
    //
    files: File[];
}

//
// Lays the files out as a tree: each folder's subfolders first and then its files, both in name
// order, and a run of folders that each hold only the next one shown as one row. With `from`, a
// folder's path, the tree holds only the files inside that folder, drawn from it down.
//
export function treeRows<File extends { path: string }>(files: File[], from = ""): TreeRow<File>[] {
    const root: IFolder<File> = { folders: new Map(), files: [] };
    for (const file of files.filter(each => isUnder(each.path, from))) {
        const parts = (from === "" ? file.path : file.path.slice(from.length + 1)).split("/");
        let folder = root;
        for (const part of parts.slice(0, -1)) {
            let next = folder.folders.get(part);
            if (!next) {
                next = { folders: new Map(), files: [] };
                folder.folders.set(part, next);
            }
            folder = next;
        }
        folder.files.push(file);
    }
    const rows: TreeRow<File>[] = [];
    function addFolder(folder: IFolder<File>, depth: number, folderPath: string): void {
        for (const name of [...folder.folders.keys()].sort()) {
            let names = [name];
            let inner = folder.folders.get(name) as IFolder<File>;
            while (inner.files.length === 0 && inner.folders.size === 1) {
                const [onlyName, only] = [...inner.folders.entries()][0];
                names = [...names, onlyName];
                inner = only;
            }
            const path = [folderPath, ...names].filter(part => part !== "").join("/");
            rows.push({ kind: "folder", name: names.join("/"), path, depth });
            addFolder(inner, depth + 1, path);
        }
        for (const file of [...folder.files].sort((a, b) => a.path.localeCompare(b.path))) {
            rows.push({ kind: "file", file, name: file.path.slice(file.path.lastIndexOf("/") + 1), depth });
        }
    }
    addFolder(root, 0, from);
    return rows;
}

//
// Returns the files' paths in the order `view` lists them: Git's order for full paths and
// columns, and the tree's order for the tree, holding only the files inside `from` when the tree
// starts at a folder.
//
export function filePathsInViewOrder(files: { path: string }[], view: FileListView, from = "", collapsed: ReadonlySet<string> = new Set()): string[] {
    if (view === "tree") {
        return withoutCollapsed(treeRows(files, from), collapsed).flatMap(row => (row.kind === "file" ? [row.file.path] : []));
    }
    return files.map(file => file.path);
}

//
// Returns true when `path` lies inside the folder `folder`, a path from the root of the
// repository, or `folder` is empty, the root itself.
//
export function isUnder(path: string, folder: string): boolean {
    return folder === "" || path.startsWith(`${folder}/`);
}

//
// Returns the folder that holds `folder`, or empty for a folder at the root.
//
export function parentFolder(folder: string): string {
    const slash = folder.lastIndexOf("/");
    return slash < 0 ? "" : folder.slice(0, slash);
}

//
// Returns the rows of a list in the order `view` shows them, as the paths the keys move through:
// each file's path and, in the tree, each folder's path after `folderPrefix`, above its files.
//
export function rowPathsInViewOrder(files: { path: string }[], view: FileListView, from: string, folderPrefix: string, collapsed: ReadonlySet<string> = new Set()): string[] {
    if (view !== "tree") {
        return files.map(file => file.path);
    }
    return withoutCollapsed(treeRows(files, from), collapsed).map(row => (row.kind === "folder" ? `${folderPrefix}${row.path}` : row.file.path));
}

//
// Returns the tree's rows without the rows inside a collapsed folder, `collapsed` holding the
// collapsed folders' paths; a collapsed folder's own row stays.
//
export function withoutCollapsed<File extends { path: string }>(rows: TreeRow<File>[], collapsed: ReadonlySet<string>): TreeRow<File>[] {
    if (collapsed.size === 0) {
        return rows;
    }
    return rows.filter(row => {
        const path = row.kind === "folder" ? row.path : row.file.path;
        return ![...collapsed].some(folder => isUnder(path, folder));
    });
}

//
// The piece of tree line one indent column of a row draws: nothing, a line straight down for a
// folder above whose rows carry on below, a junction for an item with more items after it in its
// folder, or a corner for the last item in its folder.
//
export type TreeGuide = "none" | "line" | "tee" | "corner";

//
// Returns, for each row of the tree, the pieces of tree line its indent columns draw, one column
// per folder it sits inside: a line down where an outer folder's rows carry on, and a junction or
// a corner beside the row itself, joining it to its folder.
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
