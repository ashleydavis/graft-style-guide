//
// The image diff: an image file's old and new versions side by side, for an image Git counts as
// binary and compares no lines of.
//

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch, faCodeMerge, type IconDefinition } from "@fortawesome/free-solid-svg-icons";

//
// One version of an example image: the picture it shows, drawn from an icon and the accent, and
// the facts under it.
//
export interface IImageVersion {
    //
    // The icon the picture shows.
    //
    icon: IconDefinition;

    //
    // The corner radius of the picture's tile, as a CSS length.
    //
    radius: string;

    //
    // The image's width and height in pixels.
    //
    width: number;
    height: number;

    //
    // The file's size, as in "18.2 KB".
    //
    size: string;
}

//
// The two versions of the example app icon: a round tile with the branch icon before, and a
// rounded square with the merge icon after.
//
export const exampleImageVersions: { before: IImageVersion; after: IImageVersion } = {
    before: { icon: faCodeBranch, radius: "var(--radius-full)", width: 512, height: 512, size: "18.2 KB" },
    after: { icon: faCodeMerge, radius: "var(--radius-lg)", width: 512, height: 512, size: "21.7 KB" },
};

//
// Renders one side: a label in the deleted or added colour, the picture centred on a checkerboard
// that shows any transparent parts, and its dimensions and size below.
//
export function ImageSide({ label, version, colour }: { label: string; version: IImageVersion; colour: string }): ReactNode {
    return (
        <figure className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-2)" }}>
            <figcaption style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", letterSpacing: "0.05em", textTransform: "uppercase", color: colour }}>{label}</figcaption>
            <div
                role="img"
                aria-label={`${label}: ${version.width} by ${version.height} image`}
                className="flex aspect-square items-center justify-center"
                style={{
                    border: `2px solid ${colour}`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--color-panel)",
                    backgroundImage: "repeating-conic-gradient(var(--color-raised) 0% 25%, transparent 0% 50%)",
                    backgroundSize: "var(--space-4) var(--space-4)",
                }}
            >
                <div
                    className="flex items-center justify-center"
                    style={{
                        width: "60%",
                        aspectRatio: "1",
                        borderRadius: version.radius,
                        background: "var(--color-accent)",
                        color: "var(--color-on-accent)",
                        fontSize: "calc(var(--icon-lg) * 3)",
                        boxShadow: "var(--shadow-raised)",
                    }}
                >
                    <FontAwesomeIcon icon={version.icon} />
                </div>
            </div>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                {version.width} × {version.height} · {version.size}
            </span>
        </figure>
    );
}

//
// Renders the old version beside the new one, Before in the deleted colour and After in the added
// colour, stacking them on a narrow screen.
//
export function ImageDiff({ before, after }: { before: IImageVersion; after: IImageVersion }): ReactNode {
    return (
        <div className="flex flex-col sm:flex-row" style={{ gap: "var(--space-4)", padding: "var(--space-4)", maxWidth: "720px" }}>
            <ImageSide label="Before" version={before} colour="var(--color-diff-removed-line)" />
            <ImageSide label="After" version={after} colour="var(--color-diff-added-line)" />
        </div>
    );
}
