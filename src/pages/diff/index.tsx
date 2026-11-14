//
// The diff page: the ways Graft presents a file's diff. Unified and side by side, the words that
// changed within a line, the unchanged lines between hunks folded away, long lines scrolled or
// wrapped, and each kind of change with nothing or little to compare line by line.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { DiffExplorer } from "./components/diff-explorer";
import { FileDiffCard } from "./components/file-diff-card";
import { commitFiles, longLinesChange, zoomChange } from "./examples";

//
// Renders one section per way of presenting a diff, each shown in the themes of the current mode.
//
export function DiffPage(): ReactNode {
    return (
        <div>
            <Section
                title="Unified"
                description="Old and new lines in one column, each with its old and new line number. Added lines sit on the added colour and deleted lines on the deleted colour, and where a line changed a word or two, those words are marked in a stronger colour. The bars between hunks count the unchanged lines left out; click the arrows at their left to show them. The switches in the header change the layout and wrap long lines."
            >
                <FileDiffCard file={zoomChange} />
            </Section>

            <Section
                title="Side by side"
                description="The old file on the left and the new file on the right, with changed lines facing each other. Where one side has no line to match the other, it is striped."
            >
                <FileDiffCard file={zoomChange} initialLayout="split" />
            </Section>

            <Section title="Long lines" description="Lines longer than the view keep to one row and the diff scrolls sideways, or, with the wrap switch on, wrap inside the view. The first card scrolls; the second wraps.">
                <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                    <FileDiffCard file={longLinesChange} />
                    <FileDiffCard file={longLinesChange} initialWrap />
                </div>
            </Section>

            <Section
                title="Diff explorer"
                description="The changed files of a change in the working tree, one card each, with every kind of change: modified, added, deleted and folded away, renamed, renamed with no changes, binary, a mode change, a file with no line break at its end and a lock file too large to show until asked. Click the explorer, then press Up and Down to step from change to change across the files, or Shift with Up and Down to step from file to file; the toolbar does the same and says where you are. The plus and minus buttons at a file's right and at each change's top right stage it for the next commit or take it back out, and some start staged."
            >
                <DiffExplorer files={[zoomChange, ...commitFiles]} />
            </Section>
        </div>
    );
}
