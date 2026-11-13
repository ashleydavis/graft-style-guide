//
// The button page: every kind, size and state of button Graft uses.
//

import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";

//
// Renders one section per kind of button, each shown in both themes.
//
export function ButtonPage(): ReactNode {
    return (
        <div>
            <Section title="Kinds" description="Contained for the main action, outlined for others, text for the least important.">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="contained">Commit</Button>
                    <Button variant="outlined">Stash</Button>
                    <Button variant="text">Discard</Button>
                </div>
            </Section>

            <Section title="With icons" description="An icon before the label.">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="contained" startIcon={<FontAwesomeIcon icon={faArrowUp} />}>
                        Push
                    </Button>
                    <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faCodeBranch} />}>
                        New branch
                    </Button>
                </div>
            </Section>

            <Section title="Sizes" description="Small, medium and large.">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="contained" size="small">
                        Small
                    </Button>
                    <Button variant="contained" size="medium">
                        Medium
                    </Button>
                    <Button variant="contained" size="large">
                        Large
                    </Button>
                </div>
            </Section>

            <Section title="Disabled" description="A button whose action is unavailable, drawn in muted colours.">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="contained" disabled>
                        Commit
                    </Button>
                    <Button variant="outlined" disabled>
                        Stash
                    </Button>
                    <Button variant="text" disabled>
                        Discard
                    </Button>
                </div>
            </Section>
        </div>
    );
}
