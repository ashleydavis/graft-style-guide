//
// The icon in front of a file's name or path, picked by the file's extension or name, the way the
// directory icon stands in front of a directory.
//

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBook,
    faCodeBranch,
    faCube,
    faDatabase,
    faFile,
    faFileAudio,
    faFileCode,
    faFileCsv,
    faFileImage,
    faFileLines,
    faFilePdf,
    faFileVideo,
    faFileZipper,
    faGear,
    faLock,
    faPalette,
    faTerminal,
    type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

//
// Icons for whole file names, which win over the extension.
//
const NAME_ICONS: Record<string, IconDefinition> = {
    ".gitignore": faCodeBranch,
    ".gitattributes": faCodeBranch,
    ".gitmodules": faCodeBranch,
    "bun.lock": faLock,
    "package-lock.json": faLock,
    "yarn.lock": faLock,
    "Cargo.lock": faLock,
    "package.json": faCube,
    "build.zig.zon": faCube,
    "Dockerfile": faCube,
    "LICENSE": faBook,
};

//
// Icons by extension, without the dot.
//
const EXTENSION_ICONS: Record<string, IconDefinition> = {
    ts: faFileCode,
    tsx: faFileCode,
    js: faFileCode,
    jsx: faFileCode,
    mjs: faFileCode,
    zig: faFileCode,
    rs: faFileCode,
    go: faFileCode,
    py: faFileCode,
    c: faFileCode,
    h: faFileCode,
    cpp: faFileCode,
    java: faFileCode,
    html: faFileCode,
    css: faPalette,
    scss: faPalette,
    md: faBook,
    txt: faFileLines,
    json: faGear,
    toml: faGear,
    yml: faGear,
    yaml: faGear,
    ini: faGear,
    env: faGear,
    lock: faLock,
    sh: faTerminal,
    bash: faTerminal,
    zsh: faTerminal,
    ps1: faTerminal,
    png: faFileImage,
    jpg: faFileImage,
    jpeg: faFileImage,
    gif: faFileImage,
    svg: faFileImage,
    webp: faFileImage,
    ico: faFileImage,
    pdf: faFilePdf,
    zip: faFileZipper,
    gz: faFileZipper,
    tar: faFileZipper,
    mp3: faFileAudio,
    wav: faFileAudio,
    mp4: faFileVideo,
    mov: faFileVideo,
    csv: faFileCsv,
    sql: faDatabase,
    db: faDatabase,
    sqlite: faDatabase,
};

//
// Returns the icon for the file at `path`: by its whole name first, then by its extension, and the
// plain file icon for any other.
//
export function fileIconFor(path: string): IconDefinition {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const named = NAME_ICONS[name];
    if (named) {
        return named;
    }
    const dot = name.lastIndexOf(".");
    return (dot > 0 ? EXTENSION_ICONS[name.slice(dot + 1).toLowerCase()] : undefined) ?? faFile;
}

//
// Renders the icon for the file at `path`, the size of the directory icon in front of a directory
// and in the muted text colour.
//
export function FileIcon({ path }: { path: string }): ReactNode {
    return <FontAwesomeIcon icon={fileIconFor(path)} aria-hidden="true" style={{ fontSize: "var(--icon-sm)", flex: "none", color: "var(--color-text-muted)" }} />;
}
