/**
 * dsh-page-zoom — browser half.
 *
 * A floating zoom bar for the DSH Web GUI (like a PDF viewer toolbar):
 *   − / slider / + / percentage / fit-width / reset / options,
 * plus Ctrl+wheel and Ctrl+"=" / Ctrl+"-" / Ctrl+"0" shortcuts,
 * like Word and browsers. The zoom is a real page zoom (`html{zoom}`)
 * applied through a style tag that also keeps full-height dialogs inside
 * the window, and it persists in localStorage per browser.
 *
 * Written in the lazy-CJS bundle protocol (window.__ModuleLoader__.load),
 * so no build step and no imports from dsh client packages — only the
 * platform `react` seed word is required.
 */
window.__ModuleLoader__.load({
  id: "dsh-page-zoom",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var react = require("react");
    var h = react.createElement;

    // ---------------------------------------------------------------- CSS
    var COMPONENT_CSS = [
      ".dpz-bar{position:fixed;bottom:16px;right:16px;z-index:2147483646;display:flex;align-items:center;gap:6px;",
      "box-sizing:border-box;padding:5px 8px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1,#d5d5da);",
      "background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.96));box-shadow:0 4px 16px rgba(0,0,0,.14);",
      "user-select:none;font:12px/1 system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--dsw-alias-label-primary,#1f2229);",
      "touch-action:none;}",
      ".dpz-bar button{all:unset;box-sizing:border-box;min-width:24px;height:24px;padding:0 4px;display:inline-flex;",
      "align-items:center;justify-content:center;border-radius:6px;cursor:pointer;color:inherit;",
      "font:inherit;text-align:center;}",
      ".dpz-bar button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));}",
      ".dpz-bar button:active{transform:translateY(1px);}",
      ".dpz-bar .dpz-pct{min-width:52px;font-variant-numeric:tabular-nums;}",
      ".dpz-bar .dpz-pctinput{width:56px;height:24px;border:1px solid var(--dsw-alias-border-l2,#c9c9cf);border-radius:6px;",
      "padding:0 4px;text-align:right;font:inherit;background:var(--dsw-alias-bg-base,#fff);color:inherit;outline:none;}",
      ".dpz-bar input[type=range]{width:140px;height:4px;accent-color:var(--dsw-alias-state-business-primary,#4f6bed);cursor:pointer;}",
      ".dpz-bar .dpz-pop{position:absolute;top:calc(100% + 6px);right:0;z-index:2147483646;width:220px;box-sizing:border-box;",
      "padding:10px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1,#d5d5da);",
      "background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.98));box-shadow:0 8px 24px rgba(0,0,0,.18);color:var(--dsw-alias-label-primary,#1f2229);}",
      ".dpz-bar .dpz-pop h4{margin:0 0 6px;font-size:12px;font-weight:700;}",
      ".dpz-bar .dpz-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:6px 0;}",
      ".dpz-bar .dpz-row label{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;}",
      ".dpz-bar .dpz-row select{max-width:110px;}",
      ".dpz-bar .dpz-link{all:unset;cursor:pointer;font-size:12px;color:var(--dsw-alias-state-business-primary,#4f6bed);}",
      ".dpz-bar .dpz-link:hover{text-decoration:underline;}",
      ".dpz-bar .dpz-sep{width:1px;height:16px;background:var(--dsw-alias-border-l1,#d5d5da);}"
    ].join("");
    var COMPONENT_CSS_ID = "dsh-page-zoom/client.css";
    if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + COMPONENT_CSS_ID + '"]') === null) {
      var styleTag = document.createElement("style");
      styleTag.setAttribute("data-plugin", "dsh-page-zoom");
      styleTag.setAttribute("data-plugin-css", COMPONENT_CSS_ID);
      styleTag.textContent = COMPONENT_CSS;
      document.head.appendChild(styleTag);
    }

    // ---------------------------------------------------------- persistence
    var SETTINGS_KEY = "dsh-page-zoom:v1";
    var MIN = 25;
    var MAX = 300;
    var DEFAULTS = {
      scale: 100,
      wheel: true,
      keys: true,
      bar: true,
      step: 5,
      x: null,
      y: null
    };

    function clamp(value) {
      var num = Number(value);
      if (!Number.isFinite(num)) return DEFAULTS.scale;
      return Math.max(MIN, Math.min(MAX, num));
    }
    function loadSettings() {
      var merged = {};
      var key;
      for (key in DEFAULTS) merged[key] = DEFAULTS[key];
      try {
        var raw = window.localStorage.getItem(SETTINGS_KEY);
        if (raw !== null && raw !== "") {
          var parsed = JSON.parse(raw);
          if (parsed !== null && typeof parsed === "object") {
            for (key in DEFAULTS) if (key in parsed && parsed[key] !== null && parsed[key] !== undefined) merged[key] = parsed[key];
          }
        }
      } catch (err) { /* localStorage unavailable — defaults only */ }
      merged.scale = Math.round(clamp(merged.scale));
      merged.step = [1, 5, 10, 20].indexOf(Number(merged.step)) >= 0 ? Number(merged.step) : 5;
      return merged;
    }
    function saveSettings() {
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (err) { /* ignore quota/availability */ }
    }
    var settings = loadSettings();

    // -------------------------------------------------------------- zoom core
    var ZOOM_CSS_ID = "dsh-page-zoom/zoom.css";
    var listeners = [];
    function subscribe(fn) {
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    }
    function notify() {
      for (var i = 0; i < listeners.length; i += 1) {
        try { listeners[i](); } catch (err) { /* listener errors must not break zoom */ }
      }
    }
    function writeZoomStyle(factor) {
      var existing = document.querySelector('style[data-plugin-css="' + ZOOM_CSS_ID + '"]');
      if (existing !== null) existing.remove();
      var tag = document.createElement("style");
      tag.setAttribute("data-plugin", "dsh-page-zoom");
      tag.setAttribute("data-plugin-css", ZOOM_CSS_ID);
      // html{zoom} reflows like a browser page zoom. Full-height overlays
      // (dialogs, drawers) use vh units and would overflow the window when
      // zoomed in — counter-scale their max-height so they stay inside.
      tag.textContent =
        "html{zoom:" + factor + "}" +
        "html,body{overflow:auto !important}" +
        "[data-dsh-modal],[role=\"dialog\"],[data-dsh-overlay],.dsh-modal,.dsh-dialog{" +
        "max-height:calc(100vh / " + factor + ") !important;height:auto !important;overflow-y:auto !important}";
      document.head.appendChild(tag);
    }
    function applyZoom(value) {
      var scale = Math.round(clamp(value));
      settings.scale = scale;
      if (typeof document !== "undefined") writeZoomStyle(scale / 100);
      saveSettings();
      notify();
    }
    function zoomBy(delta) {
      applyZoom(settings.scale + Number(delta));
    }
    function resetZoom() {
      applyZoom(100);
    }

    // ------------------------------------------------------------- component
    function ZoomBar() {
      var bump = react.useState(0);
      var setBump = bump[1];
      var [open, setOpen] = react.useState(false);
      var [editing, setEditing] = react.useState(false);
      var [draft, setDraft] = react.useState("");
      var barRef = react.useRef(null);

      react.useEffect(function () {
        return subscribe(function () { setBump(function (n) { return n + 1; }); });
      }, []);

      function setField(patch) {
        var key;
        for (key in patch) settings[key] = patch[key];
        saveSettings();
        notify();
      }
      function commitPct() {
        setEditing(false);
        var value = Number(draft);
        if (Number.isFinite(value) && value > 0) applyZoom(value);
      }
      function onPointerDown(event) {
        if (event.button !== 0) return;
        var target = event.target;
        if (target && typeof target.closest === "function" && target.closest("button,input,select")) return;
        var bar = barRef.current;
        if (bar === null || bar === undefined) return;
        var rect = bar.getBoundingClientRect();
        var offsetX = event.clientX - rect.left;
        var offsetY = event.clientY - rect.top;
        var MOVE = "pointermove", UP = "pointerup";
        function onMove(e) {
          var maxX = Math.max(8, window.innerWidth - 40);
          var maxY = Math.max(8, window.innerHeight - 20);
          settings.x = Math.max(4, Math.min(maxX, e.clientX - offsetX));
          settings.y = Math.max(4, Math.min(maxY, e.clientY - offsetY));
          saveSettings();
          notify();
        }
        function onUp() {
          window.removeEventListener(MOVE, onMove);
          window.removeEventListener(UP, onUp);
        }
        window.addEventListener(MOVE, onMove);
        window.addEventListener(UP, onUp);
        event.preventDefault();
      }

      var style = {};
      if (settings.x !== null && settings.y !== null) {
        style.left = settings.x + "px";
        style.top = settings.y + "px";
        style.right = "auto";
      }
      return h("div", {
        className: "dpz-bar",
        ref: barRef,
        onPointerDown: onPointerDown,
        "data-dpz": "bar"
      },
        h("button", { title: "缩小 (Ctrl+-)", onClick: function () { zoomBy(-settings.step); } }, "\u2212"),
        h("input", {
          type: "range", min: String(MIN), max: String(MAX), step: "1",
          value: String(settings.scale),
          onChange: function (e) { applyZoom(Number(e.target.value)); },
          title: "缩放比例"
        }),
        h("button", { title: "放大 (Ctrl+=)", onClick: function () { zoomBy(settings.step); } }, "+"),
        editing
          ? h("input", {
              className: "dpz-pctinput",
              type: "number", min: String(MIN), max: String(MAX), step: "1",
              value: draft,
              autoFocus: true,
              onChange: function (e) { setDraft(e.target.value); },
              onBlur: commitPct,
              onKeyDown: function (e) { if (e.key === "Enter") commitPct(); if (e.key === "Escape") setEditing(false); }
            })
          : h("button", {
              className: "dpz-pct",
              title: "当前比例，点击输入数值",
              onClick: function () { setDraft(String(settings.scale)); setEditing(true); }
            }, String(settings.scale) + "%"),
        h("span", { className: "dpz-sep" }),
        h("button", { title: "重置 100% (Ctrl+0)", onClick: resetZoom }, "\u21ba"),
        h("button", { title: "设置", onClick: function () { setOpen(!open); } }, "\u2699"),
        open
          ? h("div", { className: "dpz-pop" },
              h("h4", null, "页面缩放设置"),
              h("div", { className: "dpz-row" },
                h("label", null, h("input", { type: "checkbox", checked: settings.wheel !== false, onChange: function (e) { setField({ wheel: e.target.checked }); } }), " Ctrl+滚轮 缩放")
              ),
              h("div", { className: "dpz-row" },
                h("label", null, h("input", { type: "checkbox", checked: settings.keys !== false, onChange: function (e) { setField({ keys: e.target.checked }); } }), " Ctrl+= / - / 0 快捷键")
              ),
              h("div", { className: "dpz-row" },
                h("label", null, h("input", { type: "checkbox", checked: settings.bar !== false, onChange: function (e) { setField({ bar: e.target.checked }); } }), " 显示悬浮栏")
              ),
              h("div", { className: "dpz-row" },
                h("label", null, "步进"),
                h("select", { value: String(settings.step), onChange: function (e) { setField({ step: Number(e.target.value) }); } },
                  h("option", { value: "1" }, "1%"),
                  h("option", { value: "5" }, "5%"),
                  h("option", { value: "10" }, "10%"),
                  h("option", { value: "20" }, "20%")
                )
              ),
              h("div", { className: "dpz-row" },
                h("span", { className: "dpz-link", onClick: function () {
                  var key;
                  for (key in DEFAULTS) settings[key] = DEFAULTS[key];
                  saveSettings();
                  notify();
                } }, "恢复默认设置")
              )
            )
          : null
      );
    }

    // ------------------------------------------------------------ plugin face
    var inject = ["slots"];

    function apply(ctx) {
      // keyboard + wheel shortcuts
      function onWheel(event) {
        if (settings.wheel === false) return;
        if (!event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        var dir = event.deltaY === 0 ? 0 : event.deltaY < 0 ? 1 : -1;
        if (dir !== 0) zoomBy(dir * settings.step);
      }
      function onKeyDown(event) {
        if (settings.keys === false) return;
        if (event.altKey) return;
        if (!event.ctrlKey && !event.metaKey) return;
        var key = event.key;
        if (key === "=" || key === "+") {
          event.preventDefault();
          zoomBy(settings.step);
        } else if (key === "-" || key === "_") {
          event.preventDefault();
          zoomBy(-settings.step);
        } else if (key === "0") {
          event.preventDefault();
          applyZoom(100);
        }
      }
      window.addEventListener("wheel", onWheel, { capture: true, passive: false });
      window.addEventListener("keydown", onKeyDown, true);

      // floating bar through the shell overlay slot when available
      var slots = ctx && ctx.slots;
      var slotRegistered = false;
      if (slots) {
        try {
          slotRegistered = true;
          slots.inject("shell.overlay", function () {
            return slots.register({
              name: "shell.overlay",
              id: "dsh-page-zoom",
              order: 250,
              inject: function () { return {}; }
            }, function () { return settings.bar === false ? null : h(ZoomBar); });
          });
        } catch (error) {
          slotRegistered = false;
          console.warn("[dsh-page-zoom] shell.overlay unavailable, bar hidden; shortcuts still active:", error);
        }
      }
      if (!slotRegistered) console.warn("[dsh-page-zoom] no slots service — bar hidden; shortcuts still active");

      // initial zoom (persisted)
      applyZoom(settings.scale);

      // cleanup on plugin disposal
      if (typeof ctx.effect === "function") {
        ctx.effect(function () {
          return function () {
            window.removeEventListener("wheel", onWheel, { capture: true });
            window.removeEventListener("keydown", onKeyDown, true);
            var zoomTag = document.querySelector('style[data-plugin-css="' + ZOOM_CSS_ID + '"]');
            if (zoomTag !== null) zoomTag.remove();
          };
        }, "dsh-page-zoom: listeners and zoom style");
      }
    }

    exports.name = "dsh-page-zoom";
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
