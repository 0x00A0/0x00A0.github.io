// Notes: C D E F G A B
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"]; // 0..6
const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Interval quality CN
const Q_CN = { P: "纯", M: "大", m: "小", A: "增", d: "减" };
const NUM_CN = ["", "一", "二", "三", "四", "五", "六", "七", "八"]; // 1..8

// Sort order: smaller -> larger: d < m < M < P < A
const QUALITY_ORDER = { d: 0, m: 1, M: 2, P: 3, A: 4 };

// Major/Perfect base semitone counts for interval numbers 1..8
const BASE_SEMITONES = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12 };

// Guitar TAB (EADGBE standard tuning)
const GUITAR_TUNING = [
  { string: 6, note: "E", octave: 2, semitone: 40 },  // Low E
  { string: 5, note: "A", octave: 2, semitone: 45 },  // A
  { string: 4, note: "D", octave: 3, semitone: 50 },  // D
  { string: 3, note: "G", octave: 3, semitone: 55 },  // G
  { string: 2, note: "B", octave: 3, semitone: 59 },  // B
  { string: 1, note: "E", octave: 4, semitone: 64 },  // High E
];

// Notation type: 'staff' or 'tab'
let notationType = 'staff';

function isTabEnabled() {
  const el = document.getElementById("optTab");
  return !!(el && el.checked);
}

function isAlteredAllowed() {
  const el = document.getElementById("optAltered");
  return !!(el && el.checked);
}

function randInt(min, maxInclusive) {
  return min + Math.floor(Math.random() * (maxInclusive - min + 1));
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function diatonicIndex(letter, octave) {
  return octave * 7 + LETTERS.indexOf(letter);
}

function semitoneOf(note) {
  return (note.octave * 12) + (NATURAL_PC[note.letter] ?? 0) + (note.accidental ?? 0);
}

function accidentalToText(acc) {
  if (!acc) return "";
  if (acc === 1) return "♯";
  if (acc === -1) return "♭";
  if (acc === 2) return "𝄪";
  if (acc === -2) return "𝄫";
  return acc > 0 ? "#".repeat(acc) : "b".repeat(-acc);
}

function noteToName(note) {
  return `${note.letter}${accidentalToText(note.accidental)}${note.octave}`;
}

function ensureLowHigh(a, b) {
  const sa = semitoneOf(a);
  const sb = semitoneOf(b);
  if (sa < sb) return { low: a, high: b };
  if (sb < sa) return { low: b, high: a };
  return { low: a, high: b };
}

function intervalNumberDiatonic(low, high) {
  return (diatonicIndex(high.letter, high.octave) - diatonicIndex(low.letter, low.octave)) + 1;
}

function noteFromSemitone(semi) {
  // Convert to a canonical note spelling for display/diatonic computations.
  // We'll use sharp spellings (C, C#, D, ...).
  const pc = ((semi % 12) + 12) % 12;
  const octave = Math.floor(semi / 12);
  const map = [
    { letter: "C", accidental: 0 },
    { letter: "C", accidental: 1 },
    { letter: "D", accidental: 0 },
    { letter: "D", accidental: 1 },
    { letter: "E", accidental: 0 },
    { letter: "F", accidental: 0 },
    { letter: "F", accidental: 1 },
    { letter: "G", accidental: 0 },
    { letter: "G", accidental: 1 },
    { letter: "A", accidental: 0 },
    { letter: "A", accidental: 1 },
    { letter: "B", accidental: 0 },
  ][pc];
  return { letter: map.letter, accidental: map.accidental, octave };
}

function semitoneFromTabPos(pos) {
  const base = GUITAR_TUNING.find(t => t.string === pos.string);
  if (!base) return null;
  return base.semitone + pos.fret;
}

function isNaturalPitchClass(pc) {
  // White keys relative to C
  return pc === 0 || pc === 2 || pc === 4 || pc === 5 || pc === 7 || pc === 9 || pc === 11;
}

function isNaturalSemitone(semi) {
  const pc = ((semi % 12) + 12) % 12;
  return isNaturalPitchClass(pc);
}

function tabPosToNote(pos) {
  const semi = semitoneFromTabPos(pos);
  if (semi == null) return null;
  return noteFromSemitone(semi);
}

// Guitar TAB functions
function noteToGuitarPosition(note) {
  const noteSemitone = semitoneOf(note);
  const positions = [];

  // Find all possible positions on the guitar (within first 17 frets)
  for (const tuning of GUITAR_TUNING) {
    const fret = noteSemitone - tuning.semitone;
    if (fret >= 0 && fret <= 17) {
      positions.push({
        string: tuning.string,
        fret: fret,
        stringName: tuning.note + tuning.octave,
      });
    }
  }

  return positions;
}

function pickBestGuitarPosition(note) {
  const positions = noteToGuitarPosition(note);
  if (positions.length === 0) return null;

  // Prefer middle strings (3, 4) and lower frets
  positions.sort((a, b) => {
    const aScore = Math.abs(a.string - 3.5) * 2 + a.fret * 0.5;
    const bScore = Math.abs(b.string - 3.5) * 2 + b.fret * 0.5;
    return aScore - bScore;
  });

  return positions[0];
}

function isPerfectClass(n) {
  return n === 1 || n === 4 || n === 5 || n === 8;
}

function qualityFor(number, semis) {
  const base = BASE_SEMITONES[number];
  const diff = semis - base;

  if (isPerfectClass(number)) {
    if (diff === 0) return "P";
    if (diff === 1) return "A";
    if (diff === -1) return "d";
    return diff > 0 ? "A" : "d";
  }

  if (diff === 0) return "M";
  if (diff === -1) return "m";
  if (diff === 1) return "A";
  if (diff === -2) return "d";
  return diff > 0 ? "A" : "d";
}

function intervalId(iv) {
  return `${iv.quality}${iv.number}`;
}

function intervalText(iv) {
  const q = Q_CN[iv.quality] ?? iv.quality;
  const n = NUM_CN[iv.number] ?? String(iv.number);
  return `${q}${n}度`;
}

function compareIntervals(a, b) {
  if (a.number !== b.number) return a.number - b.number;
  return (QUALITY_ORDER[a.quality] ?? 99) - (QUALITY_ORDER[b.quality] ?? 99);
}

// =====================
// Generation rules (fixed defaults)
// =====================
const RANGE_LOW = { letter: "C", accidental: 0, octave: 4 };
const RANGE_HIGH = { letter: "C", accidental: 0, octave: 5 };
const ALLOWED_INTERVAL_NUMBERS = [1,2,3,4,5,6,7,8];

function getAllowedAccidentals() {
  return isAlteredAllowed() ? [-1, 0, 1] : [0];
}

function generateTabQuestion() {
  // Human-friendly TAB question:
  // - Choose a small fret window (a "position") and keep both notes inside.
  // - Limit string distance and fret distance.
  // - If accidentals are disabled, only allow natural notes (white keys).
  const strings = [1, 2, 3, 4, 5, 6];
  const allowAccidentals = isAlteredAllowed();

  // Comfort ranges
  const windowMin = 0;
  const windowMax = 12;
  const windowWidth = 4; // e.g. frets 5~9
  const maxFretSpan = 4;
  const maxStringSpan = 2; // keep it within 3 adjacent strings

  for (let tries = 0; tries < 1200; tries++) {
    const posStart = randInt(windowMin, Math.max(windowMin, windowMax - windowWidth));
    const posEnd = posStart + windowWidth;

    const s1 = choice(strings);
    const s2 = randInt(Math.max(1, s1 - maxStringSpan), Math.min(6, s1 + maxStringSpan));

    const fret1 = randInt(posStart, posEnd);
    // keep fret close
    const fret2 = randInt(
      Math.max(posStart, fret1 - maxFretSpan),
      Math.min(posEnd, fret1 + maxFretSpan)
    );

    const posA = { string: s1, fret: fret1 };
    const posB = { string: s2, fret: fret2 };
    if (posA.string === posB.string && posA.fret === posB.fret) continue;

    const semiA = semitoneFromTabPos(posA);
    const semiB = semitoneFromTabPos(posB);
    if (semiA == null || semiB == null) continue;

    if (!allowAccidentals) {
      if (!isNaturalSemitone(semiA) || !isNaturalSemitone(semiB)) continue;
    }

    const absSemis = Math.abs(semiB - semiA);
    if (absSemis > 12) continue;

    // Prefer not-too-tiny span sometimes; avoid 0 unless unison is intended.
    // (keep unison allowed, but mildly reduce its probability)
    if (absSemis === 0 && Math.random() < 0.65) continue;

    const left = noteFromSemitone(semiA);
    const right = noteFromSemitone(semiB);

    const ordered = ensureLowHigh(left, right);
    const number = intervalNumberDiatonic(ordered.low, ordered.high);
    if (number < 1 || number > 8) continue;

    const quality = qualityFor(number, absSemis);

    return {
      left,
      right,
      direction: semiB >= semiA ? "up" : "down",
      answer: { number, quality },
      tab: { left: posA, right: posB },
    };
  }

  // Fallback: simple adjacent strings, same position
  const fbA = { string: 4, fret: 2 };
  const fbB = { string: 3, fret: 2 };
  const fbSemiA = semitoneFromTabPos(fbA);
  const fbSemiB = semitoneFromTabPos(fbB);
  const fbLeft = noteFromSemitone(fbSemiA);
  const fbRight = noteFromSemitone(fbSemiB);
  const fbAbs = Math.abs(fbSemiB - fbSemiA);
  const fbNumber = intervalNumberDiatonic(ensureLowHigh(fbLeft, fbRight).low, ensureLowHigh(fbLeft, fbRight).high);
  const fbQuality = qualityFor(fbNumber, fbAbs);

  return {
    left: fbLeft,
    right: fbRight,
    direction: fbSemiB >= fbSemiA ? "up" : "down",
    answer: { number: fbNumber, quality: fbQuality },
    tab: { left: fbA, right: fbB },
  };
}

function generateQuestion() {
  if (isTabEnabled()) {
    return generateTabQuestion();
  }

  const lowD = diatonicIndex(RANGE_LOW.letter, RANGE_LOW.octave);
  const highD = diatonicIndex(RANGE_HIGH.letter, RANGE_HIGH.octave);
  const allowedAccidentals = getAllowedAccidentals();

  for (let tries = 0; tries < 400; tries++) {
    const num = choice(ALLOWED_INTERVAL_NUMBERS);

    const maxLow = highD - (num - 1);
    if (maxLow < lowD) continue;

    const baseLowDiat = randInt(lowD, maxLow);
    const baseHighDiat = baseLowDiat + (num - 1);

    const lowOct = Math.floor(baseLowDiat / 7);
    const lowLetter = LETTERS[baseLowDiat % 7];
    const highOct = Math.floor(baseHighDiat / 7);
    const highLetter = LETTERS[baseHighDiat % 7];

    const low = { letter: lowLetter, octave: lowOct, accidental: choice(allowedAccidentals) };
    const high = { letter: highLetter, octave: highOct, accidental: choice(allowedAccidentals) };

    // Ensure within one octave in semitones (<= 12)
    const ordered = ensureLowHigh(low, high);
    const semisAsc = semitoneOf(ordered.high) - semitoneOf(ordered.low);
    if (semisAsc < 0 || semisAsc > 12) continue;

    const direction = Math.random() < 0.5 ? "up" : "down";
    const left = direction === "up" ? ordered.low : ordered.high;
    const right = direction === "up" ? ordered.high : ordered.low;

    const absSemis = Math.abs(semitoneOf(right) - semitoneOf(left));
    if (absSemis > 12) continue;

    const number = intervalNumberDiatonic(ensureLowHigh(left, right).low, ensureLowHigh(left, right).high);
    if (number < 1 || number > 8) continue;

    const quality = qualityFor(number, absSemis);

    return {
      left,
      right,
      direction,
      answer: { number, quality },
    };
  }

  return {
    left: { letter: "C", accidental: 0, octave: 5 },
    right: { letter: "C", accidental: 0, octave: 4 },
    direction: "down",
    answer: { number: 8, quality: "P" },
  };
}

// =====================
// Staff renderer (treble)
// =====================

const STAFF = {
  width: 820,
  height: 240,
  leftPad: 80,
  rightPad: 40,
  top: 40,
  lineGap: 16,
  noteX1: 350,
  noteX2: 520,
  noteRadiusX: 14,
  noteRadiusY: 10,
  stepPx: 8,
  anchor: { letter: "E", octave: 4 },
};

function staffStepFor(note) {
  return diatonicIndex(note.letter, note.octave) - diatonicIndex(STAFF.anchor.letter, STAFF.anchor.octave);
}

function yForStep(step) {
  const bottomLineY = STAFF.top + 4 * STAFF.lineGap;
  return bottomLineY - step * STAFF.stepPx;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function renderStaff(svg, q) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${STAFF.width} ${STAFF.height}`);

  const lines = svgEl("g", { fill: "none", stroke: "var(--staff)", "stroke-width": 2 });
  for (let i = 0; i < 5; i++) {
    const y = STAFF.top + i * STAFF.lineGap;
    lines.appendChild(svgEl("line", { x1: STAFF.leftPad, x2: STAFF.width - STAFF.rightPad, y1: y, y2: y }));
  }
  svg.appendChild(lines);

  const clef = svgEl("text", {
    x: STAFF.leftPad - 46,
    y: STAFF.top + 3 * STAFF.lineGap + 8,
    fill: "rgba(17,24,39,0.8)",
    "font-size": 64,
    "font-family": "serif",
  });
  clef.textContent = "𝄞";
  svg.appendChild(clef);

  const left = q.left;
  const right = q.right;

  const s1 = staffStepFor(left);
  const s2 = staffStepFor(right);
  const y1 = yForStep(s1);
  const y2 = yForStep(s2);

  const x1 = STAFF.noteX1;
  const x2 = (s1 === s2) ? (STAFF.noteX2 + 18) : STAFF.noteX2;

  const ledger = svgEl("g", { stroke: "var(--staff)", "stroke-width": 2 });
  function addLedger(step, x) {
    const minLine = 0;
    const maxLine = 8;
    if (step < minLine) {
      for (let s = -2; s >= step; s -= 2) {
        const y = yForStep(s);
        ledger.appendChild(svgEl("line", { x1: x - 26, x2: x + 26, y1: y, y2: y }));
      }
    }
    if (step > maxLine) {
      for (let s = 10; s <= step; s += 2) {
        const y = yForStep(s);
        ledger.appendChild(svgEl("line", { x1: x - 26, x2: x + 26, y1: y, y2: y }));
      }
    }
  }
  addLedger(s1, x1);
  addLedger(s2, x2);
  svg.appendChild(ledger);

  function addAccidental(note, x, y) {
    if (!note.accidental) return;
    const t = svgEl("text", {
      x: x - 34,
      y: y + 6,
      fill: "rgba(17,24,39,0.9)",
      "font-size": 28,
      "font-family": "serif",
      "text-anchor": "middle",
    });
    t.textContent = accidentalToText(note.accidental);
    svg.appendChild(t);
  }

  addAccidental(left, x1, y1);
  addAccidental(right, x2, y2);

  function addNoteHead(x, y, fill, stroke) {
    svg.appendChild(svgEl("ellipse", {
      cx: x,
      cy: y,
      rx: STAFF.noteRadiusX,
      ry: STAFF.noteRadiusY,
      fill,
      stroke,
      "stroke-width": 2,
    }));
  }

  addNoteHead(x1, y1, "rgba(37,99,235,0.16)", "rgba(37,99,235,0.85)");
  addNoteHead(x2, y2, "rgba(17,24,39,0.08)", "rgba(17,24,39,0.75)");

  function addStem(x, y, up) {
    const len = 54;
    const xs = up ? (x + STAFF.noteRadiusX - 2) : (x - STAFF.noteRadiusX + 2);
    const y2 = up ? (y - len) : (y + len);
    svg.appendChild(svgEl("line", {
      x1: xs,
      y1: y,
      x2: xs,
      y2: y2,
      stroke: "rgba(17,24,39,0.65)",
      "stroke-width": 2,
    }));
  }

  const middleY = STAFF.top + 2 * STAFF.lineGap;
  addStem(x1, y1, y1 > middleY);
  addStem(x2, y2, y2 > middleY);

  svg.appendChild(svgEl("line", {
    x1: (STAFF.noteX1 + STAFF.noteX2) / 2,
    x2: (STAFF.noteX1 + STAFF.noteX2) / 2,
    y1: STAFF.top - 6,
    y2: STAFF.top + 4 * STAFF.lineGap + 6,
    stroke: "rgba(17,24,39,0.12)",
    "stroke-width": 3,
  }));
}

// =====================
// Guitar TAB renderer
// =====================

const TAB = {
  width: 820,
  height: 240,
  leftPad: 80,
  rightPad: 40,
  top: 40,
  stringGap: 20,
  noteX1: 360,
  noteX2: 520,
};

function renderTAB(svg, q) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${TAB.width} ${TAB.height}`);

  const strings = svgEl("g", { fill: "none", stroke: "var(--staff)", "stroke-width": 1.5 });
  for (let i = 0; i < 6; i++) {
    const y = TAB.top + i * TAB.stringGap;
    strings.appendChild(svgEl("line", {
      x1: TAB.leftPad,
      x2: TAB.width - TAB.rightPad,
      y1: y,
      y2: y
    }));
  }
  svg.appendChild(strings);

  const stringLabels = ["E", "B", "G", "D", "A", "E"];
  for (let i = 0; i < 6; i++) {
    const y = TAB.top + i * TAB.stringGap;
    const label = svgEl("text", {
      x: TAB.leftPad - 24,
      y: y + 5,
      fill: "rgba(17,24,39,0.7)",
      "font-size": 14,
      "font-weight": 700,
      "font-family": "ui-monospace, monospace",
      "text-anchor": "middle",
    });
    label.textContent = stringLabels[i];
    svg.appendChild(label);
  }

  const tabLabel = svgEl("text", {
    x: TAB.leftPad - 24,
    y: TAB.top - 12,
    fill: "rgba(17,24,39,0.8)",
    "font-size": 16,
    "font-weight": 900,
    "font-family": "ui-sans-serif, sans-serif",
    "text-anchor": "middle",
  });
  tabLabel.textContent = "TAB";
  svg.appendChild(tabLabel);

  const pos1 = q.tab?.left;
  const pos2 = q.tab?.right;

  if (!pos1 || !pos2) {
    const msg = svgEl("text", {
      x: TAB.width / 2,
      y: TAB.height / 2,
      fill: "rgba(17,24,39,0.5)",
      "font-size": 14,
      "text-anchor": "middle",
    });
    msg.textContent = "TAB 题目数据缺失";
    svg.appendChild(msg);
    return;
  }

  function drawFretNumber(x, string, fret, color) {
    // string: 1..6，其中 1 弦应显示在最上方，6 弦在最下方
    const y = TAB.top + (string - 1) * TAB.stringGap;

    const circle = svgEl("circle", {
      cx: x,
      cy: y,
      r: 12,
      fill: color,
      stroke: "rgba(17,24,39,0.8)",
      "stroke-width": 2,
    });
    svg.appendChild(circle);

    const text = svgEl("text", {
      x: x,
      y: y + 5,
      fill: "#ffffff",
      "font-size": 14,
      "font-weight": 900,
      "font-family": "ui-monospace, monospace",
      "text-anchor": "middle",
    });
    text.textContent = String(fret);
    svg.appendChild(text);
  }

  drawFretNumber(TAB.noteX1, pos1.string, pos1.fret, "rgba(37,99,235,0.75)");
  drawFretNumber(TAB.noteX2, pos2.string, pos2.fret, "rgba(17,24,39,0.6)");

  svg.appendChild(svgEl("line", {
    x1: (TAB.noteX1 + TAB.noteX2) / 2,
    x2: (TAB.noteX1 + TAB.noteX2) / 2,
    y1: TAB.top - 6,
    y2: TAB.top + 5 * TAB.stringGap + 6,
    stroke: "rgba(17,24,39,0.12)",
    "stroke-width": 3,
  }));
}

// =====================
// UI + state
// =====================

const state = {
  current: null,
  choices: [],
  locked: false,
  total: 0,
  correct: 0,
};

function updateStats() {
  const total = state.total;
  const correct = state.correct;
  const acc = total ? Math.round((correct / total) * 100) : 0;
  document.getElementById("statTotal").textContent = String(total);
  document.getElementById("statCorrect").textContent = String(correct);
  document.getElementById("statAcc").textContent = `${acc}%`;
}

function setFeedback(kind, text, detail) {
  const msg = document.getElementById("msg");
  const det = document.getElementById("detail");

  msg.classList.remove("ok", "bad");
  if (kind === "ok") msg.classList.add("ok");
  if (kind === "bad") msg.classList.add("bad");

  msg.textContent = text;
  det.textContent = detail || "";
}

function setChoicesEnabled(enabled) {
  document.querySelectorAll("#choices button").forEach((b) => {
    b.disabled = !enabled;
  });
}

function buildChoiceSet(correct) {
  const pool = new Map();
  pool.set(intervalId(correct), correct);

  // “减一度”在本练习中视为不存在：永远不出现在选项里。
  // （用 id 过滤，避免改动其它质量/级数的生成逻辑）
  const isForbidden = (iv) => intervalId(iv) === "d1";

  const n = correct.number;
  const candidates = [];

  const altered = isAlteredAllowed();

  if (isPerfectClass(n)) {
    candidates.push({ number: n, quality: "P" });
    if (altered) {
      candidates.push({ number: n, quality: "d" }, { number: n, quality: "A" });
    } else {
      if (n === 4) candidates.push({ number: 4, quality: "A" });
      if (n === 5) candidates.push({ number: 5, quality: "d" });
    }
  } else {
    candidates.push({ number: n, quality: "m" }, { number: n, quality: "M" });
    if (altered) {
      candidates.push({ number: n, quality: "d" }, { number: n, quality: "A" });
    }
  }

  if (n > 1) candidates.push({ number: n - 1, quality: isPerfectClass(n - 1) ? "P" : "M" });
  if (n < 8) candidates.push({ number: n + 1, quality: isPerfectClass(n + 1) ? "P" : "M" });

  for (const c of candidates) {
    if (isForbidden(c)) continue;
    const id = intervalId(c);
    if (!pool.has(id)) pool.set(id, c);
  }

  const NATURAL_COMMON = [
    { number: 1, quality: "P" },
    { number: 2, quality: "m" },
    { number: 2, quality: "M" },
    { number: 3, quality: "m" },
    { number: 3, quality: "M" },
    { number: 4, quality: "P" },
    { number: 4, quality: "A" },
    { number: 5, quality: "d" },
    { number: 5, quality: "P" },
    { number: 6, quality: "m" },
    { number: 6, quality: "M" },
    { number: 7, quality: "m" },
    { number: 7, quality: "M" },
    { number: 8, quality: "P" },
  ];

  const ALTERED_COMMON = [
    { number: 2, quality: "A" },
    { number: 2, quality: "d" },
    { number: 3, quality: "A" },
    { number: 3, quality: "d" },
    { number: 6, quality: "A" },
    { number: 6, quality: "d" },
    { number: 7, quality: "A" },
    { number: 7, quality: "d" },
  ];

  const commonPool = altered ? [...NATURAL_COMMON, ...ALTERED_COMMON] : NATURAL_COMMON;

  for (const c of commonPool) {
    if (pool.size >= 9) break;
    if (isForbidden(c)) continue;
    const id = intervalId(c);
    if (!pool.has(id)) pool.set(id, c);
  }

  // Extra safety: in case something slipped in.
  const arr = Array.from(pool.values()).filter((iv) => !isForbidden(iv));
  while (arr.length > 9) arr.splice(randInt(0, arr.length - 1), 1);

  arr.sort(compareIntervals);
  return arr;
}

function renderChoices(choices) {
  const wrap = document.getElementById("choices");
  wrap.innerHTML = "";

  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = intervalId(c);
    btn.textContent = `${i + 1}. ${intervalText(c)}`;
    btn.addEventListener("click", () => answer(c));
    wrap.appendChild(btn);
  }
}

function renderQuestion() {
  state.current = generateQuestion();
  state.locked = false;

  const leftName = noteToName(state.current.left);
  const rightName = noteToName(state.current.right);
  document.getElementById("noteNames").textContent = `${leftName} → ${rightName}`;
  document.getElementById("dirHint").textContent = state.current.direction === "up" ? "上行" : "下行";

  const svg = document.getElementById("staffSvg");
  if (isTabEnabled()) {
    notationType = 'tab';
    renderTAB(svg, state.current);
  } else {
    notationType = 'staff';
    renderStaff(svg, state.current);
  }

  state.choices = buildChoiceSet(state.current.answer);
  renderChoices(state.choices);
  setChoicesEnabled(true);

  setFeedback("", "请选择音程", "");
}

function answer(selected) {
  if (!state.current || state.locked) return;

  const correct = state.current.answer;
  const ok = intervalId(selected) === intervalId(correct);

  state.total += 1;

  const leftName = noteToName(state.current.left);
  const rightName = noteToName(state.current.right);

  if (ok) {
    state.correct += 1;
    state.locked = true;
    setChoicesEnabled(false);
    setFeedback("ok", "正确", `${leftName} → ${rightName} = ${intervalText(correct)}`);
    updateStats();
    window.setTimeout(() => renderQuestion(), 650);
  } else {
    setFeedback("bad", "不对", `你选了 ${intervalText(selected)}；正确是 ${intervalText(correct)}（${leftName} → ${rightName}）`);
    updateStats();
  }
}

function showAnswer() {
  if (!state.current) return;
  const leftName = noteToName(state.current.left);
  const rightName = noteToName(state.current.right);
  setFeedback("", "答案", `${leftName} → ${rightName} = ${intervalText(state.current.answer)}`);
}

function resetStats() {
  state.total = 0;
  state.correct = 0;
  updateStats();
  renderQuestion();
}

function wireEvents() {
  document.getElementById("btnNext").addEventListener("click", () => renderQuestion());
  document.getElementById("btnShow").addEventListener("click", () => showAnswer());
  document.getElementById("btnReset").addEventListener("click", () => resetStats());

  const optTab = document.getElementById("optTab");
  if (optTab) {
    optTab.addEventListener("change", () => {
      renderQuestion();
    });
  }

  const opt = document.getElementById("optAltered");
  if (opt) {
    opt.addEventListener("change", () => {
      renderQuestion();
    });
  }

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k >= "1" && k <= "9") {
      const idx = parseInt(k, 10) - 1;
      const c = state.choices[idx];
      if (c) answer(c);
    }
    if (k === "n" || k === "N") renderQuestion();
    if (k === "s" || k === "S") showAnswer();
    if (k === "r" || k === "R") resetStats();
  });
}

// boot
wireEvents();
updateStats();
renderQuestion();
