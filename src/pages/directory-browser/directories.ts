//
// The made-up directories the directory browser example walks: a home directory with a few
// projects, some of them Git repositories, and the reads the browser makes of them. In Graft the
// backend reads the real directories; here these stand in for it, so every part of the browser
// works without one.
//

//
// One directory inside the directory being looked at.
//
export interface IDirectoryEntry {
    //
    // The directory's name.
    //
    name: string;

    //
    // The directory's full path.
    //
    path: string;

    //
    // Whether the directory is a Git repository, which shows the Git icon in place of the directory
    // icon.
    //
    isRepository: boolean;
}

//
// A directory as the browser reads it: where it is, whether it is a repository, the directory
// above it and the directories inside it.
//
export interface IDirectoryListing {
    //
    // The directory's full path.
    //
    path: string;

    //
    // The directory above, or undefined at the top of the file system.
    //
    parent: string | undefined;

    //
    // Whether the directory is a Git repository, so the Open repository button can open it.
    //
    isRepository: boolean;

    //
    // The directories inside it, in name order.
    //
    entries: IDirectoryEntry[];
}

//
// A directory a search found, with its path from the directory searched, so the results can be
// drawn as a tree under the directories above them.
//
export interface IDirectoryMatch extends IDirectoryEntry {
    //
    // The path from the directory searched, its names joined with "/".
    //
    relativePath: string;
}

//
// What a search under a directory found.
//
export interface IDirectorySearch {
    //
    // The full path of the directory searched.
    //
    path: string;

    //
    // The directories whose name holds the search, in the order they were found.
    //
    matches: IDirectoryMatch[];
}

//
// One made-up directory and the directories inside it.
//
export interface IExampleDirectory {
    //
    // The directory's name.
    //
    name: string;

    //
    // Whether it is a Git repository.
    //
    isRepository: boolean;

    //
    // The directories inside it.
    //
    children: IExampleDirectory[];
}

//
// Returns a made-up directory, so the example tree below reads as a tree.
//
export function directory(name: string, isRepository: boolean, children: IExampleDirectory[]): IExampleDirectory {
    return {
        name,
        isRepository,
        children,
    };
}

//
// The made-up file system, from its top. The home directory holds projects nested three and four
// levels deep, so expand all, focusing on a directory and the search all have something to show.
//
export const exampleFileSystem: IExampleDirectory = directory("", false, [
    directory("home", false, [
        directory("you", false, [
            directory("Documents", false, [directory("receipts", false, []), directory("talks", false, [directory("graft-demo", true, [directory("slides", false, [])])])]),
            directory("Downloads", false, []),
            directory("projects", false, [
                directory("archive", false, [directory("old-site", true, [directory("public", false, []), directory("src", false, [])])]),
                directory("diff-tool", true, [directory("docs", false, []), directory("src", false, []), directory("viewer", false, [directory("src", false, [directory("components", false, []), directory("pages", false, [])])])]),
                directory("graft", true, [directory("docs", false, []), directory("src", false, [directory("components", false, []), directory("lib", false, []), directory("pages", false, [])])]),
                directory("notes", false, [directory("2025", false, []), directory("2026", false, [])]),
            ]),
        ]),
    ]),
]);

//
// The home directory, where the browser starts.
//
export const HOME_DIRECTORY = "/home/you";

//
// Returns the full path of `name` inside the directory at `path`.
//
export function childPath(path: string, name: string): string {
    if (path === "/") {
        return `/${name}`;
    }
    return `${path}/${name}`;
}

//
// Returns the directory above `path`, or undefined for the top of the file system.
//
export function parentPath(path: string): string | undefined {
    if (path === "/") {
        return undefined;
    }
    const slash = path.lastIndexOf("/");
    if (slash <= 0) {
        return "/";
    }
    return path.slice(0, slash);
}

//
// Returns the made-up directory at the full path `path`, or undefined when there is none.
//
export function exampleDirectoryAt(path: string): IExampleDirectory | undefined {
    let current: IExampleDirectory | undefined = exampleFileSystem;
    for (const name of path.split("/").filter(part => part !== "")) {
        current = current?.children.find(child => child.name === name);
    }
    return current;
}

//
// Returns the directories inside the directory at `path`, in name order, or none when there is no
// such directory.
//
export function directoryEntries(path: string): IDirectoryEntry[] {
    const found = exampleDirectoryAt(path);
    if (!found) {
        return [];
    }
    return [...found.children]
        .sort((first, second) => first.name.localeCompare(second.name))
        .map(child => ({
            name: child.name,
            path: childPath(path, child.name),
            isRepository: child.isRepository,
        }));
}

//
// Reads the directory at `path` as the browser shows it, or undefined when there is no such
// directory.
//
export function listDirectory(path: string): IDirectoryListing | undefined {
    const found = exampleDirectoryAt(path);
    if (!found) {
        return undefined;
    }
    return {
        path,
        parent: parentPath(path),
        isRepository: found.isRepository,
        entries: directoryEntries(path),
    };
}

//
// Returns every directory under `path`, at any depth, whose name holds `text`, ignoring case. The
// search walks the made-up tree breadth first, so nearer matches come first.
//
export function searchDirectories(path: string, text: string): IDirectorySearch {
    const needle = text.trim().toLowerCase();
    const matches: IDirectoryMatch[] = [];
    const pending = directoryEntries(path).map(entry => ({
        entry,
        relativePath: entry.name,
    }));
    while (pending.length > 0) {
        const next = pending.shift();
        if (!next) {
            break;
        }
        if (needle !== "" && next.entry.name.toLowerCase().includes(needle)) {
            matches.push({
                ...next.entry,
                relativePath: next.relativePath,
            });
        }
        for (const child of directoryEntries(next.entry.path)) {
            pending.push({
                entry: child,
                relativePath: `${next.relativePath}/${child.name}`,
            });
        }
    }
    return {
        path,
        matches,
    };
}

//
// The directories expand all opens, and whether it stopped before opening them all.
//
export interface IExpandedDirectories {
    //
    // The paths of the directories opened, nearest first.
    //
    paths: string[];

    //
    // True when more directories were left unopened because the limit was reached.
    //
    isCut: boolean;
}

//
// Returns the paths of the directories under `path`, at any depth and nearest first, for expand
// all, stopping after `limit` so expanding a large tree such as a home directory never runs on.
//
export function allDirectoriesUnder(path: string, limit: number): IExpandedDirectories {
    const paths: string[] = [];
    const pending = directoryEntries(path);
    while (pending.length > 0 && paths.length < limit) {
        const next = pending.shift();
        if (!next) {
            break;
        }
        paths.push(next.path);
        pending.push(...directoryEntries(next.path));
    }
    return {
        paths,
        isCut: pending.length > 0,
    };
}
