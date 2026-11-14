//
// The overview page: a small example of every part of the style guide, from colours and type
// to spacing, radius, shadows and motion.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { Swatch } from "./components/swatch";
import { TokenLabel } from "./components/token-label";

//
// Renders one section per kind of token, each with the tokens and an example of their use.
//
export function OverviewPage(): ReactNode {
    return (
        <div>
            <Section
                title="Raw palette"
                description="The base colours. Components use the role colours below, which point at these."
            >
                <div className="flex flex-col gap-4">
                    {[
                        ["--gray-0", "--gray-50", "--gray-100", "--gray-200", "--gray-300", "--gray-400"],
                        ["--gray-500", "--gray-600", "--gray-700", "--gray-800", "--gray-900", "--gray-950"],
                        ["--violet-300", "--violet-400", "--violet-500", "--violet-600", "--violet-700", "--violet-950"],
                        ["--green-100", "--green-400", "--green-600", "--green-700", "--green-950"],
                        ["--red-100", "--red-400", "--red-600", "--red-950", "--red-975"],
                        ["--amber-400", "--amber-600", "--amber-700"],
                        ["--blue-400", "--blue-600"],
                        ["--cyan-400", "--cyan-600"],
                        ["--black-40", "--black-60"],
                    ].map(names => (
                        <div key={names[0]} className="flex flex-wrap gap-3">
                            {names.map(name => (
                                <Swatch key={name} name={name} />
                            ))}
                        </div>
                    ))}
                </div>
            </Section>

            <Section
                title="Role colours"
                description="Colours named for what they are used for. Each has a light and a dark value."
            >
                <div className="flex flex-wrap gap-3">
                    {[
                        "--color-bg",
                        "--color-panel",
                        "--color-raised",
                        "--color-border",
                        "--color-text",
                        "--color-text-muted",
                        "--color-accent",
                        "--color-accent-hover",
                        "--color-on-accent",
                        "--color-focus",
                        "--color-success",
                        "--color-warning",
                        "--color-danger",
                        "--color-on-danger",
                        "--color-scrim",
                        "--color-info",
                        "--color-diff-added",
                        "--color-diff-removed",
                        "--color-diff-added-line",
                        "--color-diff-removed-line",
                        "--color-conflict",
                        "--color-lane-1",
                        "--color-lane-2",
                        "--color-lane-3",
                        "--color-lane-4",
                        "--color-lane-5",
                        "--color-lane-6",
                    ].map(name => (
                        <Swatch key={name} name={name} />
                    ))}
                </div>
                <RoleColourExample />
            </Section>

            <Section title="Typography" description="Font families, sizes and weights.">
                <div className="flex flex-col gap-3">
                    {["--text-2xl", "--text-xl", "--text-lg", "--text-md", "--text-sm", "--text-xs"].map(name => (
                        <div key={name}>
                            <div
                                style={{
                                    fontSize: `var(${name})`,
                                }}
                            >
                                Commit 3 files to main
                            </div>
                            <TokenLabel name={name} />
                        </div>
                    ))}
                    {["--weight-normal", "--weight-medium", "--weight-bold"].map(name => (
                        <div key={name}>
                            <div
                                style={{
                                    fontWeight: `var(${name})`,
                                }}
                            >
                                Fetch from origin
                            </div>
                            <TokenLabel name={name} />
                        </div>
                    ))}
                    <div>
                        <div
                            style={{
                                fontFamily: "var(--font-mono)",
                            }}
                        >
                            a1b2c3d Fixed the merge base lookup
                        </div>
                        <TokenLabel name="--font-mono" />
                    </div>
                </div>
            </Section>

            <Section title="Spacing" description="The steps used for padding, margins and gaps.">
                <div className="flex flex-col gap-2">
                    {["--space-1", "--space-2", "--space-3", "--space-4", "--space-6", "--space-8"].map(name => (
                        <div key={name} className="flex items-center gap-3">
                            <div
                                className="h-3"
                                style={{
                                    width: `var(${name})`,
                                    background: "var(--color-accent)",
                                }}
                            />
                            <TokenLabel name={name} />
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Corner radius" description="How round corners are.">
                <div className="flex flex-wrap gap-4">
                    {["--radius-sm", "--radius-md", "--radius-lg", "--radius-full"].map(name => (
                        <div key={name} className="flex flex-col gap-2">
                            <div
                                className="h-14 w-24"
                                style={{
                                    borderRadius: `var(${name})`,
                                    background: "var(--color-raised)",
                                    border: "1px solid var(--color-border)",
                                }}
                            />
                            <TokenLabel name={name} />
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Shadows" description="Raised for cards and panels, overlay for menus and dialogs.">
                <div className="flex flex-wrap gap-6">
                    {["--shadow-raised", "--shadow-overlay"].map(name => (
                        <div key={name} className="flex flex-col gap-2">
                            <div
                                className="h-20 w-40"
                                style={{
                                    boxShadow: `var(${name})`,
                                    background: "var(--color-panel)",
                                    borderRadius: "var(--radius-md)",
                                }}
                            />
                            <TokenLabel name={name} />
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Motion" description="Hover over a box to see each duration with the standard easing.">
                <div className="flex flex-wrap gap-4">
                    {["--duration-fast", "--duration-normal", "--duration-slow"].map(name => (
                        <div key={name} className="flex flex-col gap-2">
                            <div
                                className="h-14 w-24 hover:translate-x-4"
                                style={{
                                    transition: `transform var(${name}) var(--ease-standard)`,
                                    background: "var(--color-accent)",
                                    borderRadius: "var(--radius-md)",
                                }}
                            />
                            <TokenLabel name={name} />
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
}

//
// Renders a small panel that uses the role colours together, so they can be judged in use:
// text, muted text, borders, the accent, status colours and diff lines.
//
export function RoleColourExample(): ReactNode {
    return (
        <div
            className="mt-4 flex flex-col gap-2 p-3"
            style={{
                background: "var(--color-panel)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-raised)",
            }}
        >
            <div
                style={{
                    fontWeight: "var(--weight-bold)",
                }}
            >
                feature/style-guide
            </div>
            <div
                style={{
                    color: "var(--color-text-muted)",
                }}
            >
                3 commits ahead of main
            </div>
            <div className="flex gap-3">
                <span
                    style={{
                        color: "var(--color-success)",
                    }}
                >
                    Pushed
                </span>
                <span
                    style={{
                        color: "var(--color-warning)",
                    }}
                >
                    Behind remote
                </span>
                <span
                    style={{
                        color: "var(--color-danger)",
                    }}
                >
                    Conflict
                </span>
            </div>
            <div
                style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                }}
            >
                <div
                    className="px-2"
                    style={{
                        background: "var(--color-diff-removed)",
                    }}
                >
                    - const radius = 4;
                </div>
                <div
                    className="px-2"
                    style={{
                        background: "var(--color-diff-added)",
                    }}
                >
                    + const radius = 6;
                </div>
            </div>
            <div>
                <span
                    className="inline-block px-3 py-1"
                    style={{
                        background: "var(--color-accent)",
                        color: "var(--color-on-accent)",
                        borderRadius: "var(--radius-full)",
                        fontSize: "var(--text-sm)",
                    }}
                >
                    Current branch
                </span>
            </div>
        </div>
    );
}
