//
// The tooltip page: the short label that appears beside an icon button or a cut-off value when
// the pointer rests on it or the keyboard reaches it, built from MUI's Tooltip.
//

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowsRotate, faArrowUp, faBoxArchive } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";

//
// Renders a tooltip held open below its button, so its look can be judged without hovering.
// The space below the button holds the tooltip.
//
export function OpenTooltip({ title, children }: { title: ReactNode; children: ReactNode }): ReactNode {
    return (
        <div style={{ padding: "0 var(--space-6) calc(var(--space-8) + var(--space-3))" }}>
            <Tooltip open title={title} placement="bottom" arrow>
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
            <Section title="Drawn open" description="A tooltip as it looks when shown: a short label and its keyboard shortcut below an icon button.">
                <OpenTooltip title={<TooltipWithShortcut label="Fetch" shortcut="F5" />}>
                    <IconButton aria-label="Fetch">
                        <FontAwesomeIcon icon={faArrowsRotate} />
                    </IconButton>
                </OpenTooltip>
            </Section>

            <Section title="On hover and focus" description="Rest the pointer on a button, or move to it with Tab, to show its tooltip after a short delay.">
                <div className="flex flex-wrap" style={{ gap: "var(--space-1)" }}>
                    {toolbarButtons.map(button => (
                        <Tooltip key={button.label} title={<TooltipWithShortcut label={button.label} shortcut={button.shortcut} />} arrow>
                            <IconButton aria-label={button.label}>
                                <FontAwesomeIcon icon={button.icon} />
                            </IconButton>
                        </Tooltip>
                    ))}
                </div>
            </Section>

            <Section title="Full value of cut-off text" description="A long value cut off with an ellipsis shows the whole of it in a tooltip.">
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
