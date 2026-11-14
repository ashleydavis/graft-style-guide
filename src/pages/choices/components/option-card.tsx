//
// One candidate option for a choice: its letter, name and description above the Graft preview
// drawn with the option's tokens.
//

import { useContext, type CSSProperties, type ReactNode } from "react";
import { PanelThemeContext } from "../../../lib/panel-theme";
import type { IChoice, ITokenOption } from "../options";
import { MiniGraft } from "./mini-graft";

//
// Renders the option, with the focus ring drawn on the preview when `showFocus` is true and the
// hover background drawn when `showHover` is true, and the commit menu closed at first when
// `menuStartsOpen` is false. `lanes` names the lane colours the commit graph draws. With `Preview` the option is drawn on that
// preview instead of the small Graft screen. Its tokens are set on the card for the theme
// of the panel it sits in, so everything inside the card uses the option's values and the rest
// of the page stays as graft.css sets it.
//
export function OptionCard({
    option,
    showFocus = false,
    showHover = false,
    menuStartsOpen = true,
    lanes,
    Preview,
}: {
    option: ITokenOption;
    showFocus?: boolean;
    showHover?: boolean;
    menuStartsOpen?: boolean;
    lanes?: number[];
    Preview?: IChoice["Preview"];
}): ReactNode {
    const theme = useContext(PanelThemeContext);
    const tokens = theme === "dark" ? option.dark : option.light;

    return (
        <div
            data-option={option.id}
            className="flex flex-col"
            //
            // React's style type lists only standard CSS properties, so the custom properties of
            // the option need a cast to be set inline.
            //
            style={
                {
                    ...tokens,
                    gap: "var(--space-2)",
                    minWidth: 0,
                } as CSSProperties
            }
        >
            <div>
                <span
                    style={{
                        fontWeight: "var(--weight-bold)",
                    }}
                >
                    {option.id}. {option.name}
                </span>
                <div
                    style={{
                        color: "var(--color-text-muted)",
                        fontSize: "var(--text-sm)",
                    }}
                >
                    {option.description}
                </div>
            </div>
            {Preview ? (
                <Preview optionId={option.id} />
            ) : (
                <MiniGraft showFocus={showFocus} showHover={showHover} menuStartsOpen={menuStartsOpen} lanes={lanes} />
            )}
        </div>
    );
}
