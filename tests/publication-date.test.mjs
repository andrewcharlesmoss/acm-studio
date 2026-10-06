import assert from "node:assert/strict";
import { readStudioSource } from "./studio-module-source.mjs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import ts from "typescript";
import { loadProductionModule } from "./production-module.mjs";

const datesUrl = new URL("../app/studio/publication-date.ts", import.meta.url);
const dates = await loadProductionModule(datesUrl);
const inspectorSource = readStudioSource("app/studio/studio-inspectors.tsx");
const inspectorTree = ts.createSourceFile("inspector.tsx", inspectorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const dateHandlers = new Map();
function collectDateHandlers(node) {
  if (ts.isFunctionDeclaration(node) && ["updatePublicationDate", "updateDateParts"].includes(node.name?.text)) dateHandlers.set(node.name.text, node.getText(inspectorTree));
  ts.forEachChild(node, collectDateHandlers);
}
collectDateHandlers(inspectorTree);
assert.equal(dateHandlers.size, 2);
const compiledDateHandlers = ts.transpileModule([...dateHandlers.values()].join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

const cases = [
  ["UTC", "2026-10-04T12:00:00Z", "UTC+0", 12, 0],
  ["Europe/London", "2026-10-04T12:00:00Z", "UTC+1", 13, 0],
  ["Europe/London", "2026-12-04T12:00:00Z", "UTC+0", 12, 0],
  ["America/New_York", "2026-07-04T12:00:00Z", "UTC−4", 8, 0],
  ["America/New_York", "2026-12-04T12:00:00Z", "UTC−5", 7, 0],
  ["Asia/Kolkata", "2026-10-04T12:00:00Z", "UTC+5:30", 17, 30],
  ["Asia/Kathmandu", "2026-10-04T12:00:00Z", "UTC+5:45", 17, 45],
  ["America/St_Johns", "2026-12-04T12:00:00Z", "UTC−3:30", 8, 30],
];

function inTimezone(timezone, instants) {
  // Isolated processes keep the test runner's timezone and parallel tests intact.
  const script = `import { formatPublicationTimezone } from ${JSON.stringify(datesUrl.href)};
    const instants = ${JSON.stringify(instants)};
    process.stdout.write(JSON.stringify(instants.map(instant => {
      const date = new Date(instant);
      return { label: formatPublicationTimezone(date), hours: date.getHours(), minutes: date.getMinutes(), iso: date.toISOString() };
    })));`;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { encoding: "utf8", env: { ...process.env, TZ: timezone } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

for (const [timezone, instant, label, hours, minutes] of cases) test(`Publish offset matches local fields in ${timezone} at ${instant}`, () => {
  assert.deepEqual(inTimezone(timezone, [instant])[0], { label, hours, minutes, iso: new Date(instant).toISOString() });
});

test("selected-date offsets follow both London daylight-saving transitions", () => {
  const instants = ["2026-03-29T00:30:00Z", "2026-03-29T01:30:00Z", "2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"];
  assert.deepEqual(inTimezone("Europe/London", instants).map(item => item.label), ["UTC+0", "UTC+1", "UTC+1", "UTC+0"]);
});

for (const [timezone, instant, parts, expectedIso, expectedLabel] of [
  ["Europe/London", "2026-07-04T12:00:00Z", { month: 11 }, "2026-12-04T13:00:00.000Z", "UTC+0"],
  ["Europe/London", "2026-12-04T12:00:00Z", { month: 6 }, "2026-07-04T11:00:00.000Z", "UTC+1"],
  ["Asia/Kolkata", "2026-10-04T12:00:00Z", { hours: 18, minutes: 45 }, "2026-10-04T13:15:00.000Z", "UTC+5:30"],
  ["America/New_York", "2026-12-04T12:00:00Z", { hours: 9, minutes: 30 }, "2026-12-04T14:30:00.000Z", "UTC−5"],
  ["Europe/London", "2026-01-31T13:00:00Z", { month: 1 }, "2026-02-28T13:00:00.000Z", "UTC+0"],
]) test(`production Publish date handler keeps local fields and emits UTC ISO in ${timezone} for ${JSON.stringify(parts)}`, () => {
  const script = `import { formatPublicationTimezone } from ${JSON.stringify(datesUrl.href)};
    const selectedDate = new Date(${JSON.stringify(instant)});
    const changes = [];
    const onChange = (field, value) => changes.push([field, value]);
    ${compiledDateHandlers}
    updateDateParts(${JSON.stringify(parts)});
    process.stdout.write(JSON.stringify({ changes, label: formatPublicationTimezone(new Date(changes[0][1])) }));`;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { encoding: "utf8", env: { ...process.env, TZ: timezone } });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { changes: [["publishAt", expectedIso]], label: expectedLabel });
});

test("publication calendar retains Monday-first padding and leap days", () => {
  assert.equal(dates.parsePublicationDate(undefined), null);
  assert.equal(dates.parsePublicationDate("invalid"), null);
  assert.equal(dates.formatPublishDate("invalid"), "Immediately");
  assert.equal(dates.formatPublicationTimezone(new Date(NaN)), "Local time");
  assert.equal(dates.MONTH_NAMES.length, 12);
  assert.equal(dates.MONTH_NAMES[0], "January");
  assert.deepEqual(dates.WEEKDAY_NAMES, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  for (const [year, length] of [[2024, 29], [2025, 28]]) {
    const month = new Date(year, 1, 9);
    const first = dates.startOfMonth(month);
    assert.equal(first.getDate(), 1);
    assert.equal(dates.formatCalendarMonth(month), `February ${year}`);
    const cells = dates.getCalendarDays(first);
    assert.equal(cells.length % 7, 0);
    assert.equal(cells.filter(Boolean).length, length);
    assert.equal(cells.findIndex(Boolean), (first.getDay() + 6) % 7);
    assert.ok(dates.isSameCalendarDay(first, cells.find(Boolean)));
    assert.equal(dates.isSameCalendarDay(first, new Date(year, 1, 2)), false);
  }
});

test("Publish picker labels its existing local calendar fields with the selected-date offset", async () => {
  const source = inspectorSource;
  assert.match(source, /from "\.\.\/\.\.\/publication-date"/);
  assert.match(source, /className="publish-timezone" title="Local time on this device">\{formatPublicationTimezone\(selectedDate\)\}/);
  assert.doesNotMatch(source, />UTC\+0<\/span>/);
  assert.match(source, /selectedDate\.getHours\(\)/);
  assert.match(source, /selectedDate\.getMinutes\(\)/);
  assert.match(source, /updatePublicationDate\(new Date\(year, month, day,/);
  assert.match(source, /onChange\("publishAt", next\.toISOString\(\)\)/);
  assert.match(source, /Times use this device’s local time zone/);
});
