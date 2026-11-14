//
// The changes page: the working tree's changes, where files and hunks are staged and the commit is
// written, as Graft shows them before a commit.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { commitFiles, zoomChange } from "../diff/examples";
import { ChangesArea } from "./components/changes-area";

//
// Renders the changes area in a section shown in the themes of the current mode.
//
export function ChangesPage(): ReactNode {
    return (
        <div>
            <Section
                title="Staging and committing"
                description="The changed files on the left, each with a checkbox that stages the whole file: ticked when it is all staged and half-ticked when some of its changes are. Selecting a file shows its diff beside the list, with Stage, Unstage and Discard for the file and for each change. To the right of the diff, write a summary and a description, tick Amend or No verify if you need them, and commit. Click the area, then Up and Down move through the files, Right moves into the diff to step through its changes, and Space stages or unstages."
            >
                <ChangesArea startFiles={[zoomChange, ...commitFiles]} />
            </Section>
        </div>
    );
}
