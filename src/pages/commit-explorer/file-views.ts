//
// The ways the commit details pane lists a commit's changed files, and the order each way puts
// them in, so the arrow keys step through the files in the order they show.
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
export type TreeRow =
    | {
          kind: "folder";

          //
          // The folder's name, or the names of a run of folders that each hold only the next one,
          // joined with "/", as in "frontend/src/components".
          //
          name: string;

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
          file: IChangedFile;

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
interface IFolder {
    //
    // The folders inside, by name.
    //
    folders: Map<string, IFolder>;

    //
    // The files inside.
    //
    files: IChangedFile[];
}

//
// Lays the files out as a tree: each folder's subfolders first and then its files, both in name
// order, and a run of folders that each hold only the next one shown as one row.
//
export function treeRows(files: IChangedFile[]): TreeRow[] {
    const root: IFolder = { folders: new Map(), files: [] };
    for (const file of files) {
        const parts = file.path.split("/");
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
    const rows: TreeRow[] = [];
    function addFolder(folder: IFolder, depth: number): void {
        for (const name of [...folder.folders.keys()].sort()) {
            let names = [name];
            let inner = folder.folders.get(name) as IFolder;
            while (inner.files.length === 0 && inner.folders.size === 1) {
                const [onlyName, only] = [...inner.folders.entries()][0];
                names = [...names, onlyName];
                inner = only;
            }
            rows.push({ kind: "folder", name: names.join("/"), depth });
            addFolder(inner, depth + 1);
        }
        for (const file of [...folder.files].sort((a, b) => a.path.localeCompare(b.path))) {
            rows.push({ kind: "file", file, name: file.path.slice(file.path.lastIndexOf("/") + 1), depth });
        }
    }
    addFolder(root, 0);
    return rows;
}

//
// Returns the files' paths in the order `view` lists them: Git's order for full paths and
// columns, and the tree's order for the tree.
//
export function filePathsInViewOrder(files: IChangedFile[], view: FileListView): string[] {
    if (view === "tree") {
        return treeRows(files).flatMap(row => (row.kind === "file" ? [row.file.path] : []));
    }
    return files.map(file => file.path);
}
