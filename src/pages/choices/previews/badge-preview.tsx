//
// The preview for the ref badge choice: HEAD, the checked-out branch, a branch, a remote branch
// and a tag on a commit row in the style of each option. A is the grey badge with a coloured
// icon the theme draws now, B a background tinted with the colour of the kind and C a border in
// that colour. The checked-out branch stays filled with the accent in every option.
//

import type { ReactNode } from "react";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import type { SxProps, Theme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { refIcons, type RefKind } from "../../badges";

//
// The status token that marks each kind of ref other than the checked-out branch.
//
const kindTokens: Record<Exclude<RefKind, "current">, string> = {
    head: "accent",
    branch: "accent",
    remote: "info",
    tag: "warning",
};

//
// Returns the Chip style of option `optionId` for a ref of `kind`. Option A, the "Spot it"
// option and the checked-out branch use the theme as it stands.
//
function badgeStyle(optionId: string, kind: RefKind): SxProps<Theme> | undefined {
    if (kind === "current") {
        return undefined;
    }
    const token = kindTokens[kind];
    if (optionId === "B") {
        return {
            backgroundColor: `var(--color-${token}-subtle)`,
        };
    }
    if (optionId === "C") {
        return {
            backgroundColor: "transparent",
            boxShadow: `inset 0 0 0 1px var(--color-${token})`,
        };
    }
    return undefined;
}

//
// The refs of the preview.
//
const refs: { kind: RefKind; name: string }[] = [
    {
        kind: "head",
        name: "HEAD",
    },
    {
        kind: "current",
        name: "main",
    },
    {
        kind: "branch",
        name: "feature/graph",
    },
    {
        kind: "remote",
        name: "origin/main",
    },
    {
        kind: "tag",
        name: "v1.0.0",
    },
];

//
// Renders the badges on a commit row in the style of option `optionId`.
//
export function BadgePreview({ optionId }: { optionId: string }): ReactNode {
    return (
        <Paper variant="outlined" className="flex flex-wrap items-center" sx={{ gap: "var(--space-1) var(--space-2)", padding: "var(--space-2) var(--space-3)" }}>
            {refs.map(ref => (
                <Chip key={ref.name} variant={ref.kind} icon={<FontAwesomeIcon icon={refIcons[ref.kind]} />} label={ref.name} sx={badgeStyle(optionId, ref.kind)} />
            ))}
            <span>Added the commit graph</span>
        </Paper>
    );
}
