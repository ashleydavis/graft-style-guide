//
// The badges and chips page: the small labels for branches, remote branches, tags and HEAD
// that sit beside commits, built from MUI's Chip.
//

import type { ReactNode } from "react";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloud, faCodeBranch, faLocationDot, faTag, faXmark, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";

//
// The kinds of ref a badge can label.
//
export type RefKind = "current" | "branch" | "remote" | "tag" | "head";

//
// The icon of each kind of ref.
//
export const refIcons: Record<RefKind, IconDefinition> = {
    current: faCodeBranch,
    branch: faCodeBranch,
    remote: faCloud,
    tag: faTag,
    head: faLocationDot,
};

//
// Renders a badge for a ref on the Chip variant of its kind: the checked-out branch filled with
// the accent colour, and every other ref on the raised background with its icon in the colour
// of its kind. With `onDelete` the badge has a remove button.
//
export function RefBadge({ kind, name, onDelete }: { kind: RefKind; name: string; onDelete?: () => void }): ReactNode {
    return (
        <Chip
            variant={kind}
            icon={<FontAwesomeIcon icon={refIcons[kind]} />}
            label={name}
            onDelete={onDelete}
            deleteIcon={onDelete ? <FontAwesomeIcon icon={faXmark} aria-label={`Remove ${name}`} /> : undefined}
        />
    );
}

//
// Renders a commit row with its badges before the message, as in the commit list.
//
export function CommitWithBadges(): ReactNode {
    return (
        <Paper
            variant="outlined"
            className="flex flex-wrap items-center"
            sx={{
                gap: "var(--space-1) var(--space-2)",
                padding: "var(--space-1) var(--space-3)",
            }}
        >
            <RefBadge kind="head" name="HEAD" />
            <RefBadge kind="current" name="main" />
            <RefBadge kind="remote" name="origin/main" />
            <RefBadge kind="tag" name="v1.0.0" />
            <span className="min-w-0 flex-1 truncate">Added the commit graph</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>a1b2c3d</span>
        </Paper>
    );
}

//
// Renders one section per use of a badge, each shown in the themes of the current mode.
//
export function BadgesPage(): ReactNode {
    return (
        <div>
            <Section title="Each kind of ref" description="HEAD, the checked-out branch, another local branch, a remote branch and a tag. Each has its own icon, and the checked-out branch is filled with the accent.">
                <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
                    <RefBadge kind="head" name="HEAD" />
                    <RefBadge kind="current" name="main" />
                    <RefBadge kind="branch" name="feature/commit-graph" />
                    <RefBadge kind="remote" name="origin/main" />
                    <RefBadge kind="tag" name="v1.0.0" />
                </div>
            </Section>

            <Section title="On a commit" description="Badges sit before the commit message in the commit list.">
                <CommitWithBadges />
            </Section>

            <Section title="Removable" description="A badge with a remove button, as for a filter on the commit list.">
                <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
                    <RefBadge kind="branch" name="feature/commit-graph" onDelete={() => {}} />
                    <RefBadge kind="tag" name="v1.0.0" onDelete={() => {}} />
                </div>
            </Section>
        </div>
    );
}
