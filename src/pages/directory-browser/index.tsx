//
// The directory browser page: the browser Graft opens a repository from, walking made-up
// directories in place of the real ones the backend reads in Graft.
//

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Section } from "../../components/section";
import { DirectoryBrowser } from "./components/directory-browser";

//
// The least height the browser takes, in pixels, so its tree keeps room for a few rows on a short
// screen such as a phone on its side.
//
const BROWSER_HEIGHT_MIN_PX = 320;

//
// The room under the browser, in pixels: the section's bottom margin of 40 and the page's bottom
// padding of 32, so the page ends at the bottom of the window with no scrolling.
//
const PAGE_BOTTOM_PX = 72;

//
// Returns the height that takes the browser whose top sits `topPx` from the top of the page down
// to the bottom of a `viewportPx` high window. A browser whose top starts below the first screen,
// such as the second of two themes stacked on a narrow screen, takes a whole screen.
//
export function browserHeightPx(topPx: number, viewportPx: number): number {
    if (topPx < viewportPx / 2) {
        return Math.max(BROWSER_HEIGHT_MIN_PX, viewportPx - topPx - PAGE_BOTTOM_PX);
    }
    return Math.max(BROWSER_HEIGHT_MIN_PX, viewportPx - PAGE_BOTTOM_PX * 2);
}

//
// Renders the browser, as tall as the window leaves under it, with the line naming the repository
// the Open repository button picked under the tree, where Graft would open it. The height is
// worked out again when the window changes size.
//
export function DirectoryBrowserFill({ onPick, picked }: { onPick: (path: string) => void; picked: string | undefined }): ReactNode {
    const fillRef = useRef<HTMLDivElement>(null);
    const [heightPx, setHeightPx] = useState(BROWSER_HEIGHT_MIN_PX);

    useLayoutEffect(() => {
        function measure(): void {
            const element = fillRef.current;
            if (!element) {
                return;
            }
            setHeightPx(browserHeightPx(element.getBoundingClientRect().top + window.scrollY, window.innerHeight));
        }
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    return (
        <div ref={fillRef} className="flex flex-col" style={{ height: `${heightPx}px`, gap: "var(--space-3)" }}>
            <div className="min-h-0 flex-1">
                <DirectoryBrowser onPick={onPick} />
            </div>
            {picked ? (
                <p role="status" className="flex-none" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    Opening <code style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>{picked}</code>
                </p>
            ) : undefined}
        </div>
    );
}

//
// Renders the browser in a section shown in the themes of the current mode, filling the height of
// the window.
//
export function DirectoryBrowserPage(): ReactNode {
    const [picked, setPicked] = useState<string | undefined>(undefined);
    return (
        <div>
            <Section title="Open a repository" description="Walk the directories, search under the one shown and open a Git repository.">
                <DirectoryBrowserFill onPick={setPicked} picked={picked} />
            </Section>
        </div>
    );
}
