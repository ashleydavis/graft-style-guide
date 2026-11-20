//
// Formats the commit explorer's dates in the browser's own locale and local time zone, as Graft
// shows every date and time.
//

//
// The formatter of a commit's day, made once: building a formatter is far slower than using one,
// and every commit row formats its date each time the list draws.
//
const shortDateFormat = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
});

//
// The formatter of a date with its time, made once for the same reason.
//
const longDateFormat = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

//
// Formats a commit's day for its row, as in "14 Nov".
//
export function shortDate(date: Date): string {
    return shortDateFormat.format(date);
}

//
// Formats a date with its time for the details, as in "14 Nov 2026, 16:42".
//
export function longDate(date: Date): string {
    return longDateFormat.format(date);
}

//
// Writes `value` with at least two digits, as ISO 8601 writes each part of a date and time.
//
export function twoDigits(value: number): string {
    return String(value).padStart(2, "0");
}

//
// Formats a date as ISO 8601 in local time, to the second and with the local offset from UTC, as in
// "2026-11-15T02:42:10+10:00", for the tooltip field that copies it.
//
export function localIsoDate(date: Date): string {
    const offsetMinutes = -date.getTimezoneOffset();
    let sign = "+";
    if (offsetMinutes < 0) {
        sign = "-";
    }
    const offset = `${sign}${twoDigits(Math.floor(Math.abs(offsetMinutes) / 60))}:${twoDigits(Math.abs(offsetMinutes) % 60)}`;
    const day = `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
    const time = `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`;
    return `${day}T${time}${offset}`;
}
