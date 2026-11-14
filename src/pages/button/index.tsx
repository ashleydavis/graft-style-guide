//
// The button page: every kind, size and state of button Graft uses, icon buttons, the danger
// button and the two drop-down buttons.
//

import { useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowDown,
    faArrowUp,
    faArrowsRotate,
    faCodeBranch,
    faCodeMerge,
    faCopy,
    faEllipsis,
    faGear,
    faTag,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";
import { DropDownDialogButton } from "./components/drop-down-dialog-button";
import { DropDownMenuButton } from "./components/drop-down-menu-button";

//
// Renders one section per kind of button, each shown in the themes of the current mode.
//
export function ButtonPage(): ReactNode {
    const [lastAction, setLastAction] = useState("");

    return (
        <div>
            <Section title="Kinds" description="Three kinds of button. Commit is filled with the accent for the main action. Stash has a clear border for other actions. Discard has accent words and a soft border for the least important action.">
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

            <Section
                title="Icon buttons"
                description="An icon with no label, in muted text until the pointer is on it. Each has a tooltip and an accessible name. Medium in toolbars, small inside rows and panels."
            >
                <div className="flex flex-wrap items-center gap-1">
                    {[
                        { label: "Fetch", icon: faArrowsRotate },
                        { label: "Settings", icon: faGear },
                        { label: "More actions", icon: faEllipsis },
                    ].map(button => (
                        <Tooltip key={button.label} title={button.label}>
                            <IconButton aria-label={button.label}>
                                <FontAwesomeIcon icon={button.icon} />
                            </IconButton>
                        </Tooltip>
                    ))}
                    <Tooltip title="Copy hash">
                        <IconButton aria-label="Copy hash" size="small">
                            <FontAwesomeIcon icon={faCopy} />
                        </IconButton>
                    </Tooltip>
                    <IconButton aria-label="Delete branch (protected)" size="small" disabled>
                        <FontAwesomeIcon icon={faTrash} />
                    </IconButton>
                </div>
            </Section>

            <Section title="Danger" description="The main action of a step that loses work, in the danger colour. It sits beside a safe way out.">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="text">Keep changes</Button>
                    <Button variant="outlined" color="error" startIcon={<FontAwesomeIcon icon={faTrash} />}>
                        Discard changes
                    </Button>
                </div>
            </Section>

            <Section
                title="Drop-down buttons"
                description="A down chevron after the label means the button opens something below it. The first opens a menu of actions. The second opens a small dialog of settings with its own Pull and Cancel buttons."
            >
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start gap-3">
                        <DropDownMenuButton
                            label="Merge"
                            variant="contained"
                            items={[
                                { label: "Merge into main", icon: faCodeMerge },
                                { label: "Rebase onto main", icon: faCodeBranch },
                                { label: "Tag this commit", icon: faTag },
                            ]}
                            onPick={label => setLastAction(`Chose: ${label}`)}
                        />
                        <DropDownDialogButton onPull={setLastAction} />
                        <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faArrowDown} />} disabled>
                            Pull (no remote)
                        </Button>
                    </div>
                    {lastAction ? <div style={{ color: "var(--color-text-muted)" }}>{lastAction}</div> : undefined}
                </div>
            </Section>

            <Section title="Disabled" description="A button whose action is unavailable, drawn in the disabled colours.">
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
