// Dev harness: materialize client.js with stubbed platform to verify the
// bundle protocol, zoom engine, wheel/key handlers and slot registration.
// Run: ELECTRON_RUN_AS_NODE=1 "DSH Desktop.exe" DEV-mock-test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const dir = dirname(fileURLToPath(import.meta.url));

let failures = 0;
function ok(cond, label) {
  if (cond) console.log("  PASS", label);
  else { failures += 1; console.error("  FAIL", label); }
}

// --- document stub ---------------------------------------------------------
function makeElement(attrs) {
  return {
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = String(value); },
    remove() { const i = head.children.indexOf(this); if (i >= 0) head.children.splice(i, 1); },
    textContent: "",
    appendChild() {}
  };
}
function extractCssId(selector) {
  const m = /data-plugin-css="([^"]+)"/.exec(selector);
  return m === null ? null : m[1];
}
const head = { children: [], appendChild(tag) { head.children.push(tag); } };
const document = {
  head,
  querySelector(sel) {
    const id = extractCssId(sel);
    if (id === null) return null;
    for (const tag of head.children) if (tag.attrs["data-plugin-css"] === id) return tag;
    return null;
  },
  createElement() { return makeElement(); },
  querySelectorAny() { return null; },
  body: { clientWidth: 1200 }
};

// --- window stub -----------------------------------------------------------
const listeners = {};
const localStorageState = {};
const window = {
  localStorage: {
    getItem(k) { return Object.prototype.hasOwnProperty.call(localStorageState, k) ? localStorageState[k] : null; },
    setItem(k, v) { localStorageState[k] = String(v); }
  },
  innerWidth: 1600,
  innerHeight: 900,
  addEventListener(type, fn, opts) {
    listeners[type] = listeners[type] || [];
    listeners[type].push({ fn, opts });
  },
  removeEventListener(type, fn, opts) {
    const arr = listeners[type] || [];
    const i = arr.findIndex((e) => e.fn === fn);
    if (i >= 0) arr.splice(i, 1);
  }
};
globalThis.window = window;
globalThis.document = document;

// --- react stub ------------------------------------------------------------
const React = {
  createElement(type, props, ...children) { return { type, props: props || {}, children }; },
  useState(init) {
    let state = init;
    const set = (next) => { state = typeof next === "function" ? next(state) : next; };
    return [state, set];
  },
  useEffect(fn) { const cleanup = fn(); if (typeof cleanup === "function") cleanup(); },
  useRef(init) { return { current: init }; }
};
const requireShim = (spec) => {
  if (spec === "react") return React;
  throw new Error("unexpected require: " + spec);
};

// --- load bundle -----------------------------------------------------------
let captured = null;
window.__ModuleLoader__ = { load(reg) { captured = reg; } };
const code = readFileSync(join(dir, "client.js"), "utf8");
new Function("window", code)(window);
ok(captured !== null && captured.id === "dsh-page-zoom", "bundle registered with id dsh-page-zoom");
ok(typeof captured.factory === "function", "factory is a function");

const face = captured.factory(requireShim);
ok(face.name === "dsh-page-zoom", "face.name");
ok(Array.isArray(face.inject) && face.inject[0] === "slots", "face.inject=[slots]");
ok(typeof face.apply === "function", "face.apply");
ok(document.querySelector('style[data-plugin-css="dsh-page-zoom/client.css"]') !== null, "component css injected");

// --- apply with stub ctx ---------------------------------------------------
const registered = [];
const slots = {
  inject(name, cb) { slots.cb = cb; },
  register(opts, comp) { registered.push({ opts, comp }); return function dispose() {}; }
};
const ctx = {
  slots,
  effect(fn) { ctx.cleanup = fn(); }
};
face.apply(ctx);
slots.cb(); // the slot runtime invokes the inject callback at outlet render
ok(registered.length === 1, "slot entry registered");
ok(registered[0].opts.name === "shell.overlay" && registered[0].opts.id === "dsh-page-zoom", "slot name/id");

// initial zoom applied (default 100)
let zoomTag = document.querySelector('style[data-plugin-css="dsh-page-zoom/zoom.css"]');
ok(zoomTag !== null && /html\{zoom:1\}/.test(zoomTag.textContent), "initial zoom style html{zoom:1}");

// wheel: ctrl + up => +5
const wheel = listeners.wheel[0];
let prevented = 0;
wheel.fn({ ctrlKey: true, deltaY: -1, preventDefault() { prevented += 1; } });
zoomTag = document.querySelector('style[data-plugin-css="dsh-page-zoom/zoom.css"]');
ok(prevented === 1 && /html\{zoom:1.05\}/.test(zoomTag.textContent), "ctrl+wheel up => zoom 105%");
ok(JSON.parse(window.localStorage.getItem("dsh-page-zoom:v1")).scale === 105, "scale persisted");

// key: ctrl+0 => reset
const key = listeners.keydown[0];
key.fn({ ctrlKey: true, key: "0", preventDefault() { prevented += 1; } });
zoomTag = document.querySelector('style[data-plugin-css="dsh-page-zoom/zoom.css"]');
ok(/html\{zoom:1\}/.test(zoomTag.textContent), "ctrl+0 => zoom 100%");

// key: ctrl+- => -5
key.fn({ ctrlKey: true, key: "-", preventDefault() {} });
zoomTag = document.querySelector('style[data-plugin-css="dsh-page-zoom/zoom.css"]');
ok(/html\{zoom:0.95\}/.test(zoomTag.textContent), "ctrl+- => zoom 95%");

// non-ctrl wheel must not zoom
const beforeSaved = window.localStorage.getItem("dsh-page-zoom:v1");
wheel.fn({ ctrlKey: false, deltaY: -1, preventDefault() {} });
ok(window.localStorage.getItem("dsh-page-zoom:v1") === beforeSaved, "plain wheel ignored");

// component renders for a fake React render surface
const RenderComp = registered[0].comp;
const element = React.createElement(RenderComp, {});
ok(element.type !== null && element.type !== undefined, "bar component type resolves");

// cleanup removes zoom tag
ctx.cleanup();
zoomTag = document.querySelector('style[data-plugin-css="dsh-page-zoom/zoom.css"]');
ok(zoomTag === null, "cleanup removes zoom style");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
