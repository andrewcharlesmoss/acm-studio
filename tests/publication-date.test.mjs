import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const datesUrl = new URL("../app/studio/publication-date.ts", import.meta.url);
const dates = await loadProductionModule(datesUrl);
const inspectorSource = readStudioSource("app/studio/blocks/inspectors/document-inspector.tsx");
const inspectorTree = ts.createSourceFile("inspector.tsx", inspectorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const dateHandlers = new Map();
function collectDateHandlers(node) {
  if (ts.isFunctionDeclaration(node) && ["updatePublicationDate", "updateDateParts", "moveCalendarMonth"].includes(node.name?.text)) {
    dateHandlers.set(node.name.text, node.getText(inspectorTree));
  }
  ts.forEachChild(node, collectDateHandlers);
}
collectDateHandlers(inspectorTree);
assert.equal(dateHandlers.size, 3);
const compiledDateHandlers = ts.transpileModule([...dateHandlers.values()].join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

const timezones = ["UTC", "Europe/London", "America/New_York", "Asia/Kolkata", "Asia/Kathmandu", "America/St_Johns", "Pacific/Kiritimati", "Pacific/Pago_Pago"];
const displayCases = [
  ["2026-10-04T12:00:00Z", "4 Oct 2026, 12:00", "October 2026"],
  ["2026-12-04T12:00:00Z", "4 Dec 2026, 12:00", "December 2026"],
  ["2026-07-04T12:00:00Z", "4 Jul 2026, 12:00", "July 2026"],
  ["2026-03-29T00:30:00Z", "29 Mar 2026, 00:30", "March 2026"],
  ["2026-03-29T01:30:00Z", "29 Mar 2026, 01:30", "March 2026"],
  ["2026-10-25T00:30:00Z", "25 Oct 2026, 00:30", "October 2026"],
  ["2026-10-25T01:30:00Z", "25 Oct 2026, 01:30", "October 2026"],
  ["2026-01-01T00:15:00Z", "1 Jan 2026, 00:15", "January 2026"],
  ["2026-12-31T23:45:00Z", "31 Dec 2026, 23:45", "December 2026"],
];
const parsingCases = [
  ["2026-10-04T12:34", "2026-10-04T12:34:00.000Z"],
  ["2026-10-04T12:34:56", "2026-10-04T12:34:56.000Z"],
  ["2026-10-04T12:34:56.789", "2026-10-04T12:34:56.789Z"],
  ["2026-10-04T12:34:56Z", "2026-10-04T12:34:56.000Z"],
  ["2026-10-04T12:34:56+05:30", "2026-10-04T07:04:56.000Z"],
  ["2026-10-04T12:34:56-03:30", "2026-10-04T16:04:56.000Z"],
  ["2026-01-01T00:15:00+05:30", "2025-12-31T18:45:00.000Z"],
  ["2026-12-31T23:30:00-03:30", "2027-01-01T03:00:00.000Z"],
];
const editCases = [
  ["2026-07-04T12:00:00Z", { month: 11 }, "2026-12-04T12:00:00.000Z"],
  ["2026-12-04T12:00:00Z", { month: 6 }, "2026-07-04T12:00:00.000Z"],
  ["2026-10-04T12:00:00Z", { hours: 18, minutes: 45 }, "2026-10-04T18:45:00.000Z"],
  ["2026-12-04T12:00:00Z", { hours: 9, minutes: 30 }, "2026-12-04T09:30:00.000Z"],
  ["2026-01-31T13:00:00Z", { month: 1 }, "2026-02-28T13:00:00.000Z"],
  ["2024-01-31T13:00:00Z", { month: 1 }, "2024-02-29T13:00:00.000Z"],
  ["2024-02-29T23:59:00Z", { year: 2025 }, "2025-02-28T23:59:00.000Z"],
  ["2026-01-31T13:00:00Z", { month: 3 }, "2026-04-30T13:00:00.000Z"],
  ["2026-04-15T13:00:00Z", { day: 31 }, "2026-04-30T13:00:00.000Z"],
  ["2026-03-29T00:30:00Z", { hours: 1 }, "2026-03-29T01:30:00.000Z"],
  ["2026-10-25T00:30:00Z", { hours: 1 }, "2026-10-25T01:30:00.000Z"],
  ["2026-12-31T23:59:00Z", { year: 2027, month: 0, day: 1 }, "2027-01-01T23:59:00.000Z"],
  ["2026-01-01T00:00:00Z", { year: 1 }, "0001-01-01T00:00:00.000Z"],
];

function inTimezone(timezone, body) {
  // Child processes isolate host timezones; the extracted handlers are production code.
  const script = `import * as dates from ${JSON.stringify(datesUrl.href)};
    const { makePublicationDate, formatPublicationTimezone } = dates;
    let siteContext = false;
    let publicationDateError = null;
    const setPublicationDateError = error => { publicationDateError = error; };
    ${compiledDateHandlers}
    ${body}`;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { encoding: "utf8", env: { ...process.env, TZ: timezone } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

for (const timezone of timezones) {
  test(`publication display remains UTC+0 across DST and date boundaries in ${timezone}`, () => {
    const result = inTimezone(timezone, `const inputs = ${JSON.stringify(displayCases.map(([instant]) => instant))};
      process.stdout.write(JSON.stringify(inputs.map(instant => {
        const date = dates.parsePublicationDate(instant);
        return { label: dates.formatPublicationTimezone(), iso: date.toISOString(),
          hours: date.getUTCHours(), minutes: date.getUTCMinutes(),
          display: dates.formatPublishDate(instant), month: dates.formatCalendarMonth(date) };
      })));`);
    assert.deepEqual(result, displayCases.map(([instant, display, month]) => ({
      label: "UTC+0", iso: new Date(instant).toISOString(),
      hours: new Date(instant).getUTCHours(), minutes: new Date(instant).getUTCMinutes(), display, month,
    })));
  });

  test(`publication parsing uses UTC for unzoned inputs and preserves explicit offsets in ${timezone}`, () => {
    const result = inTimezone(timezone, `const inputs = ${JSON.stringify(parsingCases.map(([input]) => input))};
      process.stdout.write(JSON.stringify(inputs.map(input => dates.parsePublicationDate(input).toISOString())));`);
    assert.deepEqual(result, parsingCases.map(([, expected]) => expected));
  });

  test(`production Publish date edits preserve UTC fields, month ends and leap days in ${timezone}`, () => {
    const result = inTimezone(timezone, `let selectedDate;
      const changes = [];
      const onChange = (field, value) => changes.push([field, value]);
      const inputs = ${JSON.stringify(editCases.map(([instant, parts]) => [instant, parts]))};
      process.stdout.write(JSON.stringify(inputs.map(([instant, parts]) => {
        selectedDate = dates.parsePublicationDate(instant);
        changes.length = 0;
        updateDateParts(parts);
        return { changes: [...changes], label: formatPublicationTimezone() };
      })));`);
    assert.deepEqual(result, editCases.map(([, , expected]) => ({ changes: [["publishAt", expected]], label: "UTC+0" })));
  });

  test(`site Publish date accepts backdates and now, rejects scheduling, and clears its error in ${timezone}`, () => {
    const result = inTimezone(timezone, `const RealDate = Date;
      const now = "2026-10-14T12:30:00.000Z";
      globalThis.Date = class extends RealDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return RealDate.parse(now); }
      };
      siteContext = true;
      const changes = [];
      const onChange = (field, value) => changes.push([field, value]);
      const inputs = ["2020-02-29T09:15:00.000Z", now, "2026-10-14T12:30:00.001Z", "2026-10-01T10:00:00.000Z"];
      process.stdout.write(JSON.stringify(inputs.map(instant => {
        changes.length = 0;
        updatePublicationDate(new Date(instant));
        return { changes: [...changes], error: publicationDateError };
      })));`);
    assert.deepEqual(result, [
      { changes: [["publishAt", "2020-02-29T09:15:00.000Z"]], error: null },
      { changes: [["publishAt", "2026-10-14T12:30:00.000Z"]], error: null },
      { changes: [], error: "Choose a past or current date. Automatic scheduling is unavailable for this local site." },
      { changes: [["publishAt", "2026-10-01T10:00:00.000Z"]], error: null },
    ]);
  });

  test(`production calendar retains UTC padding, leap rules and year rollover in ${timezone}`, () => {
    const result = inTimezone(timezone, `const months = [1900, 2000, 2024, 2025, 2100];
      const grids = months.map(year => {
        const first = dates.startOfMonth(dates.makePublicationDate(year, 1, 9, 23, 59));
        const cells = dates.getCalendarDays(first);
        return { first: first.toISOString(), month: dates.formatCalendarMonth(first),
          cells: cells.map(day => day?.toISOString() ?? null) };
      });
      let calendarMonth;
      const setCalendarMonth = update => { calendarMonth = update(calendarMonth); };
      const moves = [["2026-12-01T00:00:00Z", 1], ["2026-01-01T00:00:00Z", -1]].map(([instant, amount]) => {
        calendarMonth = new Date(instant);
        moveCalendarMonth(amount);
        return calendarMonth.toISOString();
      });
      process.stdout.write(JSON.stringify({ grids, moves,
        earlyYear: dates.makePublicationDate(1, 0, 1).toISOString(),
        sameUtcDay: dates.isSameCalendarDay(new Date("2026-01-01T00:15:00+05:30"), new Date("2025-12-31T23:59:00Z")),
        differentUtcDay: dates.isSameCalendarDay(new Date("2026-01-01T00:15:00Z"), new Date("2025-12-31T23:59:00Z")) }));`);
    for (const [index, [year, length]] of [[1900, 28], [2000, 29], [2024, 29], [2025, 28], [2100, 28]].entries()) {
      const grid = result.grids[index];
      const firstIso = `${year}-02-01T00:00:00.000Z`;
      const firstDayOffset = (new Date(firstIso).getUTCDay() + 6) % 7;
      assert.equal(grid.first, firstIso);
      assert.equal(grid.month, `February ${year}`);
      assert.equal(grid.cells.length, Math.ceil((firstDayOffset + length) / 7) * 7);
      assert.deepEqual(grid.cells.slice(0, firstDayOffset), Array(firstDayOffset).fill(null));
      assert.deepEqual(grid.cells.filter(Boolean), Array.from({ length }, (_, day) => `${year}-02-${String(day + 1).padStart(2, "0")}T00:00:00.000Z`));
      assert.deepEqual(grid.cells.slice(firstDayOffset + length), Array(grid.cells.length - firstDayOffset - length).fill(null));
    }
    assert.deepEqual(result.moves, ["2027-01-01T00:00:00.000Z", "2025-12-01T00:00:00.000Z"]);
    assert.equal(result.earlyYear, "0001-01-01T00:00:00.000Z");
    assert.equal(result.sameUtcDay, true);
    assert.equal(result.differentUtcDay, false);
  });
}

test("missing and invalid publication dates retain the immediate-publication fallback", () => {
  for (const value of [undefined, "", "invalid"]) assert.equal(dates.parsePublicationDate(value), null);
  for (const value of ["", "invalid"]) assert.equal(dates.formatPublishDate(value), "Immediately");
  assert.equal(dates.formatPublicationTimezone(), "UTC+0");
  assert.deepEqual(dates.MONTH_NAMES, ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  assert.deepEqual(dates.WEEKDAY_NAMES, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
});

test("Publish picker wires its inputs and calendar selection to UTC+0 production handlers", () => {
  assert.match(inspectorSource, /from "\.\.\/\.\.\/publication-date"/);
  assert.match(inspectorSource, /className="publish-timezone" title="Times are recorded in Coordinated Universal Time">\{formatPublicationTimezone\(\)\}/);
  for (const field of ["FullYear", "Month", "Date", "Hours", "Minutes"]) {
    assert.ok(inspectorSource.includes(`selectedDate.getUTC${field}()`), `selected date ${field} uses UTC`);
  }
  assert.match(inspectorSource, /updatePublicationDate\(makePublicationDate\(day\.getUTCFullYear\(\), day\.getUTCMonth\(\), day\.getUTCDate\(\), selectedDate\.getUTCHours\(\), selectedDate\.getUTCMinutes\(\)\)\)/);
  assert.match(inspectorSource, /Times are shown and saved as UTC\+0\./);
});
