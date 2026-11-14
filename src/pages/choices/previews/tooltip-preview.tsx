//
// The preview for the tooltip choice: a tooltip held open below a toolbar button in the style
// of each option. A is the inverted tooltip the theme draws now, B a tooltip on the panel
// colour with a border and shadow.
//

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons";
import { TooltipWithShortcut } from "../../tooltip";

//
// The tooltip style of option B. Option A and the "Spot it" option use the theme as it stands.
//
const tooltipStyles: Record<string, SxProps<Theme>> = {
    B: {
        backgroundColor: "var(--color-panel)",
        color: "var(--color-text)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-overlay)",
        "& .MuiTooltip-arrow": {
            color: "var(--color-panel)",
            "&::before": {
                border: "1px solid var(--color-border)",
            },
        },
    },
};

//
// Renders the button and its open tooltip in the style of option `optionId`.
//
export function TooltipPreview({ optionId }: { optionId: string }): ReactNode {
    return (
        <div style={{ padding: "var(--space-3) var(--space-6) calc(var(--space-8) + var(--space-3))", background: "var(--color-panel)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
            <Tooltip open arrow placement="bottom" title={<TooltipWithShortcut label="Fetch" shortcut="F5" />} slotProps={{ tooltip: { sx: tooltipStyles[optionId] } }}>
                <IconButton aria-label="Fetch">
                    <FontAwesomeIcon icon={faArrowsRotate} />
                </IconButton>
            </Tooltip>
        </div>
    );
}
