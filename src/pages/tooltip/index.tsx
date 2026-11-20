//
// The tooltip page: the short label that appears beside an icon button or a cut-off value when
// the pointer rests on it or the keyboard reaches it, built from MUI's Tooltip, and the pinnable
// tooltip that lists fields to copy.
//

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowsRotate, faArrowUp, faBoxArchive } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";
import { PinnableTooltip } from "../../components/pinnable-tooltip";
import { codeField, CopyTip, textField } from "../../components/copy-tip";
import { FileTip } from "../../components/file-tip";

//
// Renders a tooltip held open below its button, so its look can be judged without hovering.
// The space below the button holds the tooltip.
//
export function OpenTooltip({ title, children }: { title: ReactNode; children: ReactNode }): ReactNode {
    return (
        <div style={{ padding: "0 var(--space-6) calc(var(--space-8) + var(--space-3))" }}>
            <Tooltip open title={title} placement="bottom">
                <span className="inline-block">{children}</span>
            </Tooltip>
        </div>
    );
}

//
// The toolbar buttons of the hover example, with their tooltips.
//
const toolbarButtons = [
    {
        label: "Fetch",
        shortcut: "F5",
        icon: faArrowsRotate,
    },
    {
        label: "Pull",
        shortcut: "Ctrl+Shift+L",
        icon: faArrowDown,
    },
    {
        label: "Push",
        shortcut: "Ctrl+Shift+P",
        icon: faArrowUp,
    },
    {
        label: "Stash",
        shortcut: "Ctrl+Shift+S",
        icon: faBoxArchive,
    },
];

//
// Renders the words of a tooltip with a keyboard shortcut after them. The two sit on the same
// baseline, because the code font draws its letters higher in the line than the interface font
// and centring the two boxes leaves the shortcut high.
//
export function TooltipWithShortcut({ label, shortcut }: { label: string; shortcut: string }): ReactNode {
    return (
        <span className="inline-flex items-baseline" style={{ gap: "var(--space-2)" }}>
            {label}
            <span style={{ fontFamily: "var(--font-mono)", opacity: 0.7 }}>{shortcut}</span>
        </span>
    );
}

//
// Renders one section per use of a tooltip, each shown in the themes of the current mode.
//
export function TooltipPage(): ReactNode {
    return (
        <div>
            <Section title="Drawn open" description="A tooltip with a label and its shortcut.">
                <OpenTooltip title={<TooltipWithShortcut label="Fetch" shortcut="F5" />}>
                    <IconButton aria-label="Fetch">
                        <FontAwesomeIcon icon={faArrowsRotate} />
                    </IconButton>
                </OpenTooltip>
            </Section>

            <Section title="On hover and focus" description="Buttons with tooltips.">
                <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
                    {toolbarButtons.map(button => (
                        <Tooltip key={button.label} title={<TooltipWithShortcut label={button.label} shortcut={button.shortcut} />}>
                            <IconButton aria-label={button.label}>
                                <FontAwesomeIcon icon={button.icon} />
                            </IconButton>
                        </Tooltip>
                    ))}
                </div>
            </Section>

            <Section title="Fields drawn open" description="A tooltip that lists fields, each under a dotted line with a button that copies it.">
                {/* The fields' tooltip is taller than a one-line tooltip, so it gets more room below. */}
                <div style={{ paddingBottom: "calc(var(--space-8) * 2.5)" }}>
                    <OpenTooltip title={<CopyTip fields={[textField("Author", "Ada Lovelace"), codeField("Commit hash", "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678")]} action={undefined} />}>
                        <code style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>a1b2c3d</code>
                    </OpenTooltip>
                </div>
            </Section>

            <Section title="Pinnable fields" description="Hover a value for its fields. The pin button, or P, keeps the tooltip open so its fields can be copied. The close button, P or Escape closes it.">
                <div className="flex flex-wrap items-center" style={{ gap: "var(--space-4)" }}>
                    <PinnableTooltip enterDelayMs={400} maxWidth="calc(var(--space-8) * 16)" tip={pinButton => <CopyTip fields={[codeField("Commit hash", "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"), codeField("Short hash", "a1b2c3d")]} action={pinButton} />}>
                        <code tabIndex={0} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                            a1b2c3d
                        </code>
                    </PinnableTooltip>
                    <PinnableTooltip enterDelayMs={400} maxWidth="calc(var(--space-8) * 12)" tip={pinButton => <FileTip file={{ path: "src/graph/lanes.ts", oldPath: "src/lanes.ts", status: "R", linesAdded: 12, linesDeleted: 3 }} pinButton={pinButton} />}>
                        <span tabIndex={0} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                            lanes.ts
                        </span>
                    </PinnableTooltip>
                </div>
            </Section>

            <Section title="Full value of cut-off text" description="A tooltip with the full text of a cut-off value.">
                <Tooltip title="feature/commit-graph-lane-colours-for-merges">
                    <span
                        tabIndex={0}
                        className="inline-block truncate"
                        style={{
                            maxWidth: "200px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-sm)",
                        }}
                    >
                        feature/commit-graph-lane-colours-for-merges
                    </span>
                </Tooltip>
            </Section>
        </div>
    );
}
