//
// The fonts page: the UI font and the monospace font in use, at every size and weight in
// graft.css, with the characters that are easy to mix up in hashes and code.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { TokenLabel } from "../../components/token-label";

//
// Renders one section per font, then the sizes and weights, then the characters to check.
//
export function FontsPage(): ReactNode {
    return (
        <div>
            <Section
                title="UI font"
                description="Mona Sans, GitHub's open-source typeface, for all interface text: labels, buttons, menus, commit messages and headings."
            >
                <div
                    className="flex flex-col"
                    style={{
                        gap: "var(--space-2)",
                        fontFamily: "var(--font-sans)",
                    }}
                >
                    <div
                        style={{
                            fontSize: "var(--text-2xl)",
                            fontWeight: "var(--weight-bold)",
                        }}
                    >
                        Fixed the merge base lookup
                    </div>
                    <div>
                        3 commits ahead of origin/main. Fetch, pull or push to bring your branch up to date with its remote.
                    </div>
                    <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</div>
                    <TokenLabel name="--font-sans" />
                </div>
            </Section>

            <Section
                title="Monospace font"
                description="Monaspace Neon, GitHub's open-source code font, for hashes, file names, branch names and diffs."
            >
                <div
                    className="flex flex-col"
                    style={{
                        gap: "var(--space-1)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-sm)",
                    }}
                >
                    <div>a1b2c3d feature/style-guide src/lib/graph.ts</div>
                    <div
                        style={{
                            background: "var(--color-diff-removed)",
                        }}
                    >
                        {"-   const laneCount = 3;"}
                    </div>
                    <div
                        style={{
                            background: "var(--color-diff-added)",
                        }}
                    >
                        {"+   const laneCount = lanes.length; // => 0 when empty"}
                    </div>
                    <div>{"{ } [ ] ( ) < > = == === != => -> && || :: ;"}</div>
                    <TokenLabel name="--font-mono" />
                </div>
            </Section>

            <Section title="Sizes" description="Every type size, in the UI font.">
                <div
                    className="flex flex-col"
                    style={{
                        gap: "var(--space-2)",
                    }}
                >
                    {["--text-2xl", "--text-xl", "--text-lg", "--text-md", "--text-sm", "--text-xs"].map(name => (
                        <div key={name}>
                            <div
                                style={{
                                    fontSize: `var(${name})`,
                                }}
                            >
                                Merged feature/diffs into main
                            </div>
                            <TokenLabel name={name} />
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Weights" description="Every weight, in both fonts.">
                <div
                    className="flex flex-col"
                    style={{
                        gap: "var(--space-2)",
                    }}
                >
                    {["--weight-normal", "--weight-medium", "--weight-bold"].map(name => (
                        <div key={name}>
                            <div
                                style={{
                                    fontWeight: `var(${name})`,
                                }}
                            >
                                Pull from origin{" "}
                                <span
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    e4f5a6b
                                </span>
                            </div>
                            <TokenLabel name={name} />
                        </div>
                    ))}
                </div>
            </Section>

            <Section
                title="Characters to tell apart"
                description="Characters that look alike in many fonts. In hashes and code each must be easy to tell from the others."
            >
                <div
                    className="flex flex-col"
                    style={{
                        gap: "var(--space-2)",
                    }}
                >
                    <div>UI font: 0 O o 1 l I i | rn m</div>
                    <div
                        style={{
                            fontFamily: "var(--font-mono)",
                        }}
                    >
                        Monospace: 0 O o 1 l I i | rn m 5 S 8 B
                    </div>
                </div>
            </Section>
        </div>
    );
}
