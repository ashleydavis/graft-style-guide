//
// A colour swatch for one colour token, with the token's name and the value it resolves to
// in the theme the swatch sits in.
//

import { useRef, type ReactNode } from "react";
import { useCssVariable } from "../../../lib/use-css-variable";

//
// Renders a block filled with the colour token `name`, labelled with the name and its value,
// so the overview shows every colour and what it is set to.
//
export function Swatch({ name }: { name: string }): ReactNode {
    const swatchRef = useRef<HTMLDivElement>(null);
    const value = useCssVariable(swatchRef, name);

    return (
        <div ref={swatchRef} className="flex w-28 flex-col gap-1">
            <div
                className="h-12"
                style={{
                    background: `var(${name})`,
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                }}
            />
            <div
                style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                }}
            >
                {name}
            </div>
            <div
                style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-muted)",
                }}
            >
                {value}
            </div>
        </div>
    );
}
