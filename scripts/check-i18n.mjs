import fs from "node:fs";
import path from "node:path";

const LOCALES_DIR = path.resolve(process.cwd(), "client/src/i18n/locales");
const LANGUAGES = ["en", "kn", "hi", "te", "ta"];
const REFERENCE_LANG = "en";

function flattenKeys(obj, prefix = "") {
  const keys = [];
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      if (typeof item === "string") {
        keys.push({ key: `${prefix}[${idx}]`, value: item });
      } else if (item && typeof item === "object") {
        keys.push(...flattenKeys(item, `${prefix}[${idx}]`));
      }
    });
    return keys;
  }
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      keys.push({ key: fullKey, value: v });
    } else if (v && typeof v === "object") {
      keys.push(...flattenKeys(v, fullKey));
    }
  }
  return keys;
}

const refDir = path.join(LOCALES_DIR, REFERENCE_LANG);
const namespaces = fs.readdirSync(refDir).filter((f) => f.endsWith(".json")).sort();

let hasError = false;
console.log("=== Namma Rytha i18n Completeness Report ===");

for (const lang of LANGUAGES) {
  let langTotal = 0;
  let langPresent = 0;
  const issues = [];

  for (const ns of namespaces) {
    const refJson = JSON.parse(fs.readFileSync(path.join(refDir, ns), "utf8"));
    const refEntries = flattenKeys(refJson);
    langTotal += refEntries.length;

    const targetPath = path.join(LOCALES_DIR, lang, ns);
    if (!fs.existsSync(targetPath)) {
      issues.push(`Missing file: ${lang}/${ns}`);
      hasError = true;
      continue;
    }

    let targetJson;
    try {
      targetJson = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    } catch (err) {
      issues.push(`Invalid JSON in ${lang}/${ns}: ${err.message}`);
      hasError = true;
      continue;
    }

    const targetEntries = flattenKeys(targetJson);
    const targetMap = new Map(targetEntries.map((e) => [e.key, e.value]));

    for (const ref of refEntries) {
      const val = targetMap.get(ref.key);
      if (val === undefined) {
        issues.push(`Missing key: ${lang}/${ns} -> ${ref.key}`);
        hasError = true;
      } else if (val.trim().length === 0) {
        issues.push(`Empty value: ${lang}/${ns} -> ${ref.key}`);
        hasError = true;
      } else {
        langPresent += 1;
      }
    }
  }

  const pct = langTotal > 0 ? ((langPresent / langTotal) * 100).toFixed(1) : "0.0";
  console.log(`[${lang}] ${langPresent}/${langTotal} keys (${pct}%)`);
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
}

if (hasError) {
  process.exit(1);
}
console.log("All 5 languages passed 100% completeness check!");
