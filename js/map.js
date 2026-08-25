const WHITE_IN_OCTAVE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const IS_DUPLICATE = [false, true, false, true, false, false, true, false, true, false, true, false];
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const SCALA_MAX = 2147483647n;
  const UNISON = { type: "ratio", n: 1n, d: 1n };

  function floorMod(a, n) {
    return ((a % n) + n) % n;
  }

  function gcdBig(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  function reduceRatio(n, d) {
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcdBig(n, d);
    return { n: n / g, d: d / g };
  }

  function gcdInt(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  function lcmInt(a, b) {
    return (a / gcdInt(a, b)) * b;
  }

  function bigLog2(value) {
    if (value <= 0n) {
      throw new Error("log2 of non-positive value");
    }
    const bits = value.toString(2).length;
    const shift = Math.max(0, bits - 53);
    const mantissa = Number(value >> BigInt(shift));
    return Math.log2(mantissa) + shift;
  }

  function ratioToCents(n, d) {
    return 1200 * (bigLog2(n) - bigLog2(d));
  }

  function pitchToCents(pitch) {
    if (pitch.type === "cents") return pitch.value;
    return ratioToCents(pitch.n, pitch.d);
  }

  function powRatio(n, d, k) {
    if (k === 0) return { n: 1n, d: 1n };
    if (k < 0) return powRatio(d, n, -k);
    let baseN = n;
    let baseD = d;
    let resultN = 1n;
    let resultD = 1n;
    let exp = k;
    while (exp > 0) {
      if (exp & 1) {
        resultN *= baseN;
        resultD *= baseD;
      }
      exp = Math.floor(exp / 2);
      if (exp > 0) {
        baseN *= baseN;
        baseD *= baseD;
      }
    }
    return reduceRatio(resultN, resultD);
  }

  function exceedsScala(n, d) {
    const an = n < 0n ? -n : n;
    const ad = d < 0n ? -d : d;
    return an > SCALA_MAX || ad > SCALA_MAX;
  }

  function applyPeriod(pitch, period, periodIndex) {
    if (periodIndex === 0) {
      if (pitch.type === "ratio" && exceedsScala(pitch.n, pitch.d)) {
        return { type: "cents", value: ratioToCents(pitch.n, pitch.d) };
      }
      return pitch;
    }

    if (pitch.type === "ratio" && period.type === "ratio") {
      const raised = powRatio(period.n, period.d, periodIndex);
      const combined = reduceRatio(pitch.n * raised.n, pitch.d * raised.d);
      if (exceedsScala(combined.n, combined.d) || combined.n <= 0n) {
        return { type: "cents", value: ratioToCents(combined.n, combined.d) };
      }
      return { type: "ratio", n: combined.n, d: combined.d };
    }

    return {
      type: "cents",
      value: pitchToCents(pitch) + periodIndex * pitchToCents(period),
    };
  }

  function degreesOf(parsed) {
    const S = [UNISON];
    for (let i = 0; i < parsed.n - 1; i++) {
      S.push(parsed.pitches[i]);
    }
    return S;
  }

  function mapChromatic(c, n) {
    const pos = floorMod(c, 12);
    const octave = Math.floor(c / 12);
    const whiteIndex = octave * 7 + WHITE_IN_OCTAVE[pos];
    const isDuplicate = IS_DUPLICATE[pos];
    const degree = floorMod(whiteIndex, n);
    const periodIndex = Math.floor(whiteIndex / n);
    return {
      chromatic: c,
      pos,
      whiteIndex,
      isDuplicate,
      degree,
      periodIndex,
    };
  }

  function pitchAt(parsed, c) {
    const S = degreesOf(parsed);
    const mapped = mapChromatic(c, parsed.n);
    const normalizedPitch = S[mapped.degree];
    return {
      ...mapped,
      normalizedPitch,
      pitch: applyPeriod(normalizedPitch, parsed.period, mapped.periodIndex),
    };
  }

  function generatedSize(n) {
    const whiteKeys = lcmInt(n, 7);
    return {
      whiteKeys,
      chromaticCount: (whiteKeys * 12) / 7,
      periodCount: whiteKeys / n,
    };
  }

  function expand(parsed) {
    const size = generatedSize(parsed.n);
    const pitches = [];
    const rows = [];
    for (let c = 1; c <= size.chromaticCount; c++) {
      const row = pitchAt(parsed, c);
      rows.push(row);
      pitches.push(row.pitch);
    }
    return {
      ...size,
      pitches,
      rows,
      generatedPeriod: pitches[pitches.length - 1],
    };
  }

  function midiKeyName(c) {
    const pos = floorMod(c, 12);
    const octave = 4 + Math.floor(c / 12);
    return NOTE_NAMES[pos] + octave;
  }

  function midiNoteName(midi) {
    return midiKeyName(midi - 60);
  }

  function startCOptions() {
    const options = [];
    for (let midi = 0; midi <= 120; midi += 12) {
      options.push({ midi: midi, name: midiNoteName(midi) });
    }
    return options;
  }

  function isInGeneratedCycle(k, chromaticCount) {
    return k >= 0 && k < chromaticCount;
  }

export {
  UNISON,
  WHITE_IN_OCTAVE,
  IS_DUPLICATE,
  floorMod,
  pitchToCents,
  applyPeriod,
  mapChromatic,
  pitchAt,
  generatedSize,
  expand,
  midiKeyName,
  midiNoteName,
  startCOptions,
  isInGeneratedCycle,
  degreesOf,
};
