//
// The diff explorer: the changed files of a change as a column of file diff cards, with a toolbar
// and keys that move from change to change and from file to file.
//

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faAngleUp, faAnglesDown, faAnglesUp, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { KeyCaps } from "../../../components/shortcut";
import { Tip } from "../../../components/tip";
import { parseHunks } from "../model";
import { initialStaging, withFileToggled, withHunkToggled, type IStaging } from "../staging";
import { FileDiffCard, type IFileDiff } from "./file-diff-card";

//
// Where the keys are: a file and, within it, a hunk.
//
export interface IDiffPosition {
    //
    // The position of the current file, from 0.
    //
    file: number;

    //
    // The position of the current hunk in that file, from 0, or undefined when the keys are on the
    // file as a whole.
    //
    hunk: number | undefined;
}

//
// Returns the position one change from `position`, forward for step 1 and back for step -1,
// running on into the next or previous file that has changes and skipping files with none. At the
// first or last change it stays where it is.
//
export function changeAfterMove(hunkCounts: number[], position: IDiffPosition, step: number): IDiffPosition {
    const current = position.hunk === undefined ? (step > 0 ? -1 : hunkCounts[position.file]) : position.hunk;
    const next = current + step;
    if (next >= 0 && next < hunkCounts[position.file]) {
        return { file: position.file, hunk: next };
    }
    for (let file = position.file + step; file >= 0 && file < hunkCounts.length; file += step) {
        if (hunkCounts[file] > 0) {
            return { file, hunk: step > 0 ? 0 : hunkCounts[file] - 1 };
        }
    }
    return position;
}

//
// Renders one toolbar button with its tooltip, naming the keys that do the same.
//
export function NavigationButton({ label, keys, icon, onClick }: { label: string; keys: string; icon: IconDefinition; onClick: () => void }): ReactNode {
    return (
        <Tooltip title={<Tip title={label} detail={`Keys: ${keys}`} />}>
            <IconButton size="small" aria-label={label} onClick={onClick}>
                <FontAwesomeIcon icon={icon} />
            </IconButton>
        </Tooltip>
    );
}

//
// Renders the explorer. The toolbar along its top says which file and change the keys are on and
// has buttons for the previous and next change and file. With the focus anywhere in the explorer
// outside a text box or menu, Up and Down move from change to change, running on across files,
// Shift with Up or Down moves from file to file, and Space stages or unstages the current change,
// or the current file when no change is picked. The explorer keeps every card's staging. The current file has an accent border and the
// current change an accent bar, and the page scrolls to bring them into view.
//
export function DiffExplorer({ files }: { files: IFileDiff[] }): ReactNode {
    const [position, setPosition] = useState<IDiffPosition>({ file: 0, hunk: undefined });
    const hasMoved = useRef(false);
    const explorerRef = useRef<HTMLDivElement>(null);
    const hunkCounts = files.map(file => parseHunks(file.diff ?? "").length);
    const [stagings, setStagings] = useState<IStaging[]>(() => files.map(file => initialStaging(file.stagedHunks)));

    function setStaging(index: number, staging: IStaging): void {
        setStagings(current => current.map((old, position) => (position === index ? staging : old)));
    }

    useEffect(() => {
        if (!hasMoved.current) {
            return;
        }
        const card = explorerRef.current?.querySelectorAll("[data-diff-card]")[position.file];
        const target = position.hunk === undefined ? card : card?.querySelector(`[data-hunk-index="${position.hunk}"]`);
        target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [position]);

    function move(next: IDiffPosition): void {
        hasMoved.current = true;
        setPosition(next);
    }

    function moveFile(step: number): void {
        move({ file: Math.min(Math.max(position.file + step, 0), files.length - 1), hunk: undefined });
    }

    function onKeyDown(event: KeyboardEvent): void {
        if ((event.key !== "ArrowUp" && event.key !== "ArrowDown" && event.key !== " ") || event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }
        const target = event.target;
        if (target instanceof HTMLElement && target.closest('input, textarea, select, [role="menu"], [role="dialog"], [role="listbox"]') !== null) {
            return;
        }
        if (event.key === " ") {
            if (target instanceof HTMLElement && target.closest("button, a") !== null) {
                return;
            }
            event.preventDefault();
            const staging = stagings[position.file];
            setStaging(position.file, position.hunk === undefined ? withFileToggled(staging, hunkCounts[position.file]) : withHunkToggled(staging, position.hunk));
            return;
        }
        event.preventDefault();
        const step = event.key === "ArrowUp" ? -1 : 1;
        if (event.shiftKey) {
            moveFile(step);
        }
        else {
            move(changeAfterMove(hunkCounts, position, step));
        }
    }

    return (
        <div ref={explorerRef} role="application" aria-label="Diff explorer" tabIndex={0} onKeyDown={onKeyDown} className="flex flex-col rounded-(--radius-lg) outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--color-focus)]" style={{ gap: "var(--space-3)" }}>
            <Paper
                variant="outlined"
                className="flex flex-wrap items-center"
                sx={{
                    position: "sticky",
                    top: "var(--space-2)",
                    zIndex: 2,
                    gap: "var(--space-1) var(--space-3)",
                    padding: "var(--space-2) var(--space-2) var(--space-2) var(--space-3)",
                    boxShadow: "var(--shadow-raised)",
                }}
            >
                <span aria-live="polite" className="flex-1" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    File {position.file + 1} of {files.length}
                    {hunkCounts[position.file] > 0 ? ` · ${position.hunk === undefined ? "no change picked" : `change ${position.hunk + 1} of ${hunkCounts[position.file]}`}` : " · no changes to step through"}
                </span>
                <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
                    <NavigationButton label="Previous change" keys="↑" icon={faAngleUp} onClick={() => move(changeAfterMove(hunkCounts, position, -1))} />
                    <NavigationButton label="Next change" keys="↓" icon={faAngleDown} onClick={() => move(changeAfterMove(hunkCounts, position, 1))} />
                    <NavigationButton label="Previous file" keys="Shift+↑" icon={faAnglesUp} onClick={() => moveFile(-1)} />
                    <NavigationButton label="Next file" keys="Shift+↓" icon={faAnglesDown} onClick={() => moveFile(1)} />
                </span>
                <span className="hidden items-center sm:flex" style={{ gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    <KeyCaps keys="↑" />
                    <KeyCaps keys="↓" />
                    change
                    <KeyCaps keys="Shift" />
                    file
                    <KeyCaps keys="Space" />
                    stage
                </span>
            </Paper>
            {files.map((file, index) => (
                <div key={file.path} data-diff-card>
                    <FileDiffCard
                        file={file}
                        isCurrent={index === position.file}
                        currentHunk={index === position.file ? position.hunk : undefined}
                        staging={stagings[index]}
                        onStagingChange={staging => setStaging(index, staging)}
                        answersKeys={false}
                        onSelectHunk={hunk => move({ file: index, hunk })}
                    />
                </div>
            ))}
        </div>
    );
}
