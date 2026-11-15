//
// A labelled group of buttons that picks one value of an explorer setting, used for the
// component mode and the explorer theme.
//

import type { ReactNode } from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

//
// One choice in a setting switch.
//
export interface ISettingOption {
    //
    // The value written to the URL when this choice is picked.
    //
    value: string;

    //
    // The text on the choice's button.
    //
    label: string;
}

//
// Renders the setting's label above one button per option, with the option matching `value`
// pressed. `onChange` receives the value of the option clicked.
//
export function SettingSwitch({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: ISettingOption[];
    onChange(value: string): void;
}): ReactNode {
    return (
        <div className="flex flex-col gap-1">
            <div
                style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-bold)",
                    color: "var(--color-text-muted)",
                }}
            >
                {label}
            </div>
            <ToggleButtonGroup
                aria-label={label}
                orientation="vertical"
                exclusive={true}
                fullWidth={true}
                size="small"
                value={value}
                onChange={(_event, nextValue: string | null) => {
                    if (nextValue) {
                        onChange(nextValue);
                    }
                }}
            >
                {options.map(option => (
                    <ToggleButton key={option.value} value={option.value}>
                        {option.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
        </div>
    );
}
