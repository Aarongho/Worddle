// src/dictionary-en.js
// Load dictionary from /public/words.txt offline.
export async function loadDictionary() {
  try {
    const res = await fetch("/words.txt");
    const text = await res.text();
    const words = text
      .split(/\r?\n/)
      .map((w) => w.trim().toUpperCase())
      .filter((w) => /^[A-Z]{4,6}$/.test(w)); // only 4-6 letter words
    console.log(`✅ Loaded ${words.length} words from dictionary`);
    return new Set(words);
  } catch (err) {
    console.error("❌ Failed to load dictionary:", err);
    return new Set();
  }
}
