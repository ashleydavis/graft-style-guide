//
// A resize handle: the gap between two panes, which a drag or the arrow keys move to make the pane
// on its left wider or narrower.
//

import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import Tooltip from "@mui/material/Tooltip";
import { Tip } from "../../../components/tip";

//
// How far one press of Left or Right moves the handle, in pixels.
//
const KEY_STEP = 16;

//
// What the handle resizes and how far it may go.
//
export interface IResizeHandleProps {
    //
    // The name of the pane it resizes, as in "commit list".
    //
    label: string;

    //
    // Returns the pane's width on screen now, in pixels, which a drag and the keys start from.
    //
    getWidth: () => number;

    //
    // The narrowest the pane may go, in pixels.
    //
    min: number;

    //
    // The widest the pane may go, in pixels.
    //
    max: number;

    //
    // Called when the handle is double-clicked, to put the pane back to the width it started at.
    //
    onReset: () => void;

    //
    // Called with the pane's new width.
    //
    onWidth: (width: number) => void;
}

//
// Renders the handle as a strip as wide as the gap between the panes, with a line down its middle
// that shows in the accent colour under the pointer, while dragging and with the keyboard on it.
// Dragging moves the pane's right edge with the pointer; Left and Right move it a step; a
// double-click puts it back to its starting width. It is a separator for assistive technology.
//
export function ResizeHandle({ label, getWidth, min, max, onReset, onWidth }: IResizeHandleProps): ReactNode {
    const dragStart = useRef<{ x: number; width: number } | undefined>(undefined);

    function clamp(value: number): number {
        return Math.round(Math.min(Math.max(value, min), max));
    }

    function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStart.current = { x: event.clientX, width: getWidth() };
    }

    function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
        if (dragStart.current) {
            onWidth(clamp(dragStart.current.width + event.clientX - dragStart.current.x));
        }
    }

    function onPointerUp(event: PointerEvent<HTMLDivElement>): void {
        dragStart.current = undefined;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            onWidth(clamp(getWidth() + (event.key === "ArrowLeft" ? -KEY_STEP : KEY_STEP)));
        }
    }

    return (
        <Tooltip title={<Tip title={`Resize the ${label}`} detail="Drag, or use Left and Right. Double-click to reset." />} placement="top" followCursor>
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label={`Resize the ${label}`}
                aria-valuemin={min}
                aria-valuemax={max}
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onKeyDown={onKeyDown}
                onDoubleClick={onReset}
                className="group relative flex flex-none cursor-col-resize justify-center self-stretch outline-none"
                style={{ width: "var(--space-3)", touchAction: "none" }}
            >
                <span
                    aria-hidden="true"
                    className="h-full transition-colors group-hover:bg-(--color-select-pane) group-focus-visible:bg-(--color-select-pane) group-active:bg-(--color-select-pane)"
                    style={{ width: "2px", borderRadius: "var(--radius-full)" }}
                />
            </div>
        </Tooltip>
    );
}
