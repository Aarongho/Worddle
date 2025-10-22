// convert-word.js
const fs = require("fs");
const path = require("path");

// path output diarahkan ke folder public di dalam wordle-duel
const OUTPUT_PATH = path.join(__dirname, "wordle-duel", "public", "words.txt");

// pastikan folder public ada
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

// baca file raw.txt di folder yang sama
const raw = fs.readFileSync(path.join(__dirname, "raw.txt"), "utf8");

// filter hanya kata 4–6 huruf, uppercase, unik
const lines = raw
  .split(/\r?\n/)
  .map((w) => w.trim().toUpperCase())
  .filter((w) => /^[A-Z]{4,6}$/.test(w));

const unique = Array.from(new Set(lines)).sort();

// tulis hasil
fs.writeFileSync(OUTPUT_PATH, unique.join("\n"));
console.log(`✅ Selesai! ${unique.length} kata ditulis ke ${OUTPUT_PATH}`);
