function SclError(message) {
    const err = new Error(message);
    err.name = "SclError";
    return err;
  }

  function contentLines(text) {
    return String(text)
      .split(/\r?\n/)
      .filter((line) => {
        const trimmedStart = line.replace(/^[ \t]+/, "");
        return !trimmedStart.startsWith("!");
      });
  }

  function parsePitchLine(line) {
    const trimmed = line.trim();
    if (!trimmed) {
      throw SclError("Empty pitch line.");
    }

    const token = trimmed.split(/\s+/)[0];
    if (token.includes(".")) {
      const value = Number.parseFloat(token);
      if (!Number.isFinite(value)) {
        throw SclError("Invalid cents value: " + token);
      }
      return { type: "cents", value };
    }

    const match = token.match(/^(-?\d+)(?:\/(-?\d+))?$/);
    if (!match) {
      throw SclError("Invalid ratio: " + token);
    }

    const n = BigInt(match[1]);
    const d = match[2] == null ? 1n : BigInt(match[2]);
    if (n < 0n || d < 0n) {
      throw SclError("Negative ratios are not allowed.");
    }
    if (d === 0n) {
      throw SclError("Ratio has a zero denominator.");
    }
    if (n === 0n) {
      throw SclError("Ratio has a zero numerator.");
    }
    return { type: "ratio", n, d };
  }

  function parse(text) {
    const lines = contentLines(text);
    if (lines.length < 2) {
      throw SclError("File is missing a description or note count.");
    }

    const description = lines[0];
    const countToken = lines[1].trim();
    if (!/^\d+$/.test(countToken)) {
      throw SclError("Note count must be a non-negative integer.");
    }
    const n = Number.parseInt(countToken, 10);
    if (n === 0) {
      throw SclError("Scale has no degrees.");
    }

    const pitches = [];
    for (let i = 2; i < lines.length && pitches.length < n; i++) {
      if (lines[i].trim() === "") continue;
      pitches.push(parsePitchLine(lines[i]));
    }

    if (pitches.length !== n) {
      throw SclError("Expected " + n + " pitch lines, found " + pitches.length + ".");
    }

    return {
      description: description.trim(),
      n,
      pitches,
      period: pitches[n - 1],
    };
  }

  function formatPitch(pitch) {
    if (pitch.type === "ratio") {
      if (pitch.d === 1n) return pitch.n.toString() + "/1";
      return pitch.n.toString() + "/" + pitch.d.toString();
    }
    let s = pitch.value.toFixed(6);
    s = s.replace(/(\.\d*?)0+$/, "$1");
    if (s.endsWith(".")) s += "0";
    if (!s.includes(".")) s += ".0";
    return s;
  }

  function serialize(options) {
    const comments = options.comments || [];
    const description = options.description || "";
    const pitches = options.pitches;
    const lines = [];

    for (const comment of comments) {
      lines.push("! " + comment);
    }
    lines.push(description);
    lines.push(" " + pitches.length);
    lines.push("!");
    for (const pitch of pitches) {
      lines.push(" " + formatPitch(pitch));
    }
    lines.push("");
    return lines.join("\n");
  }

export { SclError, parse, parsePitchLine, formatPitch, serialize };
