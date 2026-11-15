//
// The progress and loading page: bars and spinners for work under way, built from MUI's
// LinearProgress, CircularProgress and Skeleton.
//

import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import { Section } from "../../components/section";

//
// Renders a progress bar with its label and figure above it.
//
export function LabelledProgress({ label, value }: { label: string; value?: number }): ReactNode {
    return (
        <div className="flex flex-col" style={{ gap: "var(--space-1)", maxWidth: "360px" }}>
            <div className="flex" style={{ fontSize: "var(--text-sm)" }}>
                <span className="flex-1">{label}</span>
                {value !== undefined ? <span style={{ color: "var(--color-text-muted)" }}>{value}%</span> : undefined}
            </div>
            <LinearProgress variant={value !== undefined ? "determinate" : "indeterminate"} value={value} aria-label={label} />
        </div>
    );
}

//
// Renders one section per kind of progress, each shown in the themes of the current mode.
//
export function ProgressPage(): ReactNode {
    return (
        <div>
            <Section title="Progress bar" description="Work of a known size, and work of an unknown size.">
                <div className="flex flex-col" style={{ gap: "var(--space-4)" }}>
                    <LabelledProgress label="Receiving objects" value={64} />
                    <LabelledProgress label="Connecting to origin" />
                </div>
            </Section>

            <Section title="Spinner" description="Short work inside a disabled button.">
                <div className="flex flex-wrap items-center" style={{ gap: "var(--space-4)" }}>
                    <CircularProgress size={16} aria-label="Loading" />
                    <CircularProgress size={24} aria-label="Loading" />
                    <Button variant="contained" disabled startIcon={<CircularProgress size={14} color="inherit" aria-label="Fetching" />}>
                        Fetching
                    </Button>
                </div>
            </Section>

            <Section title="Loading placeholder" description="Grey shapes where content will appear.">
                <div className="flex flex-col" style={{ gap: "var(--space-2)", maxWidth: "360px" }}>
                    {[80, 65, 72].map(width => (
                        <div key={width} className="flex items-center" style={{ gap: "var(--space-2)" }}>
                            <Skeleton variant="circular" width={10} height={10} />
                            <Skeleton variant="text" sx={{ width: `${width}%` }} />
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
}
