//
// A drop-down button that opens a small dialog below it: a button with a down chevron after its
// label, and a panel of settings with buttons to run or cancel, anchored to the button instead
// of the middle of the screen.
//

import { useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faChevronDown } from "@fortawesome/free-solid-svg-icons";

//
// Renders the Pull button and, while open, the pull settings below it: the remote, merge or
// rebase, and auto-stash. Pull closes the panel and calls `onPull` with a summary of the
// settings. Cancel, Escape and a click outside close it without pulling.
//
export function DropDownDialogButton({ onPull }: { onPull?: (summary: string) => void }): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
    const [remote, setRemote] = useState("origin");
    const [mode, setMode] = useState("merge");
    const [autoStash, setAutoStash] = useState(true);

    function pull(): void {
        setAnchor(undefined);
        onPull?.(`Pulled from ${remote} with ${mode}${autoStash ? ", auto-stash on" : ""}.`);
    }

    return (
        <div className="inline-block">
            <Button
                variant="outlined"
                aria-haspopup="dialog"
                aria-expanded={anchor !== undefined}
                startIcon={<FontAwesomeIcon icon={faArrowDown} />}
                endIcon={<FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "var(--icon-sm)" }} />}
                onClick={event => setAnchor(event.currentTarget)}
            >
                Pull
            </Button>
            <Popover
                open={anchor !== undefined}
                anchorEl={anchor}
                onClose={() => setAnchor(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{
                    paper: {
                        role: "dialog",
                        "aria-label": "Pull settings",
                        sx: {
                            marginTop: "var(--space-1)",
                            width: "280px",
                            maxWidth: "calc(100% - var(--space-8))",
                        },
                    },
                }}
            >
                <div className="flex flex-col" style={{ gap: "var(--space-3)", padding: "var(--space-4)" }}>
                    <div style={{ fontWeight: "var(--weight-bold)" }}>Pull</div>
                    <FormControl size="small" fullWidth>
                        <InputLabel id="pull-remote-label">Remote</InputLabel>
                        <Select labelId="pull-remote-label" label="Remote" value={remote} onChange={event => setRemote(event.target.value)}>
                            <MenuItem value="origin">origin</MenuItem>
                            <MenuItem value="upstream">upstream</MenuItem>
                        </Select>
                    </FormControl>
                    <RadioGroup aria-label="How to bring changes in" value={mode} onChange={event => setMode(event.target.value)}>
                        <FormControlLabel value="merge" label="Merge" control={<Radio />} />
                        <FormControlLabel value="rebase" label="Rebase" control={<Radio />} />
                    </RadioGroup>
                    <FormControlLabel label="Stash and reapply my changes" control={<Checkbox checked={autoStash} onChange={event => setAutoStash(event.target.checked)} />} />
                    <div className="flex justify-end" style={{ gap: "var(--space-2)" }}>
                        <Button variant="text" onClick={() => setAnchor(undefined)}>
                            Cancel
                        </Button>
                        <Button variant="contained" onClick={pull}>
                            Pull
                        </Button>
                    </div>
                </div>
            </Popover>
        </div>
    );
}
