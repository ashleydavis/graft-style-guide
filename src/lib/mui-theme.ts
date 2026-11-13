//
// Builds the MUI theme for the explorer. Every colour, size and radius in it is a CSS variable
// from graft.css, so a component follows the data-theme of the panel it sits in and picks up
// edits to graft.css while the page stays open.
//

import { createTheme, type Theme } from "@mui/material/styles";

//
// Adds a "dialog" variant to MUI's Paper, so a dialog and an inline preview of a dialog draw
// their surface from the same style.
//
declare module "@mui/material/Paper" {
    interface PaperPropsVariantOverrides {
        dialog: true;
    }
}

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
                {
                    props: {
                        variant: "contained",
                        color: "error",
                    },
                    style: {
                        backgroundColor: "var(--color-danger)",
                        color: "var(--color-on-danger)",
                        "&:hover": {
                            backgroundColor: "var(--color-danger)",
                            filter: "brightness(0.92)",
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
                    borderRadius: "var(--radius-md)",
                    transition: "background-color var(--duration-fast) var(--ease-standard)",
                    "&:focus-visible": {
                        outline: "2px solid var(--color-focus)",
                        outlineOffset: "2px",
                    },
                },
                contained: {
                    backgroundColor: "var(--color-accent)",
                    color: "var(--color-on-accent)",
                    "&:hover": {
                        backgroundColor: "var(--color-accent-hover)",
                    },
                    "&.Mui-disabled": {
                        backgroundColor: "var(--color-raised)",
                        color: "var(--color-text-muted)",
                    },
                },
                outlined: {
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                    "&:hover": {
                        borderColor: "var(--color-text-muted)",
                        backgroundColor: "var(--color-raised)",
                    },
                    "&.Mui-disabled": {
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-muted)",
                    },
                },
                text: {
                    color: "var(--color-accent)",
                    "&:hover": {
                        backgroundColor: "var(--color-raised)",
                    },
                    "&.Mui-disabled": {
                        color: "var(--color-text-muted)",
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
                        borderColor: "var(--color-border)",
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
                        backgroundColor: "var(--color-raised)",
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
                        WebkitTextFillColor: "var(--color-text-muted)",
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
                        color: "var(--color-text-muted)",
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
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    textTransform: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-md)",
                    color: "var(--color-text-muted)",
                    borderColor: "var(--color-border)",
                    "&:hover": {
                        backgroundColor: "var(--color-raised)",
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
            variants: [
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
    },
});
