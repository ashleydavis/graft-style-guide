//
// Builds the MUI theme for the explorer. Every colour, size and radius in it is a CSS variable
// from graft.css, so a component follows the data-theme of the panel it sits in and picks up
// edits to graft.css while the page stays open.
//

import { createElement } from "react";
import { createTheme, type Theme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleInfo, faCircleXmark, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

//
// Adds two variants to MUI's Paper: "dialog", so a dialog and an inline preview of a dialog
// draw their surface from the same style, and "overlay", the surface of a menu, list or palette
// that floats over the page.
//
declare module "@mui/material/Paper" {
    interface PaperPropsVariantOverrides {
        dialog: true;
        overlay: true;
    }
}

//
// Adds variants to MUI's Chip: "count", a number beside a label such as a tab's, and one
// variant per kind of Git ref, each marked with its own colour.
//
declare module "@mui/material/Chip" {
    interface ChipPropsVariantOverrides {
        count: true;
        current: true;
        branch: true;
        remote: true;
        tag: true;
        head: true;
    }
}

//
// Adds a "plain" variant to MUI's Alert, for a message with no status: no status colour and no
// icon.
//
declare module "@mui/material/Alert" {
    interface AlertPropsVariantOverrides {
        plain: true;
    }
}

//
// The colour token that marks each kind of Git ref on its chip's icon.
//
const refChipColours = {
    branch: "var(--color-accent)",
    remote: "var(--color-info)",
    tag: "var(--color-warning)",
    head: "var(--color-accent)",
};

//
// The MUI theme the explorer wraps every page in. Styles go in styleOverrides instead of the
// palette, because MUI works out hover and contrast colours by parsing palette values, and that
// parsing accepts only literal colours.
//
export const graftTheme: Theme = createTheme({
    typography: {
        fontFamily: "var(--font-sans)",
    },
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            variants: [
                //
                // The danger button: a red border, red words and a red icon on no fill, so an
                // action that loses work is marked without a block of red. Under the pointer the
                // border thickens and the fill stays clear, so the red words keep the contrast
                // they have on the panel.
                //
                {
                    props: {
                        variant: "outlined",
                        color: "error",
                    },
                    style: {
                        backgroundColor: "transparent",
                        color: "var(--color-danger)",
                        border: "none",
                        boxShadow: "inset 0 0 0 1px var(--color-danger)",
                        "&:hover": {
                            backgroundColor: "transparent",
                            border: "none",
                            boxShadow: "inset 0 0 0 2px var(--color-danger)",
                        },
                    },
                },
            ],
            styleOverrides: {
                root: {
                    textTransform: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    fontWeight: "var(--weight-medium)",
                    lineHeight: "var(--leading-normal)",
                    padding: "var(--space-2) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    transition: "background-color var(--duration-fast) var(--ease-standard)",
                    "&:focus-visible": {
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "var(--focus-ring-offset)",
                    },
                },
                sizeSmall: {
                    padding: "var(--space-1) var(--space-3)",
                },
                sizeLarge: {
                    padding: "var(--space-3) var(--space-6)",
                    fontSize: "var(--text-lg)",
                },
                startIcon: {
                    "& > *:nth-of-type(1)": {
                        fontSize: "var(--icon-md)",
                    },
                },
                //
                // Every kind of button has a 1px border, drawn as an inset line so it adds no
                // size and every kind of button stays the same height.
                //
                contained: {
                    backgroundColor: "var(--color-accent)",
                    color: "var(--color-on-accent)",
                    boxShadow: "inset 0 0 0 1px var(--color-accent-hover)",
                    "&:hover": {
                        backgroundColor: "var(--color-accent-hover)",
                        boxShadow: "inset 0 0 0 1px var(--color-accent-hover)",
                    },
                    "&.Mui-disabled": {
                        backgroundColor: "var(--color-disabled)",
                        color: "var(--color-text-disabled)",
                        boxShadow: "inset 0 0 0 1px var(--color-border)",
                    },
                },
                outlined: {
                    borderColor: "var(--color-border-control)",
                    color: "var(--color-text)",
                    "&:hover": {
                        borderColor: "var(--color-text-muted)",
                        backgroundColor: "var(--color-hover)",
                    },
                    "&.Mui-disabled": {
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-disabled)",
                    },
                },
                text: {
                    color: "var(--color-accent)",
                    boxShadow: "inset 0 0 0 1px var(--color-border)",
                    "&:hover": {
                        backgroundColor: "var(--color-hover)",
                    },
                    "&.Mui-disabled": {
                        color: "var(--color-text-disabled)",
                        boxShadow: "inset 0 0 0 1px var(--color-border)",
                    },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: "var(--color-panel)",
                    color: "var(--color-text)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    borderRadius: "var(--radius-md)",
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--color-border-control)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--color-text-muted)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--color-focus)",
                    },
                    "&.Mui-error .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--color-danger)",
                    },
                    "&.Mui-disabled": {
                        backgroundColor: "var(--color-disabled)",
                    },
                    "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--color-border)",
                    },
                },
                input: {
                    "&::placeholder": {
                        color: "var(--color-text-muted)",
                        opacity: 1,
                    },
                    "&.Mui-disabled": {
                        WebkitTextFillColor: "var(--color-text-disabled)",
                    },
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: "var(--color-text-muted)",
                    fontSize: "var(--text-md)",
                    "&.Mui-focused": {
                        color: "var(--color-focus)",
                    },
                    "&.Mui-error": {
                        color: "var(--color-danger)",
                    },
                    "&.Mui-disabled": {
                        color: "var(--color-text-disabled)",
                    },
                },
            },
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    color: "var(--color-text-muted)",
                    fontSize: "var(--text-sm)",
                    "&.Mui-error": {
                        color: "var(--color-danger)",
                    },
                },
            },
        },
        MuiInputAdornment: {
            styleOverrides: {
                root: {
                    color: "var(--color-text-muted)",
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: "var(--color-panel)",
                    backgroundImage: "none",
                    color: "var(--color-text)",
                    borderRight: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-overlay)",
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                //
                // An icon button is square, its icon centred with room on every side between it and
                // the border.
                //
                root: {
                    width: "calc(var(--icon-lg) + var(--space-3))",
                    height: "calc(var(--icon-lg) + var(--space-3))",
                    padding: 0,
                    flex: "none",
                    fontSize: "var(--icon-lg)",
                    color: "var(--color-text-muted)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "inset 0 0 0 1px var(--color-border)",
                    "&:hover": {
                        backgroundColor: "var(--color-hover)",
                        color: "var(--color-text)",
                    },
                    "&.Mui-disabled": {
                        color: "var(--color-text-disabled)",
                    },
                    "&:focus-visible": {
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "var(--focus-ring-offset)",
                    },
                },
                sizeSmall: {
                    width: "calc(var(--icon-md) + var(--space-3))",
                    height: "calc(var(--icon-md) + var(--space-3))",
                    fontSize: "var(--icon-md)",
                },
            },
            variants: [
                {
                    //
                    // A danger icon button, such as Discard, looks like the danger button: the icon
                    // and the border in the danger colour, the border thickening on hover.
                    //
                    props: {
                        color: "error",
                    },
                    style: {
                        color: "var(--color-danger)",
                        boxShadow: "inset 0 0 0 1px var(--color-danger)",
                        "&:hover": {
                            backgroundColor: "transparent",
                            color: "var(--color-danger)",
                            boxShadow: "inset 0 0 0 2px var(--color-danger)",
                        },
                        "&.Mui-disabled": {
                            color: "var(--color-text-disabled)",
                            boxShadow: "inset 0 0 0 1px var(--color-border)",
                        },
                    },
                },
            ],
        },
        MuiLink: {
            styleOverrides: {
                root: {
                    color: "var(--color-accent)",
                    textDecorationColor: "var(--color-accent)",
                    "&:hover": {
                        color: "var(--color-accent-hover)",
                    },
                    "&:focus-visible": {
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "var(--focus-ring-offset)",
                    },
                },
            },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    textTransform: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    color: "var(--color-text-muted)",
                    borderColor: "var(--color-border-control)",
                    "&:hover": {
                        backgroundColor: "var(--color-hover)",
                    },
                    "&.Mui-selected": {
                        backgroundColor: "var(--color-accent)",
                        color: "var(--color-on-accent)",
                    },
                    "&.Mui-selected:hover": {
                        backgroundColor: "var(--color-accent-hover)",
                    },
                },
            },
        },
        MuiToggleButtonGroup: {
            styleOverrides: {
                root: {
                    borderRadius: "var(--radius-md)",
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                outlined: {
                    backgroundColor: "var(--color-panel)",
                    backgroundImage: "none",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                },
            },
            variants: [
                {
                    props: {
                        variant: "overlay",
                    },
                    style: {
                        backgroundColor: "var(--color-panel)",
                        backgroundImage: "none",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-overlay)",
                    },
                },
                {
                    props: {
                        variant: "dialog",
                    },
                    style: {
                        backgroundColor: "var(--color-panel)",
                        backgroundImage: "none",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "var(--shadow-overlay)",
                    },
                },
            ],
        },
        MuiDialog: {
            defaultProps: {
                disableScrollLock: true,
                slotProps: {
                    paper: {
                        variant: "dialog",
                    },
                },
            },
        },
        MuiBackdrop: {
            styleOverrides: {
                root: {
                    backgroundColor: "var(--color-scrim)",
                },
                invisible: {
                    backgroundColor: "transparent",
                },
            },
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--weight-bold)",
                    padding: "var(--space-4) var(--space-6) var(--space-2)",
                },
            },
        },
        MuiDialogContent: {
            styleOverrides: {
                root: {
                    padding: "var(--space-2) var(--space-6)",
                },
            },
        },
        MuiDialogContentText: {
            styleOverrides: {
                root: {
                    color: "var(--color-text-muted)",
                    fontSize: "var(--text-md)",
                    marginBottom: "var(--space-4)",
                },
            },
        },
        MuiDialogActions: {
            //
            // Spacing between the buttons comes from the gap below, so MUI's own margin between
            // them is switched off.
            //
            defaultProps: {
                disableSpacing: true,
            },
            styleOverrides: {
                root: {
                    padding: "var(--space-4) var(--space-6)",
                    gap: "var(--space-2)",
                },
            },
        },
        //
        // Popups mount next to the control that opens them instead of at the end of the page,
        // so they sit inside the same themed panel and take its light or dark tokens.
        //
        MuiPopover: {
            defaultProps: {
                disablePortal: true,
                //
                // The page keeps its scrollbar while a popover, menu or dropdown dialog is open,
                // so the page does not jump as it opens and closes.
                //
                disableScrollLock: true,
            },
            styleOverrides: {
                paper: {
                    backgroundColor: "var(--color-panel)",
                    backgroundImage: "none",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-overlay)",
                },
            },
        },
        MuiPopper: {
            defaultProps: {
                disablePortal: true,
            },
        },
        //
        // A menu has a spacing step above its first item and below its last, and half a step at
        // each side.
        //
        MuiMenu: {
            defaultProps: {
                disableScrollLock: true,
            },
            styleOverrides: {
                list: {
                    padding: "var(--space-2) var(--space-1)",
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    minHeight: "auto",
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    gap: "var(--space-2)",
                    transition: "background-color var(--duration-fast) var(--ease-standard)",
                    "&:hover": {
                        backgroundColor: "var(--color-hover)",
                    },
                    "&.Mui-focusVisible": {
                        backgroundColor: "var(--color-hover)",
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "calc(var(--focus-ring-width) * -1)",
                    },
                    "&.Mui-selected, &.Mui-selected:hover": {
                        backgroundColor: "var(--color-selected)",
                    },
                    "&.Mui-disabled": {
                        opacity: 1,
                        color: "var(--color-text-disabled)",
                    },
                },
            },
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    minWidth: "var(--space-6)",
                    color: "var(--color-text-muted)",
                    fontSize: "var(--icon-md)",
                },
            },
        },
        MuiListItemText: {
            styleOverrides: {
                root: {
                    margin: 0,
                },
                primary: {
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                },
                secondary: {
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-muted)",
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    transition: "background-color var(--duration-fast) var(--ease-standard)",
                    "&:hover": {
                        backgroundColor: "var(--color-hover)",
                    },
                    "&.Mui-focusVisible": {
                        backgroundColor: "var(--color-hover)",
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "calc(var(--focus-ring-width) * -1)",
                    },
                    "&.Mui-selected, &.Mui-selected:hover": {
                        backgroundColor: "var(--color-selected)",
                    },
                },
            },
        },
        MuiListSubheader: {
            styleOverrides: {
                root: {
                    position: "static",
                    backgroundColor: "transparent",
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-bold)",
                    lineHeight: "var(--leading-normal)",
                    padding: "var(--space-2) var(--space-3) var(--space-1)",
                },
            },
        },
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: "var(--color-border)",
                },
            },
        },
        MuiCheckbox: {
            styleOverrides: {
                root: {
                    color: "var(--color-border-control)",
                    padding: "var(--space-1)",
                    fontSize: "var(--icon-lg)",
                    "& .MuiSvgIcon-root": {
                        fontSize: "var(--icon-lg)",
                    },
                    "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                        color: "var(--color-accent)",
                    },
                    "&.Mui-disabled": {
                        color: "var(--color-text-disabled)",
                    },
                    "&.Mui-focusVisible": {
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "calc(var(--focus-ring-offset) * -1)",
                        borderRadius: "var(--radius-md)",
                    },
                },
            },
        },
        MuiRadio: {
            styleOverrides: {
                root: {
                    color: "var(--color-border-control)",
                    padding: "var(--space-1)",
                    "& .MuiSvgIcon-root": {
                        fontSize: "var(--icon-lg)",
                    },
                    "&.Mui-checked": {
                        color: "var(--color-accent)",
                    },
                    "&.Mui-disabled": {
                        color: "var(--color-text-disabled)",
                    },
                    "&.Mui-focusVisible": {
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "calc(var(--focus-ring-offset) * -1)",
                        borderRadius: "var(--radius-full)",
                    },
                },
            },
        },
        //
        // A compact switch: a rounded track 36px wide with the knob inside it.
        //
        MuiSwitch: {
            styleOverrides: {
                root: {
                    width: "36px",
                    height: "20px",
                    padding: 0,
                    //
                    // Room above and below keeps a column of switches apart, as the larger
                    // switch's own padding did.
                    //
                    margin: "var(--space-1) var(--space-2) var(--space-1) var(--space-1)",
                    "& .MuiSwitch-switchBase.Mui-focusVisible .MuiSwitch-thumb": {
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "var(--focus-ring-offset)",
                    },
                },
                track: {
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--color-border-control)",
                    opacity: 1,
                    ".Mui-checked.Mui-checked + &": {
                        backgroundColor: "var(--color-accent)",
                        opacity: 1,
                    },
                    ".Mui-disabled.Mui-disabled + &": {
                        backgroundColor: "var(--color-disabled)",
                        opacity: 1,
                    },
                },
                thumb: {
                    width: "16px",
                    height: "16px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--color-panel)",
                    boxShadow: "none",
                },
                switchBase: {
                    padding: "2px",
                    "&.Mui-checked": {
                        transform: "translateX(16px)",
                    },
                    "&.Mui-checked .MuiSwitch-thumb": {
                        backgroundColor: "var(--color-on-accent)",
                    },
                    "&.Mui-disabled .MuiSwitch-thumb": {
                        backgroundColor: "var(--color-text-disabled)",
                    },
                    "&:hover": {
                        backgroundColor: "transparent",
                    },
                },
            },
        },
        MuiFormControlLabel: {
            styleOverrides: {
                root: {
                    marginLeft: 0,
                    gap: "var(--space-1)",
                },
                label: {
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    "&.Mui-disabled": {
                        color: "var(--color-text-disabled)",
                    },
                },
            },
        },
        MuiFormLabel: {
            styleOverrides: {
                root: {
                    color: "var(--color-text-muted)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    "&.Mui-focused": {
                        color: "var(--color-text-muted)",
                    },
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                icon: {
                    color: "var(--color-text-muted)",
                },
            },
        },
        MuiToolbar: {
            styleOverrides: {
                dense: {
                    minHeight: "auto",
                    padding: "var(--space-1) var(--space-2)",
                    gap: "var(--space-2)",
                    flexWrap: "wrap",
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    minHeight: "auto",
                    borderBottom: "1px solid var(--color-border)",
                },
                indicator: {
                    height: "2px",
                    backgroundColor: "var(--color-accent)",
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: "auto",
                    minWidth: "auto",
                    padding: "var(--space-2) var(--space-3)",
                    textTransform: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    fontWeight: "var(--weight-medium)",
                    color: "var(--color-text-muted)",
                    gap: "var(--space-2)",
                    transition: "color var(--duration-fast) var(--ease-standard)",
                    "&:hover": {
                        color: "var(--color-text)",
                    },
                    "&.Mui-selected": {
                        color: "var(--color-text)",
                    },
                    "&.Mui-disabled": {
                        color: "var(--color-text-disabled)",
                    },
                    "&.Mui-focusVisible": {
                        outline: "var(--focus-ring-width) solid var(--color-focus)",
                        outlineOffset: "calc(var(--focus-ring-width) * -1)",
                    },
                },
            },
        },
        //
        // Every tooltip points at its control with an arrow and waits a moment before it shows,
        // so moving the pointer across a toolbar does not flash a tooltip at each button.
        //
        MuiTooltip: {
            defaultProps: {
                arrow: true,
                enterDelay: 400,
                enterNextDelay: 150,
            },
            styleOverrides: {
                //
                // A tooltip mounts next to the control it labels, so it sets every text style of
                // its own instead of taking the control's, such as a heading's capitals.
                //
                tooltip: {
                    //
                    // A tooltip takes the width of its text, up to its widest, so a tooltip on a
                    // button in a narrow spot does not squeeze its words onto many lines.
                    //
                    width: "max-content",
                    maxWidth: "280px",
                    backgroundColor: "var(--color-text)",
                    color: "var(--color-bg)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    textTransform: "none",
                    letterSpacing: "normal",
                    lineHeight: "var(--leading-tight)",
                    padding: "var(--space-1) var(--space-2)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-overlay)",
                },
                arrow: {
                    color: "var(--color-text)",
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    color: "var(--color-text)",
                    borderBottom: "1px solid var(--color-border)",
                    padding: "var(--space-1) var(--space-3)",
                    lineHeight: "var(--leading-normal)",
                },
                head: {
                    color: "var(--color-text-muted)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    transition: "background-color var(--duration-fast) var(--ease-standard)",
                    "&.MuiTableRow-hover:hover": {
                        backgroundColor: "var(--color-hover)",
                    },
                    "&.Mui-selected, &.Mui-selected:hover": {
                        backgroundColor: "var(--color-selected)",
                    },
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    height: "var(--space-1)",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--color-border)",
                },
                bar: {
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--color-accent)",
                },
            },
        },
        MuiCircularProgress: {
            styleOverrides: {
                root: {
                    color: "var(--color-accent)",
                },
            },
        },
        MuiSkeleton: {
            styleOverrides: {
                root: {
                    backgroundColor: "var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                },
                circular: {
                    borderRadius: "var(--radius-full)",
                },
            },
        },
        MuiChip: {
            variants: [
                {
                    props: {
                        variant: "count",
                    },
                    style: {
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)",
                        backgroundColor: "var(--color-raised)",
                        color: "var(--color-text-muted)",
                    },
                },
                {
                    props: {
                        variant: "current",
                    },
                    style: {
                        backgroundColor: "var(--color-accent)",
                        color: "var(--color-on-accent)",
                        "& .MuiChip-icon": {
                            color: "var(--color-on-accent)",
                        },
                    },
                },
                ...(Object.keys(refChipColours) as (keyof typeof refChipColours)[]).map(kind => ({
                    props: {
                        variant: kind,
                    },
                    //
                    // Each kind of ref is outlined in its colour, with no fill, and its icon takes
                    // the same colour.
                    //
                    style: {
                        backgroundColor: "transparent",
                        boxShadow: `inset 0 0 0 1px ${refChipColours[kind]}`,
                        color: "var(--color-text)",
                        "& .MuiChip-icon": {
                            color: refChipColours[kind],
                        },
                    },
                })),
            ],
            styleOverrides: {
                root: {
                    height: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    lineHeight: "var(--leading-normal)",
                    borderRadius: "var(--radius-full)",
                    gap: "var(--space-1)",
                    //
                    // Half a spacing step above the text, so the lowercase letters of a ref name
                    // sit in the middle of the badge.
                    //
                    padding: "calc(var(--space-1) / 2) var(--space-2) 0",
                },
                label: {
                    padding: 0,
                },
                icon: {
                    margin: 0,
                    fontSize: "var(--icon-sm)",
                },
                deleteIcon: {
                    margin: 0,
                    fontSize: "var(--icon-sm)",
                    color: "var(--color-text-muted)",
                    "&:hover": {
                        color: "var(--color-text)",
                    },
                },
            },
        },
        MuiAlert: {
            //
            // Every severity's icon comes from the same icon set as the rest of Graft.
            //
            defaultProps: {
                iconMapping: {
                    success: createElement(FontAwesomeIcon, { icon: faCircleCheck }),
                    info: createElement(FontAwesomeIcon, { icon: faCircleInfo }),
                    warning: createElement(FontAwesomeIcon, { icon: faTriangleExclamation }),
                    error: createElement(FontAwesomeIcon, { icon: faCircleXmark }),
                },
            },
            //
            // Each severity marks the message with a background tinted with its status colour and
            // the status colour on the icon, with no border, and keeps the text in the main text
            // colour.
            //
            variants: [
                ...(["success", "info", "warning", "error"] as const).map(severity => ({
                    props: {
                        severity,
                    },
                    style: {
                        backgroundColor: `var(--color-${severity === "error" ? "danger" : severity}-subtle)`,
                        border: "none",
                        "& .MuiAlert-icon": {
                            color: `var(--color-${severity === "error" ? "danger" : severity})`,
                        },
                    },
                })),
                //
                // A plain message comes after the severities, so its panel background and border
                // replace the tint of the severity MUI gives every Alert by default.
                //
                {
                    props: {
                        variant: "plain",
                    },
                    style: {
                        backgroundColor: "var(--color-panel)",
                        border: "1px solid var(--color-border)",
                    },
                },
            ],
            styleOverrides: {
                root: {
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    lineHeight: "var(--leading-normal)",
                    color: "var(--color-text)",
                    backgroundColor: "var(--color-panel)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-2) var(--space-3)",
                    gap: "var(--space-2)",
                    alignItems: "flex-start",
                },
                icon: {
                    marginRight: 0,
                    padding: 0,
                    fontSize: "var(--icon-md)",
                    lineHeight: "var(--leading-normal)",
                    height: "calc(var(--text-md) * var(--leading-normal))",
                    alignItems: "center",
                    opacity: 1,
                },
                message: {
                    padding: 0,
                },
                action: {
                    padding: 0,
                    marginRight: 0,
                },
            },
        },
        MuiAlertTitle: {
            styleOverrides: {
                root: {
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    fontWeight: "var(--weight-bold)",
                    margin: 0,
                },
            },
        },
    },
});
