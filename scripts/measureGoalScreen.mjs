// Measures the goal screen in a real browser at 390x844, then drives the start
// button through to the run. Nothing here is read off the source: every number
// printed below came out of the rendered page.
//
// The browser profile is an isolated temp directory, never the owner's own
// Chrome profile, because an agent closing a shared browser closes his windows
// with it.
import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(
  "C:/Users/adith/systoliq-v2-claude/Oxbridge Systoliq app/package.json",
);
const { chromium } = require("playwright-core");

const URL_BASE = process.env.GOAL_URL || "http://localhost:7513";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const profile = mkdtempSync(join(tmpdir(), "afterburner-goal-"));

// launchPersistentContext takes the isolated profile directory as its first
// argument, which is the supported way to keep this browser away from the
// owner's own Chrome profile and windows.
const context = await chromium.launchPersistentContext(profile, {
  executablePath: CHROME,
  headless: true,
  args: ["--no-first-run", "--no-default-browser-check"],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

const page = await context.newPage();
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push("console: " + m.text());
});
page.on("pageerror", (e) => problems.push("pageerror: " + e.message));

// The served bundle must be the one just built, not a neighbour's.
const html = await (await fetch(URL_BASE + "/")).text();
console.log("served entry: " + (html.match(/index-[A-Za-z0-9_-]+\.js/) || ["none"])[0]);

await page.goto(URL_BASE + "/goal", { waitUntil: "networkidle" });
await page.waitForSelector(".gset-start");

const layout = async (label) => {
  const out = await page.evaluate(() => {
    const doc = document.documentElement;
    const wide = [];
    const small = [];
    const tiny = [];

    for (const el of document.querySelectorAll("*")) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.right > doc.clientWidth + 0.5) {
        wide.push(el.className + " right " + Math.round(box.right));
      }
    }

    // Only the controls this screen owns. The shared navbar is another
    // component's business and is reported separately rather than silently
    // folded into this page's numbers.
    for (const el of document.querySelectorAll(".gset button, .gset a")) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.width < 44 || box.height < 44) {
        small.push(
          (el.textContent || el.tagName).trim().slice(0, 26) +
            " " + Math.round(box.width) + "x" + Math.round(box.height),
        );
      }
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest(".gset-sr, .abp-sr")) continue;
      const size = parseFloat(getComputedStyle(parent).fontSize);
      if (size < 14) tiny.push(size + "px " + node.textContent.trim().slice(0, 30));
    }

    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      pageHeight: doc.scrollHeight,
      wide,
      small,
      tiny,
    };
  });

  console.log(
    "\n[" + label + "] width " + out.scrollWidth + " vs " + out.clientWidth +
      ", page height " + out.pageHeight,
  );
  console.log("  past the right edge: " + (out.wide.length ? out.wide.join(" | ") : "none"));
  console.log("  under 44px:          " + (out.small.length ? out.small.join(" | ") : "none"));
  console.log("  text under 14px:     " + (out.tiny.length ? out.tiny.join(" | ") : "none"));
  return out;
};

await layout("goal at 390x844");

// CONTRAST, computed from what is painted rather than from the palette this
// page thinks it is using. The theme can change under it, and did.
const contrast = await page.evaluate(() => {
  const parse = (value) => {
    const m = value.match(/[\d.]+/g);
    return m ? m.slice(0, 4).map(Number) : null;
  };
  const lum = ([r, g, b]) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const groundOf = (el) => {
    let node = el;
    while (node) {
      const rgba = parse(getComputedStyle(node).backgroundColor);
      if (rgba && (rgba.length < 4 || rgba[3] > 0.9)) return rgba.slice(0, 3);
      node = node.parentElement;
    }
    return [255, 255, 255];
  };
  const rows = [];
  const seen = new Set();
  const walker = document.createTreeWalker(
    document.querySelector(".gset"),
    NodeFilter.SHOW_TEXT,
  );
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const words = node.textContent.trim();
    if (!words) continue;
    const el = node.parentElement;
    if (!el || el.closest(".gset-sr")) continue;
    const style = getComputedStyle(el);
    const ink = parse(style.color);
    if (!ink) continue;
    const ground = groundOf(el);
    const a = lum(ink.slice(0, 3));
    const b = lum(ground);
    const ratio =
      (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const key = el.className + words.slice(0, 12);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      ratio: Math.round(ratio * 100) / 100,
      size: parseFloat(style.fontSize),
      weight: style.fontWeight,
      what: (el.className || el.tagName) + ": " + words.slice(0, 34),
    });
  }
  return rows.sort((x, y) => x.ratio - y.ratio);
});

const large = (row) =>
  row.size >= 24 || (row.size >= 18.66 && Number(row.weight) >= 700);
const failing = contrast.filter((row) => row.ratio < (large(row) ? 3 : 4.5));
console.log("\ncontrast, " + contrast.length + " distinct strings measured");
console.log("  worst three: " + contrast.slice(0, 3).map((r) => r.ratio + " " + r.what).join(" | "));
console.log(
  "  below the WCAG AA line: " +
    (failing.length
      ? failing.map((r) => r.ratio + " at " + r.size + "px " + r.what).join(" | ")
      : "none"),
);

// REACHABILITY, not one resting state. A page that scrolls always has something
// under fixed chrome at some scroll position. The question that matters is
// whether every control is fully clear of it at SOME position, so this sweeps
// the page in 60px steps and remembers the best each control ever managed.
const height = await page.evaluate(() => document.documentElement.scrollHeight);
const names = await page.evaluate(() =>
  [...document.querySelectorAll(".gset button, .gset a")].map(
    (el, i) => i + ": " + (el.textContent || el.tagName).trim().slice(0, 30),
  ),
);
const everClear = new Array(names.length).fill(false);

for (let y = 0; y <= height; y += 60) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(60);
  const clear = await page.evaluate(() =>
    [...document.querySelectorAll(".gset button, .gset a")].map((el) => {
      const box = el.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) return false;
      // Nine points across the control, so a half covered target still fails.
      for (const fx of [0.1, 0.5, 0.9]) {
        for (const fy of [0.15, 0.5, 0.85]) {
          const hit = document.elementFromPoint(
            box.left + box.width * fx,
            box.top + box.height * fy,
          );
          if (!hit || !(el.contains(hit) || hit.contains(el))) return false;
        }
      }
      return true;
    }),
  );
  clear.forEach((ok, i) => {
    if (ok) everClear[i] = true;
  });
}

const unreachable = names.filter((_, i) => !everClear[i]);
console.log(
  "\nreachability sweep, " + Math.ceil(height / 60) + " scroll positions, " +
    names.length + " controls",
);
console.log(
  "  never fully clear of the chrome: " +
    (unreachable.length ? unreachable.join(" | ") : "none"),
);

// The shared navbar, measured but not owned by this page.
const nav = await page.evaluate(() =>
  [...document.querySelectorAll(".nav button, .nav a")]
    .map((el) => {
      const box = el.getBoundingClientRect();
      return { text: (el.textContent || el.tagName).trim().slice(0, 20), w: Math.round(box.width), h: Math.round(box.height) };
    })
    .filter((row) => row.w > 0 && (row.w < 44 || row.h < 44)),
);
console.log("  shared navbar controls under 44px: " + JSON.stringify(nav));

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: "shots/goal-top.png" });
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(300);
await page.screenshot({ path: "shots/goal-bottom.png" });

// THE SETUP, DRIVEN.
await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole("button", { name: "Half", exact: true }).click();
await page.getByRole("button", { name: "Five minutes slower" }).click();
await page.getByRole("button", { name: "Fifteen seconds slower" }).click();
await page.getByRole("button", { name: "Threshold", exact: true }).click();
await page.getByRole("button", { name: "Asthma", exact: true }).click();
await page.waitForTimeout(250);

const state = await page.evaluate(() => ({
  distance: document.querySelectorAll(".gset-value")[0].textContent.trim(),
  goal: document.querySelectorAll(".gset-value")[1].textContent.trim(),
  opening: document.querySelectorAll(".gset-note")[0].textContent.trim(),
  softening: [...document.querySelectorAll(".gset-note")].pop().textContent.trim(),
  summary: document.querySelector(".gset-summary").textContent.trim(),
  stored: window.localStorage.getItem("afterburner.setup.v1"),
}));
console.log("\n--- after five presses ---");
console.log("distance:  " + state.distance);
console.log("goal:      " + state.goal);
console.log("opening:   " + state.opening);
console.log("softening: " + state.softening);
console.log("summary:   " + state.summary);
console.log("stored:    " + state.stored);

await page.screenshot({ path: "shots/goal-set.png" });

// THE HANDOFF.
await page.getByRole("button", { name: "Start the run" }).click();
await page.waitForTimeout(1600);

const run = await page.evaluate(() => {
  const text = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "missing";
  };
  return {
    url: window.location.pathname,
    ghostLabel: text(".abp-ghostLabel"),
    ghostPace: text(".abp-ghostValue"),
    strip: text(".abp-strip"),
    under: text(".abp-under"),
    prompt: text(".abp-toggle"),
    stillShowingSetupForm: Boolean(document.querySelector(".abp-setup")),
  };
});
console.log("\n--- the run the goal screen started ---");
console.log(JSON.stringify(run, null, 2));

await page.waitForTimeout(2500);
const later = await page.evaluate(() => {
  const el = document.querySelector(".abp-strip");
  return el ? el.textContent.replace(/\s+/g, " ").trim() : "missing";
});
console.log("strip 2.5 s later: " + later);

await page.screenshot({ path: "shots/pace-after-goal.png" });

// A cold arrival must NOT start a run by itself.
await page.goto(URL_BASE + "/pace", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const cold = await page.evaluate(() => ({
  showsSetupForm: Boolean(document.querySelector(".abp-setup")),
  strip: (document.querySelector(".abp-strip") || {}).textContent
    ? document.querySelector(".abp-strip").textContent.replace(/\s+/g, " ").trim()
    : "missing",
  prompt: (document.querySelector(".abp-toggle") || {}).textContent
    ? document.querySelector(".abp-toggle").textContent.replace(/\s+/g, " ").trim()
    : "missing",
  goalLink: Boolean(document.querySelector(".abp-goalLink")),
}));
console.log("\n--- opening /pace directly, with no press behind it ---");
console.log(JSON.stringify(cold, null, 2));
await page.screenshot({ path: "shots/pace-cold.png" });

console.log("\nconsole and page errors: " + (problems.length ? problems.join(" | ") : "none"));

await context.close();
