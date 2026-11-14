//
// The preview for the banner choice: a banner of each severity in the style of each option. A
// is the bar down the left edge the theme draws now, B a background tinted with the status
// colour and C a border all round in the status colour.
//

import type { ReactNode } from "react";
import Alert, { type AlertColor } from "@mui/material/Alert";
import type { SxProps, Theme } from "@mui/material/styles";

//
// Returns the status token name of a severity.
//
function statusOf(severity: AlertColor): string {
    return severity === "error" ? "danger" : severity;
}

//
// Returns the Alert style of option `optionId` for `severity`. Option A and the "Spot it"
// option use the theme as it stands.
//
function bannerStyle(optionId: string, severity: AlertColor): SxProps<Theme> | undefined {
    const status = statusOf(severity);
    if (optionId === "B") {
        return {
            backgroundColor: `var(--color-${status}-subtle)`,
            border: "none",
            borderLeft: "none",
        };
    }
    if (optionId === "C") {
        return {
            border: `1px solid var(--color-${status})`,
            borderLeft: `1px solid var(--color-${status})`,
        };
    }
    return undefined;
}

//
// The banners of the preview.
//
const banners: { severity: AlertColor; text: string }[] = [
    {
        severity: "info",
        text: "A rebase is in progress.",
    },
    {
        severity: "success",
        text: "Merged feature/diffs.",
    },
    {
        severity: "warning",
        text: "main is 3 commits behind.",
    },
    {
        severity: "error",
        text: "Push rejected.",
    },
];

//
// Renders the banners in the style of option `optionId`.
//
export function BannerPreview({ optionId }: { optionId: string }): ReactNode {
    return (
        <div className="flex flex-col" style={{ gap: "var(--space-2)", padding: "var(--space-3)", background: "var(--color-panel)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
            {banners.map(banner => (
                <Alert key={banner.severity} severity={banner.severity} sx={bannerStyle(optionId, banner.severity)}>
                    {banner.text}
                </Alert>
            ))}
        </div>
    );
}
