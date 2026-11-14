//
// The Git commands panel: the help panel at the right of the window that shows the Git commands
// behind the current view, so a person can learn them and run them in a terminal.
//

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faTerminal } from "@fortawesome/free-solid-svg-icons";
import { CopyButton } from "../../../components/copy-button";

//
// What the panel shows.
//
export interface IGitCommandsPanelProps {
    //
    // The folder of the repository the commands run in, as the `cd` into it shows it.
    //
    repoPath: string;

    //
    // The commands behind the current view, the most recent first. None for a view that ran no
    // command.
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
// wrapping between words, and a copy button. The most recent command is labelled.
//
export function CommandBlock({ command, isMostRecent }: { command: string; isMostRecent: boolean }): ReactNode {
    return (
        <li
            className="flex flex-col"
            style={{
                gap: "var(--space-1)",
                padding: "var(--space-2) var(--space-1) var(--space-2) var(--space-3)",
                background: "var(--color-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
            }}
        >
            <div className="flex items-center" style={{ gap: "var(--space-2)", minHeight: "calc(var(--space-6) + var(--space-1))" }}>
                <span className="flex-1" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                    {isMostRecent ? "Most recent" : "Before that"}
                </span>
                <CopyButton text={command} label="Copy command" />
            </div>
            <code className="flex" style={{ gap: "var(--space-2)", paddingRight: "var(--space-2)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)" }}>
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
        </li>
    );
}

//
// Renders the panel: a heading with a line on what the panel is for, the folder the commands run
// in with a button that copies the `cd` into it, then each command, or a note that the view ran
// none.
//
export function GitCommandsPanel({ repoPath, commands }: IGitCommandsPanelProps): ReactNode {
    return (
        <section aria-label="Git commands" className="flex flex-col" style={{ gap: "var(--space-4)", padding: "var(--space-4)" }}>
            <div className="flex flex-col" style={{ gap: "var(--space-1)" }}>
                <h2 className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", lineHeight: "var(--leading-tight)" }}>
                    <FontAwesomeIcon icon={faTerminal} style={{ fontSize: "var(--icon-md)", color: "var(--color-accent)" }} />
                    Git commands
                </h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>The commands behind this view. Copy one to run it in a terminal.</p>
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
                    This view ran no Git commands.
                </div>
            ) : (
                <>
                    <div className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                        <FontAwesomeIcon icon={faFolder} style={{ fontSize: "var(--icon-sm)" }} />
                        <span className="min-w-0 flex-1 truncate">
                            Runs in <code style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>{repoPath}</code>
                        </span>
                        <CopyButton text={`cd ${repoPath}`} label="Copy cd command" />
                    </div>
                    <ol aria-label="Commands" className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                        {commands.map((command, index) => (
                            <CommandBlock key={command} command={command} isMostRecent={index === 0} />
                        ))}
                    </ol>
                </>
            )}
        </section>
    );
}
