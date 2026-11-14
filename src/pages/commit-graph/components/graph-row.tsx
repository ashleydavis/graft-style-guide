//
// One row of a commit list with its graph lanes: the lanes passing through, the commit's dot on
// its own lane and the curves where a branch leaves or joins that lane.
//

import type { ReactNode } from "react";

//
// The space between two lanes, in pixels.
//
const LANE_GAP = 12;

//
// Where the first lane sits from the left edge of the graph, in pixels.
//
const FIRST_LANE_X = 7;

//
// The lanes of one commit's row: the commit's own lane and how it joins the rows above and
// below, and the other lanes that pass through, end or start at the row.
//
export interface ILaneShape {
    //
    // The lane the commit sits on, from 1.
    //
    lane: number;

    //
    // True when the commit's lane continues up to the row above.
    //
    joinsAbove: boolean;

    //
    // True when the commit's lane continues down to the row below.
    //
    joinsBelow: boolean;

    //
    // Other lanes that pass straight through this row.
    //
    through: number[];

    //
    // Lanes that come down from the row above and end at this commit, as a branch does at the
    // commit it started from.
    //
    endsHere: number[];

    //
    // Lanes that start at this commit and go down to the row below, as the second parent of a
    // merge commit does.
    //
    startsHere: number[];

    //
    // Lanes of branches not merged yet, such as an open pull request, whose lines through this row
    // and curves into the commit are dotted. Absent when every lane here is merged.
    //
    dottedLanes?: number[];

    //
    // True when the commit's lane above its dot belongs to a branch not merged yet, so that half
    // is dotted.
    //
    dottedAbove?: boolean;

    //
    // True when the commit itself is on a branch not merged yet, so its lane below its dot and any
    // curve out of it are dotted.
    //
    dottedBelow?: boolean;
}

//
// One commit and the lanes drawn beside it.
//
export interface IGraphRow extends ILaneShape {
    //
    // The commit message.
    //
    message: string;

    //
    // The short hash.
    //
    hash: string;
}

//
// Returns the x position of `lane` in the graph.
//
export function laneX(lane: number): number {
    return FIRST_LANE_X + (lane - 1) * LANE_GAP;
}

//
// Returns the width of a graph with `laneCount` lanes.
//
export function graphWidth(laneCount: number): number {
    return laneX(laneCount) + FIRST_LANE_X;
}

//
// Returns the colour token of `lane`. Lanes after the sixth reuse the six lane colours in order.
//
export function laneColour(lane: number): string {
    return `var(--color-lane-${((lane - 1) % 6) + 1})`;
}

//
// Returns the stroke settings of a lane line: solid, or dotted for a branch not merged yet, as a
// row of round dots.
//
export function lineStyle(isDotted: boolean): { strokeDasharray?: string; strokeLinecap?: "round" } {
    return isDotted ? { strokeDasharray: "0.01 5", strokeLinecap: "round" } : {};
}

//
// Renders the lanes of one row, stretched to the row's full height. The graph is drawn on a
// 100-unit-high canvas stretched to the row's height, so every line meets the lines of the rows
// above and below whatever height the row has. Lines keep their width as the canvas stretches.
// The commit's dot sits in the middle of the row, with a ring in `ringColour`, the row's
// background, laid over the panel colour so a see-through background still hides the lines
// under the ring, so the dot stands clear of them.
//
export function GraphLanes({ shape, laneCount, ringColour = "var(--color-panel)" }: { shape: ILaneShape; laneCount: number; ringColour?: string }): ReactNode {
    const width = graphWidth(laneCount);
    const commitX = laneX(shape.lane);

    function isDotted(lane: number): boolean {
        return shape.dottedLanes?.includes(lane) === true;
    }

    return (
        <div
            aria-hidden="true"
            className="relative shrink-0 self-stretch"
            style={{
                width: `${width}px`,
            }}
        >
            <svg
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${width} 100`}
                preserveAspectRatio="none"
            >
                {shape.through.map(lane => (
                    <line
                        key={`through-${lane}`}
                        data-lane={lane}
                        data-dotted={isDotted(lane)}
                        x1={laneX(lane)}
                        y1="0"
                        x2={laneX(lane)}
                        y2="100"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        {...lineStyle(isDotted(lane))}
                        style={{
                            stroke: laneColour(lane),
                        }}
                    />
                ))}
                {shape.joinsAbove ? (
                    <line
                        data-lane={shape.lane}
                        data-dotted={shape.dottedAbove === true}
                        x1={commitX}
                        y1="0"
                        x2={commitX}
                        y2="50"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        {...lineStyle(shape.dottedAbove === true)}
                        style={{
                            stroke: laneColour(shape.lane),
                        }}
                    />
                ) : undefined}
                {shape.joinsBelow ? (
                    <line
                        data-lane={shape.lane}
                        data-dotted={shape.dottedBelow === true}
                        x1={commitX}
                        y1="50"
                        x2={commitX}
                        y2="100"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        {...lineStyle(shape.dottedBelow === true)}
                        style={{
                            stroke: laneColour(shape.lane),
                        }}
                    />
                ) : undefined}
                {shape.endsHere.map(lane => (
                    <path
                        key={`ends-${lane}`}
                        data-dotted={isDotted(lane)}
                        d={`M ${laneX(lane)} 0 C ${laneX(lane)} 35, ${commitX} 20, ${commitX} 50`}
                        fill="none"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        {...lineStyle(isDotted(lane))}
                        style={{
                            stroke: laneColour(lane),
                        }}
                    />
                ))}
                {shape.startsHere.map(lane => (
                    <path
                        key={`starts-${lane}`}
                        data-dotted={shape.dottedBelow === true}
                        d={`M ${commitX} 50 C ${commitX} 80, ${laneX(lane)} 65, ${laneX(lane)} 100`}
                        fill="none"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        {...lineStyle(shape.dottedBelow === true)}
                        style={{
                            stroke: laneColour(lane),
                        }}
                    />
                ))}
            </svg>
            <div
                className="absolute"
                style={{
                    left: `${commitX - 5}px`,
                    top: "calc(50% - 5px)",
                    width: "10px",
                    height: "10px",
                    borderRadius: "var(--radius-full)",
                    background: laneColour(shape.lane),
                    boxShadow: `0 0 0 2px ${ringColour}, 0 0 0 2px var(--color-panel)`,
                }}
            />
        </div>
    );
}

//
// Renders the row: the lanes, then the commit message and short hash.
//
export function GraphRow({ row, laneCount }: { row: IGraphRow; laneCount: number }): ReactNode {
    return (
        <div
            className="flex"
            style={{
                gap: "var(--space-2)",
                padding: "0 var(--space-3)",
            }}
        >
            <GraphLanes shape={row} laneCount={laneCount} />
            <div
                className="flex min-w-0 flex-1 items-center"
                style={{
                    gap: "var(--space-2)",
                    padding: "var(--space-1) 0",
                }}
            >
                <span className="flex-1 truncate">{row.message}</span>
                <span
                    style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-sm)",
                        color: "var(--color-text-muted)",
                    }}
                >
                    {row.hash}
                </span>
            </div>
        </div>
    );
}
