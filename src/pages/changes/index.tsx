//
// The changes page: the working tree's changes, where files and hunks are staged and the commit is
// written, as Graft shows them before a commit.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { commitFiles, nestedFolderFiles, zoomChange } from "../diff/examples";
import { ChangesArea } from "./components/changes-area";

//
// Renders the changes area in a section shown in the themes of the current mode.
//
export function ChangesPage(): ReactNode {
    return (
        <div>
            <Section
                title="Staging and committing"
                description="The changed files on the left, in one list, or in an Unstaged panel and a Staged panel when the Changes options show them apart, each file with a plus that stages it or a minus that unstages it at its left and Discard at its right. Selecting a file shows its diff beside the list, with the same buttons, stage at the left and Discard at the right, for the file and for each change. Discard fades the file, change or lines in place and turns its button into Undo; the Delete key does the same for what the keys are on. To the right of the diff, write a summary and a description, tick Amend or No verify if you need them, and commit. Click the area, then Up and Down move through the files, Right moves into the diff to step through its changes, and Space stages or unstages."
            >
                <ChangesArea startFiles={[zoomChange, ...commitFiles]} />
            </Section>
            <Section
                title="Directories inside directories"
                description="A settings feature whose changes sit three and four directories deep beside files at the top of the repo. In the tree view, lines join each directory to the directories and files inside it, the chevron collapses or expands a directory and the focus button, shown on the hovered or selected directory, shows only that directory's changes."
            >
                <ChangesArea startFiles={nestedFolderFiles} />
            </Section>
            <Section title="Nothing to commit" description="The working tree matches the last commit: the file list says so, the diff has nothing to show and the Commit button waits for a change to stage, or for Amend.">
                <ChangesArea startFiles={[]} />
            </Section>
        </div>
    );
}
