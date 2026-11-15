//
// The Git commands panel page: the help panel at the right of Graft's window, which shows the Git
// commands behind the current view, with none, one and two commands.
//

import type { ReactNode } from "react";
import Paper from "@mui/material/Paper";
import { Section } from "../../components/section";
import { repoPath } from "../commit-explorer/data";
import { GitCommandsPanel } from "./components/git-commands-panel";

//
// Renders the panel at its width in Graft's window, on the panel colour with a border down its left
// edge, holding `commands`.
//
export function PanelFrame({ commands }: { commands: string[] }): ReactNode {
    return (
        <Paper variant="outlined" sx={{ width: "320px", maxWidth: "100%", overflow: "hidden" }}>
            <GitCommandsPanel repoPath={repoPath} commands={commands} />
        </Paper>
    );
}

//
// Renders one section per number of commands, each shown in the themes of the current mode.
//
export function GitCommandsPanelPage(): ReactNode {
    return (
        <div>
            <Section title="No commands" description="A view that ran no Git commands.">
                <PanelFrame commands={[]} />
            </Section>

            <Section title="One command" description="One command and the directory it runs in.">
                <PanelFrame commands={["git log --max-count=50"]} />
            </Section>

            <Section title="Two commands" description="Two commands, each with a copy button.">
                <PanelFrame
                    commands={[
                        "git log --max-count=1 a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
                        "git diff-tree -r --root --no-commit-id --name-status a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
                    ]}
                />
            </Section>
        </div>
    );
}
