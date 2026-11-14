//
// The name of a non-colour token and the value it resolves to, printed under an example.
//

import { useRef, type ReactNode } from "react";
import { useCssVariable } from "../lib/use-css-variable";

//
// Renders the token `name` and its current value in monospace, so each example on the
// overview says which token it shows.
//
export function TokenLabel({ name }: { name: string }): ReactNode {
    const labelRef = useRef<HTMLDivElement>(null);
    const value = useCssVariable(labelRef, name);

    return (
        <div
            ref={labelRef}
            style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-muted)",
            }}
        >
            {name}: {value}
        </div>
    );
}
