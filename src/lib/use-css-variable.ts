//
// Reads the current value of a CSS variable on an element, and reads it again whenever Vite
// reloads a stylesheet, so token values shown in the explorer follow edits to graft.css.
//

import { useLayoutEffect, useState, type RefObject } from "react";

//
// The window event main.tsx sends after Vite applies an update, so every component showing a
// token value can read it again.
//
export const STYLES_UPDATED_EVENT = "graft-styles-updated";

//
// Returns the computed value of the CSS variable `name` on the element in `elementRef`, so a
// swatch can print the value the theme it sits in resolves to.
//
export function useCssVariable(elementRef: RefObject<HTMLElement | null>, name: string): string {
    const [value, setValue] = useState("");

    useLayoutEffect(() => {
        function readValue(): void {
            const element = elementRef.current;
            if (!element) {
                return;
            }
            setValue(getComputedStyle(element).getPropertyValue(name).trim());
        }

        readValue();
        window.addEventListener(STYLES_UPDATED_EVENT, readValue);
        return () => {
            window.removeEventListener(STYLES_UPDATED_EVENT, readValue);
        };
    }, [elementRef, name]);

    return value;
}
