//
// The select page: a drop-down list of choices, built from MUI's Select on the text box style,
// with its open list, a disabled select and one that fails validation.
//

import { useState, type ReactNode } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import { Section } from "../../components/section";

//
// The remotes the examples choose from.
//
const remotes = ["origin", "upstream", "fork"];

//
// Renders a labelled select of remotes that keeps its own value.
//
export function RemoteSelect({ disabled = false }: { disabled?: boolean }): ReactNode {
    const [remote, setRemote] = useState("origin");

    return (
        <FormControl size="small" disabled={disabled} sx={{ minWidth: "200px" }}>
            <InputLabel id={`remote-label-${disabled}`}>Remote</InputLabel>
            <Select labelId={`remote-label-${disabled}`} label="Remote" value={remote} onChange={event => setRemote(event.target.value)}>
                {remotes.map(name => (
                    <MenuItem key={name} value={name}>
                        {name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}

//
// Renders one section per state of a select, each shown in the themes of the current mode.
//
export function SelectPage(): ReactNode {
    const [mergeMode, setMergeMode] = useState("");

    return (
        <div>
            <Section title="Default" description="A labelled select. Click it to open the list of choices below it.">
                <RemoteSelect />
            </Section>

            <Section
                title="Open list"
                description="The list a select opens, drawn here as it looks open: the chosen item on the selected background, the item under the pointer on the hover background and an item that cannot be chosen."
            >
                <Paper variant="overlay" sx={{ width: "220px", maxWidth: "100%" }}>
                    <MenuList aria-label="Remote" sx={{ padding: "var(--space-2) var(--space-1)" }}>
                        <MenuItem selected>
                            <ListItemIcon>
                                <FontAwesomeIcon icon={faCloud} />
                            </ListItemIcon>
                            <ListItemText>origin</ListItemText>
                        </MenuItem>
                        <MenuItem sx={{ backgroundColor: "var(--color-hover)" }}>
                            <ListItemIcon>
                                <FontAwesomeIcon icon={faCloud} />
                            </ListItemIcon>
                            <ListItemText>upstream</ListItemText>
                        </MenuItem>
                        <MenuItem disabled>
                            <ListItemIcon>
                                <FontAwesomeIcon icon={faCloud} />
                            </ListItemIcon>
                            <ListItemText>fork (unreachable)</ListItemText>
                        </MenuItem>
                    </MenuList>
                </Paper>
            </Section>

            <Section title="Error" description="No choice made where one is needed, with the reason below.">
                <FormControl size="small" error sx={{ minWidth: "200px" }}>
                    <InputLabel id="merge-mode-label">Merge mode</InputLabel>
                    <Select labelId="merge-mode-label" label="Merge mode" value={mergeMode} onChange={event => setMergeMode(event.target.value)}>
                        <MenuItem value="merge">Merge commit</MenuItem>
                        <MenuItem value="rebase">Rebase</MenuItem>
                        <MenuItem value="squash">Squash</MenuItem>
                    </Select>
                    <FormHelperText>Choose how to bring the branch in.</FormHelperText>
                </FormControl>
            </Section>

            <Section title="Disabled" description="A select whose value is locked, drawn in the disabled colours.">
                <RemoteSelect disabled />
            </Section>
        </div>
    );
}
