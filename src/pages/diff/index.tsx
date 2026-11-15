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
                description="Old and new lines in one column, with changed words marked."
            >
                <FileDiffCard file={zoomChange} />
            </Section>

            <Section
                title="Side by side"
                description="The old file on the left and the new file on the right."
            >
                <FileDiffCard file={zoomChange} initialLayout="split" />
            </Section>

            <Section title="Long lines" description="Long lines scrolling sideways, and wrapped.">
                <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                    <FileDiffCard file={longLinesChange} />
                    <FileDiffCard file={longLinesChange} initialWrap />
                </div>
            </Section>

            <Section
                title="Diff explorer"
                description="One diff card per changed file, covering every kind of change."
            >
                <DiffExplorer files={[zoomChange, ...commitFiles]} />
            </Section>
        </div>
    );
}
