//
// The preview for the switch choice: switches on, off and disabled in the style of each
// option. A is MUI's switch as the theme draws it now, B a compact switch with the knob inside
// the track and C the same with square corners.
//

import type { ReactNode } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { SxProps, Theme } from "@mui/material/styles";

//
// Returns the Switch style of a compact switch with the knob inside the track, with corners of
// `radius`.
//
function insetSwitch(radius: string): SxProps<Theme> {
    return {
        width: "36px",
        height: "20px",
        padding: 0,
        margin: "0 var(--space-2) 0 var(--space-1)",
        "& .MuiSwitch-switchBase": {
            padding: "2px",
            "&.Mui-checked": {
                transform: "translateX(16px)",
            },
        },
        "& .MuiSwitch-thumb": {
            width: "16px",
            height: "16px",
            boxShadow: "none",
            borderRadius: radius,
        },
        "& .MuiSwitch-track": {
            borderRadius: radius,
        },
    };
}

//
// The Switch styles of options B and C. Option A and the "Spot it" option use the theme as it
// stands.
//
const switchStyles: Record<string, SxProps<Theme>> = {
    B: insetSwitch("var(--radius-full)"),
    C: insetSwitch("var(--radius-sm)"),
};

//
// Renders the switches in the style of option `optionId`.
//
export function SwitchPreview({ optionId }: { optionId: string }): ReactNode {
    const style = switchStyles[optionId];
    return (
        <div className="flex flex-col" style={{ gap: "var(--space-2)", padding: "var(--space-3)", background: "var(--color-panel)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
            <FormControlLabel label="Fetch in the background" control={<Switch defaultChecked sx={style} />} />
            <FormControlLabel label="Show whitespace" control={<Switch sx={style} />} />
            <FormControlLabel label="Auto-stash (locked on)" control={<Switch disabled checked sx={style} />} />
            <FormControlLabel label="Prune (locked off)" control={<Switch disabled sx={style} />} />
        </div>
    );
}
