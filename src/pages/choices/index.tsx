//
// The choices page: the candidates for every open choice in the style guide, each drawn on a
// small Graft screen in the themes of the current component mode, for the developer to pick
// from.
//

import type { ReactNode } from "react";
import { Section } from "../../components/section";
import { OptionCard } from "./components/option-card";
import { choices } from "./options";

//
// Renders one section per open choice, with its options side by side.
//
export function ChoicesPage(): ReactNode {
    return (
        <div>
            <p
                className="mb-8"
                style={{
                    color: "var(--color-text-muted)",
                    maxWidth: "720px",
                }}
            >
                Each choice shows its options on the same small Graft screen. An option changes only the tokens of its own choice, and the rest of the screen uses graft.css as it stands. The last option of each choice paints the choice's tokens bright red to show where they appear on the screen, and is not a candidate. Pick a letter for each choice.
            </p>
            {choices.map(choice => (
                <Section key={choice.title} title={choice.title} description={choice.description}>
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                            gap: "var(--space-4)",
                        }}
                    >
                        {choice.options.map(option => (
                            <OptionCard key={option.id} option={option} showFocus={choice.showFocus} showHover={choice.showHover} menuStartsOpen={!choice.menuStartsClosed} lanes={choice.lanes} Preview={choice.Preview} />
                        ))}
                    </div>
                </Section>
            ))}
        </div>
    );
}
