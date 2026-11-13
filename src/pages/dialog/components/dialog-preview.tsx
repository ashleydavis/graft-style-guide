//
// A dialog drawn inline on the page, so it sits inside a light or dark panel and takes that
// panel's tokens.
//

import type { ReactNode } from "react";
import Paper from "@mui/material/Paper";

//
// Renders `children` on the same "dialog" Paper surface an opened MUI Dialog uses, at the
// width of a small dialog.
//
export function DialogPreview({ children }: { children: ReactNode }): ReactNode {
    return (
        <Paper
            variant="dialog"
            sx={{
                maxWidth: "444px",
            }}
        >
            {children}
        </Paper>
    );
}
