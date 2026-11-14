//
// The changes area: the working tree's changed files beside the selected file's diff, with the
// commit box below the files. Staging happens here, a file or a hunk at a time, and the commit
// box commits what is staged.
//

import { useState, type KeyboardEvent, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListSubheader from "@mui/material/ListSubheader";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faFileLines, faLayerGroup, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FilePathMenu } from "../../../components/file-path-menu";
import { MaximiseButton } from "../../../components/maximise-button";
import { KeyCaps } from "../../../components/shortcut";
import { Tip } from "../../../components/tip";
import { FilePath } from "../../commit-explorer/components/file-path";
import { LineCounts } from "../../commit-explorer/components/line-counts";
import { Pane } from "../../commit-explorer/components/pane";
import { countLines, FileDiffCard, type IFileDiff } from "../../diff/components/file-diff-card";
import { parseHunks, withoutHunks } from "../../diff/model";
import { initialStaging, isFileStaged, withFileToggled, withHunkToggled, type IStaging } from "../../diff/staging";
import { StatusLetter } from "../../tree";
import { withViewTransition } from "../../../lib/view-transition";

//
// The message of the last commit, which ticking "Amend the last commit" brings into an empty
// message box.
//
const lastCommit = {
    summary: "Show the Git commands each page runs",
    description: "The help panel in the right sidebar lists the commands, each with a button that copies it.",
};

//
// The keys the area answers to, with what each does, for the hints along its foot.
//
const keyHints = [
    { keys: ["↑", "↓"], action: "File to file, or change to change in the diff" },
    { keys: ["←", "→"], action: "Files or diff" },
    { keys: ["Space"], action: "Stage or unstage" },
    { keys: ["Shift", "↑", "↓"], action: "File to file from the diff" },
    { keys: ["M"], action: "Maximise or restore" },
];

//
// Which list a row of the file list sits in: the one list of one diff, or the Staged or Unstaged
// list of the split.
//
export type ListSection = "all" | "staged" | "unstaged";

//
// One row of the file list: a file and the list it sits in.
//
export interface IListEntry {
    //
    // The changed file.
    //
    file: IFileDiff;

    //
    // The list the row sits in.
    //
    section: ListSection;
}

//
// Returns how much of a file is staged: all of it, some of its hunks, or none.
//
export function stagedState(staging: IStaging, hunkCount: number): "all" | "some" | "none" {
    if (isFileStaged(staging, hunkCount)) {
        return "all";
    }
    return staging.hunks.size > 0 ? "some" : "none";
}

//
// Renders a file's change in two sections, its staged hunks above its unstaged ones, each the
// Diff page's diff card showing only its own hunks. The staged section's buttons unstage and the
// unstaged section's buttons stage; both change the one staging the file has. A section with no
// hunks says so.
//
export function SplitDiff({
    file,
    staging,
    onStagingChange,
    isCurrent,
    currentHunk,
    onSelectHunk,
}: {
    file: IFileDiff;
    staging: IStaging;
    onStagingChange: (staging: IStaging) => void;
    isCurrent: boolean;
    currentHunk: number | undefined;
    onSelectHunk: (hunkIndex: number) => void;
}): ReactNode {
    const all = Array.from({ length: parseHunks(file.diff ?? "").length }, (_unused, index) => index);
    const sections: { title: string; hunks: number[]; action: "stage" | "unstage"; empty: string }[] = [
        { title: "Staged", hunks: all.filter(index => staging.hunks.has(index)), action: "unstage", empty: "Nothing in this file is staged." },
        { title: "Unstaged", hunks: all.filter(index => !staging.hunks.has(index)), action: "stage", empty: "Everything in this file is staged." },
    ];
    return (
        <div className="flex min-h-0 flex-1 flex-col" style={{ gap: "var(--space-2)" }}>
            {sections.map(section => (
                <section key={section.title} aria-label={`${section.title} changes`} className="flex min-h-0 flex-1 flex-col" style={{ gap: "var(--space-1)" }}>
                    <h3 style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
                        {section.title} ({section.hunks.length} {section.hunks.length === 1 ? "change" : "changes"})
                    </h3>
                    {section.hunks.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center" style={{ padding: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                            {section.empty}
                        </div>
                    ) : (
                        <div className="min-h-0 flex-1">
                            <FileDiffCard
                                key={file.path + section.title}
                                file={file}
                                label={`${section.title} diff`}
                                onlyHunks={section.hunks}
                                fileAction={section.action}
                                isCurrent={isCurrent && currentHunk !== undefined && section.hunks.includes(currentHunk)}
                                currentHunk={currentHunk}
                                staging={staging}
                                onStagingChange={onStagingChange}
                                answersKeys={false}
                                onSelectHunk={onSelectHunk}
                                initialWrap
                                fillHeight
                            />
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
}

//
// Returns true when a key pressed with the focus on `target` belongs to the target itself: a text
// box, an open menu, a resize handle, or Space and Enter on a button, checkbox or link.
//
function isOwnKeyTarget(target: EventTarget, key: string): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (target.closest('input[type="text"], textarea, select, [role="menu"], [role="dialog"], [role="listbox"]') !== null) {
        return true;
    }
    return (key === " " || key === "Enter") && target.closest('button, a, input[type="checkbox"]') !== null;
}

//
// Renders the area in a window frame. The files pane lists every changed file with a checkbox
// that stages or unstages the whole file, ticked when all of it is staged and half-ticked when
// some hunks are, and a count of the files and how many are staged. The selected file's diff
// shows to its right in the Diff page's diff card, with Stage and Unstage buttons for the file and
// each hunk; the checkboxes and the buttons share one staging. Under the files the commit box
// takes a summary and a description, with "Amend" and "No verify" checkboxes and
// the Commit button, which needs a summary and something staged, or the amend box ticked. A
// commit takes the staged files and hunks out of the list and says what it committed. The keys
// work while the focus is in the area outside a text box: in the files, Up and Down move from file
// to file and open each one's diff, Space stages or unstages the file and Right moves into the
// diff; in the diff, Up and Down step from change to change, Space stages or unstages the change,
// Shift with Up or Down moves from file to file and Left or Escape goes back to the files.
//
export function ChangesArea({ startFiles }: { startFiles: IFileDiff[] }): ReactNode {
    const [files, setFiles] = useState(startFiles);
    const [stagings, setStagings] = useState<ReadonlyMap<string, IStaging>>(() => new Map(startFiles.map(file => [file.path, initialStaging(file.stagedHunks)])));
    const [selectedPath, setSelectedPath] = useState<string | undefined>(startFiles[0]?.path);
    const [selectedSection, setSelectedSection] = useState<ListSection>("all");
    const [activePane, setActivePane] = useState<0 | 1>(0);
    const [currentHunk, setCurrentHunk] = useState<number | undefined>(undefined);
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [amend, setAmend] = useState(false);
    const [skipHooks, setSkipHooks] = useState(false);
    const [committed, setCommitted] = useState<string | undefined>(undefined);
    const [diffMode, setDiffMode] = useState<"one" | "split">("one");
    const [maximised, setMaximised] = useState<0 | 1 | undefined>(undefined);
    const [fileSearch, setFileSearch] = useState("");
    const shownFiles = files.filter(file => `${file.oldPath ?? ""} ${file.path}`.toLowerCase().includes(fileSearch.trim().toLowerCase()));
    const selectedFile = files.find(file => file.path === selectedPath);
    const hunkCountOf = (file: IFileDiff): number => parseHunks(file.diff ?? "").length;
    const stagingOf = (file: IFileDiff): IStaging => stagings.get(file.path) ?? initialStaging(undefined);
    const stagedFiles = files.filter(file => stagedState(stagingOf(file), hunkCountOf(file)) !== "none");
    const canCommit = summary.trim() !== "" && (stagedFiles.length > 0 || amend);

    function setStaging(path: string, staging: IStaging): void {
        setStagings(current => new Map(current).set(path, staging));
    }

    function toggleFile(file: IFileDiff): void {
        setStaging(file.path, withFileToggled(stagingOf(file), hunkCountOf(file)));
    }

    //
    // The rows of the file list: every shown file once in one diff, and in the split each staged
    // file under Staged and each unstaged file under Unstaged, so a file staged in part shows in
    // both.
    //
    const entries: IListEntry[] =
        diffMode === "one"
            ? shownFiles.map(file => ({ file, section: "all" }))
            : [
                  ...shownFiles.filter(file => stagedState(stagingOf(file), hunkCountOf(file)) !== "none").map(file => ({ file, section: "staged" as const })),
                  ...shownFiles.filter(file => stagedState(stagingOf(file), hunkCountOf(file)) !== "all").map(file => ({ file, section: "unstaged" as const })),
              ];
    const selectedEntry = entries.find(entry => entry.file.path === selectedPath && entry.section === selectedSection) ?? entries.find(entry => entry.file.path === selectedPath);

    function selectFile(path: string, section: ListSection, pane: 0 | 1): void {
        if (path !== selectedPath) {
            setCurrentHunk(undefined);
        }
        setSelectedPath(path);
        setSelectedSection(section);
        setActivePane(pane);
    }

    function moveFile(step: number, pane: 0 | 1): void {
        const index = selectedEntry ? entries.indexOf(selectedEntry) : -1;
        const next = entries[Math.min(Math.max(index + step, 0), entries.length - 1)];
        if (next) {
            selectFile(next.file.path, next.section, pane);
        }
    }

    //
    // Returns the hunks a row leaves out of its line counts: the unstaged hunks for a row under
    // Staged, the staged hunks for a row under Unstaged, and none in one diff.
    //
    function sectionHunksOf(file: IFileDiff, section: ListSection): ReadonlySet<number> | undefined {
        if (section === "all") {
            return undefined;
        }
        const staged = stagingOf(file).hunks;
        if (section === "unstaged") {
            return staged;
        }
        return new Set(Array.from({ length: hunkCountOf(file) }, (_unused, index) => index).filter(index => !staged.has(index)));
    }

    //
    // Stages or unstages a whole file from its row: a row under Staged unstages all of it, a row
    // under Unstaged stages all of it, and a row in one diff flips it.
    //
    function toggleEntry(entry: IListEntry): void {
        if (entry.section === "staged") {
            setStaging(entry.file.path, { hunks: new Set(), isWholeFile: false });
        }
        else if (entry.section === "unstaged") {
            setStaging(entry.file.path, withFileToggled({ hunks: new Set(), isWholeFile: false }, hunkCountOf(entry.file)));
        }
        else {
            toggleFile(entry.file);
        }
    }

    //
    // Returns the selected file's hunks in the order Up and Down step through them: the file's own
    // order in one diff, and its staged hunks before its unstaged ones in the split.
    //
    function hunkOrder(): number[] {
        if (!selectedFile) {
            return [];
        }
        const all = Array.from({ length: hunkCountOf(selectedFile) }, (_unused, index) => index);
        if (diffMode === "one") {
            return all;
        }
        const staged = stagingOf(selectedFile).hunks;
        return [...all.filter(index => staged.has(index)), ...all.filter(index => !staged.has(index))];
    }

    function moveHunk(step: number): void {
        const order = hunkOrder();
        if (order.length === 0) {
            return;
        }
        const position = currentHunk === undefined ? -1 : order.indexOf(currentHunk);
        const next = position < 0 ? (step > 0 ? 0 : order.length - 1) : Math.min(Math.max(position + step, 0), order.length - 1);
        setCurrentHunk(order[next]);
    }

    function toggleMaximise(pane: 0 | 1): void {
        withViewTransition(() => setMaximised(maximised === pane ? undefined : pane));
    }

    function onAmend(isTicked: boolean): void {
        setAmend(isTicked);
        if (isTicked && summary.trim() === "") {
            setSummary(lastCommit.summary);
            setDescription(lastCommit.description);
        }
    }

    function commit(): void {
        const count = stagedFiles.length;
        const left: IFileDiff[] = [];
        for (const file of files) {
            const staging = stagingOf(file);
            const state = stagedState(staging, hunkCountOf(file));
            if (state === "some" && file.diff !== undefined) {
                left.push({ ...file, diff: withoutHunks(file.diff, staging.hunks), stagedHunks: undefined });
            }
            else if (state === "none") {
                left.push(file);
            }
        }
        setFiles(left);
        setStagings(new Map(left.map(file => [file.path, initialStaging(undefined)])));
        setSelectedPath(left.find(file => file.path === selectedPath)?.path ?? left[0]?.path);
        setCurrentHunk(undefined);
        setActivePane(0);
        setCommitted(amend ? `Amended the last commit: ${summary.trim()}` : `Committed ${count} ${count === 1 ? "file" : "files"}: ${summary.trim()}`);
        setSummary("");
        setDescription("");
        setAmend(false);
        setSkipHooks(false);
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (event.ctrlKey || event.altKey || event.metaKey || isOwnKeyTarget(event.target, event.key)) {
            return;
        }
        const key = event.key;
        if (key === "m" || key === "M") {
            event.preventDefault();
            toggleMaximise(activePane);
            return;
        }
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape", " "].includes(key)) {
            return;
        }
        event.preventDefault();
        if (activePane === 0) {
            if (key === "ArrowUp" || key === "ArrowDown") {
                moveFile(key === "ArrowUp" ? -1 : 1, 0);
            }
            else if (key === " " && selectedEntry) {
                toggleEntry(selectedEntry);
            }
            else if (key === "ArrowRight" && selectedFile) {
                setActivePane(1);
            }
            return;
        }
        if (key === "ArrowUp" || key === "ArrowDown") {
            const step = key === "ArrowUp" ? -1 : 1;
            if (event.shiftKey) {
                moveFile(step, 1);
            }
            else {
                moveHunk(step);
            }
        }
        else if (key === " " && selectedFile) {
            setStaging(selectedFile.path, currentHunk === undefined ? withFileToggled(stagingOf(selectedFile), hunkCountOf(selectedFile)) : withHunkToggled(stagingOf(selectedFile), currentHunk));
        }
        else if (key === "ArrowLeft" || key === "Escape") {
            setActivePane(0);
        }
    }

    return (
        <div
            role="application"
            aria-label="Changes"
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={`flex flex-col ${diffMode === "split" ? "lg:h-[900px]" : "lg:h-[680px]"} shadow-(--shadow-raised) focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--color-focus),var(--shadow-raised)]`}
            style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                outline: "none",
            }}
        >
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row" style={{ gap: "var(--space-3)", padding: "var(--space-3)" }}>
                <div className={maximised === 1 ? "hidden" : maximised === 0 ? "flex min-h-0 flex-1 flex-col" : "flex min-h-0 flex-col lg:w-[400px] lg:flex-none"} style={{ gap: "var(--space-3)" }}>
                    <div className="flex min-h-0 flex-1 flex-col" style={{ maxHeight: "100%" }} onPointerDown={() => setActivePane(0)}>
                        <Pane
                            label="Changed files"
                            width="100%"
                            isActive={activePane === 0}
                            isMaximised={maximised === 0}
                            onToggleMaximise={() => toggleMaximise(0)}
                            toolbar={
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Search changed files"
                                    value={fileSearch}
                                    onChange={event => setFileSearch(event.target.value)}
                                    slotProps={{
                                        htmlInput: {
                                            "aria-label": "Search changed files",
                                        },
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: "var(--icon-md)" }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: fileSearch.trim() !== "" ? (
                                                <InputAdornment position="end" sx={{ gap: "var(--space-2)" }}>
                                                    <span aria-live="polite" style={{ fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>
                                                        {shownFiles.length} of {files.length}
                                                    </span>
                                                    <Tooltip title="Clear the search">
                                                        <IconButton size="small" aria-label="Clear search" onClick={() => setFileSearch("")} edge="end">
                                                            <FontAwesomeIcon icon={faXmark} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </InputAdornment>
                                            ) : undefined,
                                        },
                                    }}
                                />
                            }
                            title={
                                <span className="flex items-baseline" style={{ gap: "var(--space-2)" }}>
                                    Changes
                                    <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-normal)", color: "var(--color-text-muted)" }}>
                                        {files.length} {files.length === 1 ? "file" : "files"}, {stagedFiles.length} staged
                                    </span>
                                </span>
                            }
                        >
                            {files.length === 0 ? (
                                <p className="flex items-center justify-center" style={{ gap: "var(--space-2)", padding: "var(--space-8) var(--space-4)", color: "var(--color-text-muted)" }}>
                                    <FontAwesomeIcon icon={faCheck} style={{ color: "var(--color-success)" }} />
                                    No changes. The working tree matches the last commit.
                                </p>
                            ) : (
                                <List aria-label="Changed files" sx={{ padding: "var(--space-1)" }}>
                                    {shownFiles.length === 0 ? (
                                        <li style={{ padding: "var(--space-4) var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textAlign: "center" }}>
                                            No changed file matches the search.
                                        </li>
                                    ) : undefined}
                                    {entries.map((entry, index) => {
                                        const { file, section } = entry;
                                        const state = stagedState(stagingOf(file), hunkCountOf(file));
                                        const sectionHunks = sectionHunksOf(file, section);
                                        const counts = countLines(sectionHunks === undefined || file.diff === undefined ? file.diff : withoutHunks(file.diff, sectionHunks));
                                        const heading = section !== "all" && entries[index - 1]?.section !== section;
                                        const isChecked = section === "staged" ? true : section === "unstaged" ? false : state === "all";
                                        const isPartial = section === "all" && state === "some";
                                        return [
                                            heading ? (
                                                <ListSubheader key={`${section}-heading`} component="li">
                                                    {section === "staged" ? "Staged" : "Unstaged"} ({entries.filter(other => other.section === section).length})
                                                </ListSubheader>
                                            ) : undefined,
                                            <ListItemButton
                                                key={`${section}:${file.path}`}
                                                component="li"
                                                aria-label={section === "all" ? file.path : `${section === "staged" ? "Staged" : "Unstaged"} ${file.path}`}
                                                selected={entry === selectedEntry}
                                                onClick={() => selectFile(file.path, section, 0)}
                                                sx={{
                                                    gap: "var(--space-2)",
                                                    fontSize: "var(--text-sm)",
                                                    paddingLeft: "var(--space-1)",
                                                    "& .file-path-menu": { opacity: 0 },
                                                    "&:hover .file-path-menu, &.Mui-selected .file-path-menu, &:focus-within .file-path-menu": { opacity: 1 },
                                                }}
                                            >
                                                <Tooltip title={<Tip title={isChecked ? "Unstage the file" : "Stage the file"} detail={state === "some" ? "Some of its changes are staged and some are not." : undefined} />}>
                                                    <Checkbox
                                                        size="small"
                                                        checked={isChecked}
                                                        indeterminate={isPartial}
                                                        onClick={event => event.stopPropagation()}
                                                        onChange={() => toggleEntry(entry)}
                                                        slotProps={{ input: { "aria-label": `Stage ${file.path}` } }}
                                                    />
                                                </Tooltip>
                                                <span className="min-w-0 flex-1">
                                                    <FilePath path={file.path} />
                                                </span>
                                                <FilePathMenu path={file.path} />
                                                <StatusLetter status={file.status} />
                                                {file.diff !== undefined ? <LineCounts added={counts.added} deleted={counts.deleted} /> : undefined}
                                            </ListItemButton>,
                                        ];
                                    })}
                                </List>
                            )}
                        </Pane>
                    </div>

                    <section
                        aria-label="Commit"
                        className="flex flex-none flex-col"
                        style={{
                            gap: "var(--space-2)",
                            padding: "var(--space-3)",
                            background: "var(--color-panel)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-lg)",
                            boxShadow: "var(--shadow-raised)",
                        }}
                    >
                        {committed ? (
                            <Alert severity="success" onClose={() => setCommitted(undefined)}>
                                {committed}
                            </Alert>
                        ) : undefined}
                        <TextField
                            size="small"
                            fullWidth
                            label="Summary"
                            value={summary}
                            onChange={event => setSummary(event.target.value)}
                        />
                        <TextField size="small" fullWidth multiline minRows={2} maxRows={6} label="Description" value={description} onChange={event => setDescription(event.target.value)} />
                        <div className="flex flex-wrap items-center" style={{ gap: "0 var(--space-3)" }}>
                            <Tooltip title={<Tip title="Amend the last commit" detail="Replaces the last commit with one that also holds what is staged, using this message." />}>
                                <FormControlLabel label="Amend" control={<Checkbox size="small" checked={amend} onChange={event => onAmend(event.target.checked)} />} />
                            </Tooltip>
                            <Tooltip title={<Tip title="No verify (--no-verify)" detail="Commits without running the repository's pre-commit and commit-msg hooks." />}>
                                <FormControlLabel label="No verify" control={<Checkbox size="small" checked={skipHooks} onChange={event => setSkipHooks(event.target.checked)} />} />
                            </Tooltip>
                        </div>
                        <Tooltip
                            title={
                                canCommit ? (
                                    <Tip title={amend ? "Amend the last commit" : "Commit the staged changes"} detail={skipHooks ? "With --no-verify, so no hooks run." : undefined} />
                                ) : (
                                    <Tip title="Nothing to commit yet" detail="Write a summary and stage a change, or tick Amend." />
                                )
                            }
                        >
                            <span>
                                <Button variant="contained" fullWidth disabled={!canCommit} onClick={commit}>
                                    {amend ? "Amend commit" : `Commit ${stagedFiles.length} ${stagedFiles.length === 1 ? "file" : "files"}`}
                                </Button>
                            </span>
                        </Tooltip>
                    </section>
                </div>

                <div className={maximised === 0 ? "hidden" : "flex min-h-[420px] min-w-0 flex-1 flex-col lg:min-h-0"} style={{ gap: "var(--space-2)" }} onPointerDown={() => setActivePane(1)}>
                    <div className="flex flex-none flex-wrap items-center" style={{ gap: "var(--space-2)" }}>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={diffMode}
                            onChange={(_event, value: "one" | "split" | null) => {
                                if (value) {
                                    setDiffMode(value);
                                }
                            }}
                            aria-label="Diff shows"
                            sx={{ "& .MuiToggleButton-root": { padding: "var(--space-1) var(--space-2)", fontSize: "var(--icon-sm)" } }}
                        >
                            <Tooltip title={<Tip title="One diff" detail="The file's whole change, staged and unstaged together." />}>
                                <ToggleButton value="one" aria-label="One diff">
                                    <FontAwesomeIcon icon={faFileLines} />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip title={<Tip title="Staged and unstaged" detail="The staged changes and the unstaged changes in separate sections, staged above." />}>
                                <ToggleButton value="split" aria-label="Staged and unstaged">
                                    <FontAwesomeIcon icon={faLayerGroup} />
                                </ToggleButton>
                            </Tooltip>
                        </ToggleButtonGroup>
                        <span className="flex-1" />
                        <MaximiseButton isMaximised={maximised === 1} onClick={() => toggleMaximise(1)} />
                    </div>
                    {selectedFile ? (
                        diffMode === "split" && hunkCountOf(selectedFile) > 0 ? (
                            <SplitDiff
                                file={selectedFile}
                                staging={stagingOf(selectedFile)}
                                onStagingChange={staging => setStaging(selectedFile.path, staging)}
                                isCurrent={activePane === 1}
                                currentHunk={currentHunk}
                                onSelectHunk={hunk => {
                                    setCurrentHunk(hunk);
                                    setActivePane(1);
                                }}
                            />
                        ) : (
                            <div className="min-h-0 flex-1">
                                <FileDiffCard
                                    key={selectedFile.path + (selectedFile.diff ?? "")}
                                    file={selectedFile}
                                    label="File diff"
                                    isCurrent={activePane === 1}
                                    currentHunk={currentHunk}
                                    staging={stagingOf(selectedFile)}
                                    onStagingChange={staging => setStaging(selectedFile.path, staging)}
                                    answersKeys={false}
                                    onSelectHunk={hunk => {
                                        setCurrentHunk(hunk);
                                        setActivePane(1);
                                    }}
                                    initialWrap
                                    fillHeight
                                />
                            </div>
                        )
                    ) : (
                        <div className="flex flex-1 items-center justify-center" style={{ color: "var(--color-text-muted)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                            Select a file to see its diff.
                        </div>
                    )}
                </div>
            </div>

            <div
                aria-label="Keys"
                className="flex flex-none flex-wrap items-center"
                style={{
                    gap: "var(--space-1) var(--space-4)",
                    padding: "var(--space-2) var(--space-4)",
                    background: "var(--color-panel)",
                    borderTop: "1px solid var(--color-border)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-muted)",
                }}
            >
                {keyHints.map(hint => (
                    <span key={hint.action} className="inline-flex items-center" style={{ gap: "var(--space-2)" }}>
                        <span className="inline-flex" style={{ gap: "var(--space-1)" }}>
                            {hint.keys.map(key => (
                                <KeyCaps key={key} keys={key} />
                            ))}
                        </span>
                        {hint.action}
                    </span>
                ))}
            </div>
        </div>
    );
}
