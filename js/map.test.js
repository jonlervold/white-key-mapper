import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as Scl from "./scl.js";
import * as Map from "./map.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readExample(name) {
  return fs.readFileSync(path.join(__dirname, "..", "examples", name), "utf8");
}

function edo(n, periodCents) {
  const period = periodCents == null ? 1200 : periodCents;
  const pitches = [];
  for (let i = 1; i <= n; i++) {
    pitches.push({ type: "cents", value: (period * i) / n });
  }
  return {
    description: n + "-EDO",
    n,
    pitches,
    period: pitches[n - 1],
  };
}

function whiteSequence(parsed, fromC, toC) {
  const rows = [];
  for (let c = fromC; c <= toC; c++) {
    const row = Map.pitchAt(parsed, c);
    if (!row.isDuplicate) rows.push(row);
  }
  return rows;
}

function assertWhiteKeysAdvance(parsed, fromC, toC) {
  const whites = whiteSequence(parsed, fromC, toC);
  for (let i = 1; i < whites.length; i++) {
    const prev = whites[i - 1];
    const next = whites[i];
    assert.strictEqual(next.whiteIndex, prev.whiteIndex + 1);
    assert.strictEqual(next.degree, (prev.degree + 1) % parsed.n);
    if (prev.degree === parsed.n - 1) {
      assert.strictEqual(next.degree, 0);
      assert.strictEqual(next.periodIndex, prev.periodIndex + 1);
    } else {
      assert.strictEqual(next.periodIndex, prev.periodIndex);
    }
  }
}

function assertDuplicatesMatchWhite(parsed, fromC, toC) {
  for (let c = fromC; c <= toC; c++) {
    const row = Map.pitchAt(parsed, c);
    if (!row.isDuplicate) continue;
    const prev = Map.pitchAt(parsed, c - 1);
    assert.strictEqual(prev.isDuplicate, false);
    assert.strictEqual(row.whiteIndex, prev.whiteIndex);
    assert.strictEqual(row.degree, prev.degree);
    assert.strictEqual(row.periodIndex, prev.periodIndex);
    assert.strictEqual(Scl.formatPitch(row.pitch), Scl.formatPitch(prev.pitch));
  }
}

function ratio(n, d) {
  return { type: "ratio", n: BigInt(n), d: BigInt(d) };
}

// --- parser ---

const majorText = readExample("just-major.scl");
const major = Scl.parse(majorText);
assert.strictEqual(major.n, 7);
assert.strictEqual(major.description, "Just major diatonic");
assert.deepStrictEqual(major.period, ratio(2, 1));
assert.deepStrictEqual(major.pitches[0], ratio(9, 8));
assert.deepStrictEqual(major.pitches[2], ratio(4, 3));

const pentText = readExample("pentatonic.scl");
const pent = Scl.parse(pentText);
assert.strictEqual(pent.n, 5);
assert.deepStrictEqual(pent.period, ratio(2, 1));

const mixed = Scl.parse(
  "Meantone fragment\n 4\n!\n 76.04900\n 5/4\n 696.57843\n 2/1\n"
);
assert.strictEqual(mixed.n, 4);
assert.strictEqual(mixed.pitches[0].type, "cents");
assert.ok(Math.abs(mixed.pitches[0].value - 76.049) < 1e-9);
assert.deepStrictEqual(mixed.pitches[1], ratio(5, 4));
assert.strictEqual(mixed.pitches[2].type, "cents");
assert.deepStrictEqual(mixed.period, ratio(2, 1));

assert.throws(() => Scl.parse("Bad\n 1\n -3/2\n"), /Negative/);
assert.throws(() => Scl.parse("Empty\n 0\n"), /no degrees/);

const integerOctave = Scl.parse("Octave\n 1\n 2\n");
assert.deepStrictEqual(integerOctave.period, ratio(2, 1));

// --- 7-note mapping ---

assert.deepStrictEqual(Map.generatedSize(7), {
  whiteKeys: 7,
  chromaticCount: 12,
  periodCount: 1,
});

const sevenRows = [
  [0, "C4", 0, 1, 0, "1/1"],
  [1, "C#4", "dup", 1, 0, "1/1"],
  [2, "D4", 1, 2, 0, "9/8"],
  [3, "D#4", "dup", 2, 0, "9/8"],
  [4, "E4", 2, 3, 0, "5/4"],
  [5, "F4", 3, 4, 0, "4/3"],
  [6, "F#4", "dup", 4, 0, "4/3"],
  [7, "G4", 4, 5, 0, "3/2"],
  [8, "G#4", "dup", 5, 0, "3/2"],
  [9, "A4", 5, 6, 0, "5/3"],
  [10, "A#4", "dup", 6, 0, "5/3"],
  [11, "B4", 6, 7, 0, "15/8"],
  [12, "C5", 7, 1, 1, "2/1"],
];

for (const [c, name, white, degree, period, pitch] of sevenRows) {
  const row = Map.pitchAt(major, c);
  assert.strictEqual(Map.midiKeyName(c), name);
  if (white === "dup") {
    assert.strictEqual(row.isDuplicate, true);
  } else {
    assert.strictEqual(row.isDuplicate, false);
    assert.strictEqual(row.whiteIndex, white);
  }
  assert.strictEqual(row.degree + 1, degree);
  assert.strictEqual(row.periodIndex, period);
  assert.strictEqual(Scl.formatPitch(row.pitch), pitch);
}

const expanded7 = Map.expand(major);
assert.strictEqual(expanded7.chromaticCount, 12);
assert.strictEqual(expanded7.pitches.length, 12);
assert.strictEqual(Scl.formatPitch(expanded7.pitches[0]), "1/1");
assert.strictEqual(Scl.formatPitch(expanded7.pitches[11]), "2/1");
assert.strictEqual(
  Scl.formatPitch(expanded7.pitches[10]),
  "15/8"
);

const roundTrip7 = Scl.parse(
  Scl.serialize({
    description: "mapped",
    pitches: expanded7.pitches,
  })
);
assert.strictEqual(roundTrip7.n, 12);
assert.deepStrictEqual(roundTrip7.period, ratio(2, 1));

// --- 5-note: period restarts on A, file has 60 degrees ---

assert.deepStrictEqual(Map.generatedSize(5), {
  whiteKeys: 35,
  chromaticCount: 60,
  periodCount: 7,
});

const a4 = Map.pitchAt(pent, 9);
assert.strictEqual(Map.midiKeyName(9), "A4");
assert.strictEqual(a4.isDuplicate, false);
assert.strictEqual(a4.degree, 0);
assert.strictEqual(a4.periodIndex, 1);
assert.strictEqual(Scl.formatPitch(a4.pitch), "2/1");

const expanded5 = Map.expand(pent);
assert.strictEqual(expanded5.chromaticCount, 60);
assert.strictEqual(Scl.formatPitch(expanded5.generatedPeriod), "128/1");

// --- 13-note: degree 13 on A of second octave; B wraps ---

const edo13 = edo(13);
assert.deepStrictEqual(Map.generatedSize(13), {
  whiteKeys: 91,
  chromaticCount: 156,
  periodCount: 7,
});

const secondA = Map.pitchAt(edo13, 21);
assert.strictEqual(Map.midiKeyName(21), "A5");
assert.strictEqual(secondA.whiteIndex, 12);
assert.strictEqual(secondA.degree + 1, 13);
assert.strictEqual(secondA.periodIndex, 0);

const secondB = Map.pitchAt(edo13, 23);
assert.strictEqual(Map.midiKeyName(23), "B5");
assert.strictEqual(secondB.whiteIndex, 13);
assert.strictEqual(secondB.degree + 1, 1);
assert.strictEqual(secondB.periodIndex, 1);

const nextC = Map.pitchAt(edo13, 24);
assert.strictEqual(Map.midiKeyName(24), "C6");
assert.strictEqual(nextC.degree + 1, 2);
assert.strictEqual(nextC.periodIndex, 1);

// --- keys below 1/1 C ---

const belowB = Map.pitchAt(major, -1);
assert.strictEqual(Map.midiKeyName(-1), "B3");
assert.strictEqual(belowB.isDuplicate, false);
assert.strictEqual(belowB.whiteIndex, -1);
assert.strictEqual(belowB.degree + 1, 7);
assert.strictEqual(belowB.periodIndex, -1);
assert.strictEqual(Scl.formatPitch(belowB.pitch), "15/16");

const belowAs = Map.pitchAt(major, -2);
assert.strictEqual(Map.midiKeyName(-2), "A#3");
assert.strictEqual(belowAs.isDuplicate, true);
assert.strictEqual(belowAs.whiteIndex, -2);
assert.strictEqual(belowAs.degree + 1, 6);
assert.strictEqual(belowAs.periodIndex, -1);
assert.strictEqual(Scl.formatPitch(belowAs.pitch), "5/6");

const belowA = Map.pitchAt(major, -3);
assert.strictEqual(belowA.isDuplicate, false);
assert.strictEqual(Scl.formatPitch(belowA.pitch), "5/6");

const c5 = Map.pitchAt(major, 12);
assert.strictEqual(Scl.formatPitch(c5.pitch), "2/1");
assert.strictEqual(Scl.formatPitch(c5.normalizedPitch), "1/1");
assert.strictEqual(Scl.formatPitch(belowB.normalizedPitch), "15/8");
assert.strictEqual(Scl.formatPitch(belowAs.normalizedPitch), "5/3");
assert.strictEqual(Scl.formatPitch(Map.pitchAt(pent, 9).normalizedPitch), "1/1");

assert.strictEqual(Map.midiNoteName(0), "C-1");
assert.strictEqual(Map.midiNoteName(60), "C4");
assert.strictEqual(Map.midiNoteName(127), "G9");
assert.strictEqual(Map.startCOptions().length, 11);
assert.strictEqual(Map.startCOptions()[5].midi, 60);
assert.strictEqual(Map.isInGeneratedCycle(0, 12), true);
assert.strictEqual(Map.isInGeneratedCycle(11, 12), true);
assert.strictEqual(Map.isInGeneratedCycle(12, 12), false);
assert.strictEqual(Map.isInGeneratedCycle(-1, 12), false);

for (const parsed of [major, pent, edo(13)]) {
  const S = Map.degreesOf(parsed);
  for (let c = -12; c <= 36; c++) {
    const row = Map.pitchAt(parsed, c);
    assert.strictEqual(
      Scl.formatPitch(row.normalizedPitch),
      Scl.formatPitch(S[row.degree])
    );
    assert.strictEqual(
      Scl.formatPitch(row.pitch),
      Scl.formatPitch(Map.applyPeriod(row.normalizedPitch, parsed.period, row.periodIndex))
    );
  }
}

// --- invariants across sizes, including below C ---

for (const parsed of [major, pent, edo(3), edo(9), edo13, edo(14), edo(19), edo(21), mixed]) {
  assertWhiteKeysAdvance(parsed, -24, 48);
  assertDuplicatesMatchWhite(parsed, -24, 48);
}

// non-octave period
const tritave = Scl.parse("Bohlen-Pierce fragment\n 3\n 5/3\n 7/3\n 3/1\n");
assertWhiteKeysAdvance(tritave, -12, 36);
const tPeriod = Map.expand(tritave);
assert.strictEqual(Scl.formatPitch(tPeriod.generatedPeriod), "2187/1");

console.log("All tests passed.");
