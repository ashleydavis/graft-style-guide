//
// The changes page: the working tree's changes, where files and hunks are staged and the commit is
// written, as Graft shows them before a commit.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { commitFiles, nestedDirectoryFiles, zoomChange } from "../diff/examples";
import { ChangesArea } from "./components/changes-area";

//
// Renders the changes area in a section shown in the themes of the current mode.
//
export function ChangesPage(): ReactNode {
    return (
        <div>
            <Section
                title="Staging and committing"
                description="The changed files, the selected file's diff and the commit message."
            >
                <ChangesArea startFiles={[zoomChange, ...commitFiles]} />
            </Section>
            <Section
                title="Directories inside directories"
                description="Changes three and four directories deep, in the tree view."
            >
                <ChangesArea startFiles={nestedDirectoryFiles} />
            </Section>
            <Section title="Nothing to commit" description="A working tree with no changes.">
                <ChangesArea startFiles={[]} />
            </Section>
        </div>
    );
}
