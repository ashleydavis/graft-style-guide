//
// The Git commands panel: the help panel at the right of the window that shows the Git commands
// the current page ran, so a person can learn them and run them in a terminal.
//

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faTerminal } from "@fortawesome/free-solid-svg-icons";
import { CopyButton } from "../../../components/copy-button";
import { FilePathMenu } from "../../../components/file-path-menu";
import { isSearchKey, matchesSearch, SearchModeBox, SearchModeButton, useSearchMode } from "../../../components/search-box";

//
// What the panel shows.
//
export interface IGitCommandsPanelProps {
    //
    // The directory of the repository the commands run in, as the `cd` into it shows it.
    //
    repoPath: string;

    //
    // The one or two commands the current view ran, in the order it ran them. None for a view that
    // ran no command.
    //
    commands: string[];
}

//
// The length above which a word of a command, such as a full hash or a long path, may break
// anywhere to fit the panel. Shorter words, such as options like --no-commit-id, stay whole on
// one line, so a line never breaks inside an option at its hyphens.
//
const LONG_WORD = 24;

//
// Renders one command on the raised colour: a muted "$" prompt, the command in the code font,
// wrapping between words, and a copy button at its top right.
//
export function CommandBlock({ command }: { command: string }): ReactNode {
    return (
        <li
            className="flex items-start"
            style={{
                gap: "var(--space-2)",
                padding: "var(--space-1) var(--space-1) var(--space-1) var(--space-3)",
                background: "var(--color-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
            }}
        >
            <code
                className="flex min-w-0 flex-1"
                style={{ gap: "var(--space-2)", padding: "var(--space-1) 0", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)" }}
            >
                <span aria-hidden="true" className="flex-none select-none" style={{ color: "var(--color-text-muted)" }}>
                    $
                </span>
                <span>
                    {command.split(" ").map((word, index) => (
                        <span key={index}>
                            {index > 0 ? " " : ""}
                            <span style={word.length > LONG_WORD ? { overflowWrap: "anywhere" } : { whiteSpace: "nowrap" }}>{word}</span>
                        </span>
                    ))}
                </span>
            </code>
            <CopyButton text={command} label="Copy command" />
        </li>
    );
}

//
// Renders the panel: a heading with a line on what the panel is for, the directory the commands run
// in with a button that copies the `cd` into it, then each command, or a note that the page ran
// none.
//
export function GitCommandsPanel({ repoPath, commands }: IGitCommandsPanelProps): ReactNode {
    const search = useSearchMode();
    const shown = commands.filter(command => matchesSearch(command, search.query));
    return (
        <section
            aria-label="Git commands"
            className="flex flex-col"
            style={{ gap: "var(--space-4)", padding: "var(--space-4)" }}
            //
            // Ctrl+F anywhere in the panel starts search mode, which keeps only the commands that
            // hold the search.
            //
            onKeyDown={event => {
                if (isSearchKey(event) && commands.length > 0) {
                    event.preventDefault();
                    search.open();
                }
            }}
        >
            <div className="flex flex-col" style={{ gap: "var(--space-1)" }}>
                <h2 className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", lineHeight: "var(--leading-tight)" }}>
                    <FontAwesomeIcon icon={faTerminal} style={{ fontSize: "var(--icon-md)", color: "var(--color-accent)" }} />
                    <span className="flex-1">Git commands</span>
                    {commands.length > 0 ? <SearchModeButton mode={search} what="the commands" /> : undefined}
                </h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>The Git commands this page ran. Copy one to run it in a terminal.</p>
            </div>
            {commands.length === 0 ? (
                <div
                    className="flex flex-col items-center text-center"
                    style={{
                        gap: "var(--space-2)",
                        padding: "var(--space-6) var(--space-4)",
                        border: "1px dashed var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--color-text-muted)",
                        fontSize: "var(--text-sm)",
                    }}
                >
                    <FontAwesomeIcon icon={faTerminal} style={{ fontSize: "var(--icon-lg)" }} />
                    This page ran no Git commands.
                </div>
            ) : (
                <>
                    <div className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                        <FontAwesomeIcon icon={faFolder} style={{ fontSize: "var(--icon-sm)" }} />
                        <span className="min-w-0 flex-1 truncate">
                            Runs in <code style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>{repoPath}</code>
                        </span>
                        <FilePathMenu path={repoPath} kind="working-directory" />
                    </div>
                    {search.isOpen ? (
                        <div style={{ margin: "0 calc(var(--space-2) * -1)" }}>
                            <SearchModeBox mode={search} label="Search the commands" placeholder="Search the commands, then Enter" result={`${shown.length} of ${commands.length}`} />
                        </div>
                    ) : undefined}
                    {shown.length === 0 ? <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>No commands match the search.</p> : undefined}
                    <ol aria-label="Commands" className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                        {shown.map(command => (
                            <CommandBlock key={command} command={command} />
                        ))}
                    </ol>
                </>
            )}
        </section>
    );
}
