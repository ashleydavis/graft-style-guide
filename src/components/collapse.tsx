//
// Collapsing a pane: the button in a pane's header that folds the pane into a narrow strip at its
// side, and the strip that stands in for the pane until it is restored.
//

import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import { Tip } from "./tip";

//
// The key that collapses the pane the keys are on, or restores it when it is collapsed, as the
// tooltips name it.
//
export const COLLAPSE_KEY = "C";

//
// The side a pane collapses towards.
//
export type CollapseSide = "left" | "right";

//
// Renders the collapse button: double arrows pointing to the side the pane folds towards.
//
export function CollapseButton({ side, onClick }: { side: CollapseSide; onClick: () => void }): ReactNode {
    return (
        <Tooltip title={<Tip title={`Collapse the pane to the ${side}`} detail={`Key: ${COLLAPSE_KEY}`} />}>
            <IconButton size="small" aria-label="Collapse the pane" onClick={onClick}>
                <FontAwesomeIcon icon={side === "left" ? faAnglesLeft : faAnglesRight} />
            </IconButton>
        </Tooltip>
    );
}

//
// What a collapsed pane's strip shows.
//
export interface ICollapsedRailProps {
    //
    // The pane's name, for assistive technology, the same as the pane's own, so the pane keeps its
    // place among the explorer's panes.
    //
    label: string;

    //
    // The pane's title, written down the strip.
    //
    title: string;

    //
    // The side the pane collapsed towards, which the restore button points away from.
    //
    side: CollapseSide;

    //
    // True while the pane is the one the keys act on, drawn with the active pane's border.
    //
    isActive: boolean;

    //
    // Called by the restore button.
    //
    onRestore: () => void;

    //
    // True for a strip in an area that stacks its panes on a narrow screen, where the strip lies
    // across the area with its title along it, and stands upright once the panes sit side by side.
    //
    isResponsive?: boolean;
}

//
// Renders the strip that stands in for a collapsed pane: an outlined card the width of a button,
// with a button at its top that restores the pane and the pane's title written down it.
//
export function CollapsedRail({ label, title, side, isActive, onRestore, isResponsive = false }: ICollapsedRailProps): ReactNode {
    return (
        <Paper
            component="section"
            variant="outlined"
            aria-label={label}
            data-active={isActive}
            data-collapsed="true"
            className={isResponsive ? "flex flex-none flex-row items-center lg:h-full lg:flex-col" : "flex h-full flex-none flex-col items-center"}
            sx={{
                gap: "var(--space-2)",
                padding: "var(--space-1)",
                borderRadius: "var(--radius-lg)",
                borderColor: isActive ? "var(--color-select-pane)" : "var(--color-border)",
                boxShadow: isActive ? "0 0 0 1px var(--color-select-pane), var(--shadow-raised)" : "var(--shadow-raised)",
            }}
        >
            <Tooltip title={<Tip title="Restore the pane" detail={`Key: ${COLLAPSE_KEY}`} />}>
                <IconButton size="small" aria-label={`Restore ${label.toLowerCase()}`} onClick={onRestore}>
                    <FontAwesomeIcon icon={side === "left" ? faAnglesRight : faAnglesLeft} />
                </IconButton>
            </Tooltip>
            <span
                className={isResponsive ? "truncate lg:[writing-mode:vertical-rl]" : "truncate [writing-mode:vertical-rl]"}
                style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)", color: "var(--color-text-muted)" }}
            >
                {title}
            </span>
        </Paper>
    );
}
