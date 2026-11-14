//
// The checkbox, radio button and switch page: each control on, off, mixed where it has a mixed
// state, and disabled, built from MUI's own controls.
//

import { useState, type ReactNode } from "react";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Switch from "@mui/material/Switch";
import { Section } from "../../components/section";

//
// The files of the staging example, with whether each is staged.
//
const initialFiles = [
    {
        name: "src/graph.ts",
        isStaged: true,
    },
    {
        name: "src/lanes.ts",
        isStaged: false,
    },
    {
        name: "README.md",
        isStaged: true,
    },
];

//
// Renders a "Stage all" checkbox over a list of file checkboxes. The top checkbox is mixed
// while some files are staged and others are not.
//
export function StagingChecklist(): ReactNode {
    const [files, setFiles] = useState(initialFiles);
    const stagedCount = files.filter(file => file.isStaged).length;

    function setAll(isStaged: boolean): void {
        setFiles(files.map(file => ({ ...file, isStaged })));
    }

    function toggle(name: string): void {
        setFiles(files.map(file => (file.name === name ? { ...file, isStaged: !file.isStaged } : file)));
    }

    return (
        <div className="flex flex-col">
            <FormControlLabel
                label="Stage all"
                control={
                    <Checkbox
                        checked={stagedCount === files.length}
                        indeterminate={stagedCount > 0 && stagedCount < files.length}
                        onChange={event => setAll(event.target.checked)}
                    />
                }
            />
            <div className="flex flex-col" style={{ paddingLeft: "var(--space-6)" }}>
                {files.map(file => (
                    <FormControlLabel
                        key={file.name}
                        label={<span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{file.name}</span>}
                        control={<Checkbox checked={file.isStaged} onChange={() => toggle(file.name)} />}
                    />
                ))}
            </div>
        </div>
    );
}

//
// Renders one section per control, each shown in the themes of the current mode.
//
export function TogglesPage(): ReactNode {
    return (
        <div>
            <Section title="Checkbox" description="Picks any number of things. The top box is mixed while some files below it are ticked and some are not.">
                <StagingChecklist />
            </Section>

            <Section title="Disabled checkboxes" description="Checkboxes that cannot be changed, ticked and not.">
                <div className="flex flex-col">
                    <FormControlLabel label="Sign commits (no key set up)" control={<Checkbox disabled />} />
                    <FormControlLabel label="Run hooks (required by the repository)" control={<Checkbox disabled checked />} />
                </div>
            </Section>

            <Section title="Radio buttons" description="Picks one of a few choices, all in view.">
                <FormControl>
                    <FormLabel id="pull-mode-label">When pulling</FormLabel>
                    <RadioGroup aria-labelledby="pull-mode-label" defaultValue="merge">
                        <FormControlLabel value="merge" label="Merge" control={<Radio />} />
                        <FormControlLabel value="rebase" label="Rebase" control={<Radio />} />
                        <FormControlLabel value="fast-forward" label="Fast-forward only" control={<Radio />} />
                        <FormControlLabel value="ask" label="Ask each time (needs a newer Git)" control={<Radio />} disabled />
                    </RadioGroup>
                </FormControl>
            </Section>

            <Section title="Switch" description="Turns a setting on or off straight away, with no Save button.">
                <div className="flex flex-col">
                    <FormControlLabel label="Fetch in the background" control={<Switch defaultChecked />} />
                    <FormControlLabel label="Show whitespace changes" control={<Switch />} />
                    <FormControlLabel label="Auto-stash (on for this repository)" control={<Switch disabled checked />} />
                    <FormControlLabel label="Prune on fetch (needs a remote)" control={<Switch disabled />} />
                </div>
            </Section>
        </div>
    );
}
