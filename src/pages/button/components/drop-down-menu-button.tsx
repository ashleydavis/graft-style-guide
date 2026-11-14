//
// A drop-down button that opens a menu: a button with a down chevron after its label, and the
// menu of actions it opens below it.
//

import { useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, type IconDefinition } from "@fortawesome/free-solid-svg-icons";

//
// One action in the menu.
//
export interface IDropDownMenuItem {
    //
    // The words on the item.
    //
    label: string;

    //
    // The icon before the words.
    //
    icon: IconDefinition;
}

//
// Renders the button and, while open, the menu below it. Choosing an item calls `onPick` with
// its label and closes the menu, as do Escape and a click outside.
//
export function DropDownMenuButton({
    label,
    items,
    variant = "outlined",
    onPick,
}: {
    label: string;
    items: IDropDownMenuItem[];
    variant?: "contained" | "outlined";
    onPick?: (label: string) => void;
}): ReactNode {
    const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);

    function pick(itemLabel: string): void {
        setAnchor(undefined);
        onPick?.(itemLabel);
    }

    return (
        <div className="inline-block">
            <Button
                variant={variant}
                aria-haspopup="menu"
                aria-expanded={anchor !== undefined}
                endIcon={<FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "var(--icon-sm)" }} />}
                onClick={event => setAnchor(event.currentTarget)}
            >
                {label}
            </Button>
            <Menu anchorEl={anchor} open={anchor !== undefined} onClose={() => setAnchor(undefined)}>
                {items.map(item => (
                    <MenuItem key={item.label} onClick={() => pick(item.label)}>
                        <ListItemIcon>
                            <FontAwesomeIcon icon={item.icon} />
                        </ListItemIcon>
                        <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
}
