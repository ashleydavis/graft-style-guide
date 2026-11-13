//
// The text box page: every state of a single-line and multi-line text box.
//

import type { ReactNode } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";

//
// Renders one section per text box state, each shown in both themes.
//
export function TextBoxPage(): ReactNode {
    return (
        <div>
            <Section title="Default" description="A labelled text box, empty and filled in.">
                <div className="flex flex-wrap gap-3">
                    <TextField label="Branch name" size="small" />
                    <TextField label="Branch name" size="small" defaultValue="feature/style-guide" />
                </div>
            </Section>

            <Section title="Placeholder and icon" description="A search box with a placeholder and an icon.">
                <TextField
                    placeholder="Search commits"
                    size="small"
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            </Section>

            <Section title="Error" description="A value that fails validation, with the reason below.">
                <TextField
                    label="Branch name"
                    size="small"
                    defaultValue="feature/style guide"
                    error
                    helperText="Branch names cannot contain spaces."
                />
            </Section>

            <Section title="Disabled" description="A text box whose value is locked, drawn in muted colours.">
                <TextField label="Remote" size="small" defaultValue="origin" disabled />
            </Section>

            <Section title="Multi-line" description="A commit message box.">
                <TextField label="Commit message" multiline minRows={3} fullWidth />
            </Section>
        </div>
    );
}
