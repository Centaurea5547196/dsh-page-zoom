/**
 * dsh-page-zoom — browser half.
 *
 * Page zoom for the DSH Web GUI: Ctrl+wheel and Ctrl+"=" / Ctrl+"-" /
 * Ctrl+"0" shortcuts, like Word and browsers. The zoom is a real page
 * zoom (`html{zoom}`) applied through a style tag that also keeps
 * full-height dialogs inside the window, and it persists in localStorage
 * per browser.
 *
 * Since v0.1.3 the floating zoom bar is HIDDEN by default (bar = false is
 * forced at load, so earlier localStorage values cannot bring it back) —
 * zoom runs entirely through Ctrl+wheel. The bar component, drag logic
 * and bounds clamping stay in the bundle, dormant, in case the bar is
 * ever re-enabled from the settings popup or a future toggle.
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
      "touch-action:none;cursor:grab;}",
      ".dpz-bar[data-dpz-drag]{cursor:grabbing;outline:2px solid var(--dsw-alias-state-business-primary,#4f6bed);outline-offset:1px;}",
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
      bar: false,
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
    // v0.1.3: the floating bar is hidden by design — zoom runs through
    // Ctrl+wheel (+ Ctrl+=/-/0). Force bar=false even if an older session
    // persisted bar:true. The bar code stays dormant so it can be
    // re-enabled from the settings popup or a future toggle.
    settings.bar = false;

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

    // -------------------------------------------------- drag scope + layout
    var DRAG_THRESHOLD = 4;
    var BAR_MARGIN = 4;

    /**
     * The rectangle the bar is allowed to live in, in viewport (visual)
     * coordinates. Priority: the desktop shell's conversation surface, then
     * the upstream conversation slot, then the overlay host minus sidebar /
     * details panels, then null (viewport fallback).
     */
    function getClampRect() {
      if (typeof document === "undefined") return null;
      var el = document.querySelector("main.dshDesktopConversationSurface");
      if (el === null || el === undefined) el = document.querySelector("[data-slot='conversation']");
      if (el !== null && el !== undefined) {
        var r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r;
      }
      var host = document.querySelector(".dshDesktopOverlay,[data-shell-overlay]");
      if (host !== null && host !== undefined) {
        var hr = host.getBoundingClientRect();
        if (hr.width > 0 && hr.height > 0) {
          var left = hr.left;
          var right = hr.right;
          var sidebar = document.querySelector(".dshDesktopSidebarSurface,[data-slot='sidebar']");
          if (sidebar !== null && sidebar !== undefined) left = Math.max(left, sidebar.getBoundingClientRect().right);
          var details = document.querySelector(".dshDesktopDetailsSurface,[data-slot='details']");
          if (details !== null && details !== undefined) right = Math.min(right, details.getBoundingClientRect().left);
          return { left: left, top: hr.top, right: right, bottom: hr.bottom };
        }
      }
      return null;
    }

    /**
     * Clamp a desired top-left (in visual coordinates) so that a bar of
     * w×h stays fully inside the allowed area.
     */
    function clampVisual(x, y, w, h) {
      var region = getClampRect();
      var minX, maxX, minY, maxY;
      if (region !== null && region.right - region.left > 0 && region.bottom - region.top > 0) {
        minX = region.left + BAR_MARGIN;
        maxX = Math.max(minX, region.right - BAR_MARGIN - w);
        minY = region.top + BAR_MARGIN;
        maxY = Math.max(minY, region.bottom - BAR_MARGIN - h);
      } else {
        minX = BAR_MARGIN;
        maxX = Math.max(minX, window.innerWidth - BAR_MARGIN - w);
        minY = BAR_MARGIN;
        maxY = Math.max(minY, window.innerHeight - BAR_MARGIN - h);
      }
      return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
    }

    /**
     * Plugin page zoom factor (visual px per style px). Our own html{zoom}
     * is the only zoom applied to this page, and applyZoom() always rewrites
     * it to settings.scale/100, so this is exact.
     */
    function zoomFactor() {
      var z = settings.scale / 100;
      return z > 0.01 && z < 100 ? z : 1;
    }

    /** Eat the click that follows a drag ended over a control. */
    function suppressNextClick() {
      var timer = 0;
      function cleanup() {
        if (timer !== 0) window.clearTimeout(timer);
        timer = 0;
        window.removeEventListener("click", onCapture, true);
      }
      function onCapture(event) {
        event.stopPropagation();
        event.preventDefault();
        cleanup();
      }
      timer = window.setTimeout(cleanup, 400);
      window.addEventListener("click", onCapture, true);
    }

    // ------------------------------------------------------------ component
    function ZoomBar() {
      var bump = react.useState(0);
      var setBump = bump[1];
      var [open, setOpen] = react.useState(false);
      var [editing, setEditing] = react.useState(false);
      var [draft, setDraft] = react.useState("");

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

      var style = {};
      if (settings.x !== null && settings.y !== null) {
        style.left = settings.x + "px";
        style.top = settings.y + "px";
        style.right = "auto";
      }
      return h("div", {
        className: "dpz-bar",
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

      // ------------------------------------------------------ drag + bounds
      // All runtime logic below uses only native DOM APIs: the host slot
      // renderer may not replay React synthetic events or effects, while a
      // capture pointerdown on document always observes the real pointer.
      var ST = typeof window.setTimeout === "function" ? window.setTimeout : function (fn) { return 0; };
      var RAFFN = typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame : function (fn) { return ST(fn, 16); };
      var CAF = typeof window.cancelAnimationFrame === "function" ? window.cancelAnimationFrame : function (id) {
        if (typeof window.clearTimeout === "function") window.clearTimeout(id);
      };
      var enforceRaf = 0;
      var activeDrag = null;
      var retryTimer = 0;

      function findBar() {
        if (typeof document.querySelector !== "function") return null;
        return document.querySelector(".dpz-bar");
      }
      function writePos(bar, bx, by) {
        bar.style.left = bx + "px";
        bar.style.top = by + "px";
        bar.style.right = "auto";
        try { bar.setAttribute("data-dpz-pos", Math.round(bx) + "," + Math.round(by)); } catch (err) { /* ignore */ }
      }

      // Keep the whole bar inside the conversation module: initial placement
      // and re-clamp on window / sidebar / details / zoom changes.
      function enforce() {
        enforceRaf = 0;
        try {
          var bar = findBar();
          if (bar === null || bar === undefined) return;
          var rect = bar.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          var zoom = zoomFactor();
          var region = getClampRect();
          var wantX, wantY;
          if (settings.x === null || settings.y === null) {
            // first placement: bottom-right of the conversation module
            wantX = region !== null ? region.right - rect.width - 16 * zoom : rect.left;
            wantY = region !== null ? region.bottom - rect.height - 16 * zoom : rect.top;
          } else {
            wantX = settings.x * zoom;
            wantY = settings.y * zoom;
          }
          var p = clampVisual(wantX, wantY, rect.width, rect.height);
          var sx = p.x / zoom;
          var sy = p.y / zoom;
          if (settings.x === null || settings.y === null ||
              Math.abs(sx - settings.x) > 0.5 || Math.abs(sy - settings.y) > 0.5) {
            settings.x = sx;
            settings.y = sy;
            saveSettings();
            writePos(bar, sx, sy);
            notify();
          }
        } catch (err) { /* bounds check must never break the bar */ }
      }
      function scheduleEnforce() {
        if (enforceRaf === 0) enforceRaf = RAFFN(enforce);
      }
      function cancelEnforce() {
        if (enforceRaf !== 0) {
          CAF(enforceRaf);
          enforceRaf = 0;
        }
      }

      // Drag the bar: a ≥4px move drags it (from anywhere on the bar,
      // including buttons), a short press still clicks the control.
      // Positions are written straight into the DOM, no re-render needed.
      function detachDrag(drag) {
        window.removeEventListener("pointermove", drag.onMove);
        window.removeEventListener("pointerup", drag.onUp);
        window.removeEventListener("pointercancel", drag.onUp);
        drag.bar.removeAttribute("data-dpz-drag");
      }
      function onDocumentPointerDown(event) {
        try {
          if (event.button !== 0) return;
          var target = event.target;
          if (target === null || target === undefined || typeof target.closest !== "function") return;
          if (target.closest("input,select,.dpz-pop") !== null) return;
          var bar = target.closest(".dpz-bar");
          if (bar === null) return;
          if (activeDrag !== null) detachDrag(activeDrag);
          var rect = bar.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          var offsetX = event.clientX - rect.left;
          var offsetY = event.clientY - rect.top;
          var startX = event.clientX;
          var startY = event.clientY;
          var dragging = false;
          var zoom = zoomFactor();
          function onMove(e) {
            try {
              if (e.buttons === 0) { onUp(); return; } // released outside the window — self-heal
              if (!dragging) {
                if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD && Math.abs(e.clientY - startY) < DRAG_THRESHOLD) return;
                dragging = true;
                bar.setAttribute("data-dpz-drag", "");
                try { bar.setPointerCapture(e.pointerId); } catch (err) { /* window listeners cover it */ }
                e.preventDefault();
              }
              var p = clampVisual(e.clientX - offsetX, e.clientY - offsetY, rect.width, rect.height);
              settings.x = p.x / zoom;
              settings.y = p.y / zoom;
              saveSettings();
              writePos(bar, settings.x, settings.y);
              notify();
            } catch (err) { /* one bad frame must not kill the drag */ }
          }
          function onUp() {
            if (activeDrag !== null) {
              var wasDragging = dragging;
              detachDrag(activeDrag);
              activeDrag = null;
              if (wasDragging) suppressNextClick();
            }
          }
          activeDrag = { onMove: onMove, onUp: onUp, bar: bar };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
          window.addEventListener("pointercancel", onUp);
        } catch (err) { /* a failed press must never break the app */ }
      }
      if (typeof document.addEventListener === "function") {
        document.addEventListener("pointerdown", onDocumentPointerDown, true);
      }

      // placement + re-clamp triggers
      scheduleEnforce();
      var off = subscribe(scheduleEnforce);
      if (typeof window.addEventListener === "function") {
        window.addEventListener("resize", scheduleEnforce);
      }
      var regionObserver = null;
      var observeRetries = 0;
      function tryObserve() {
        if (regionObserver !== null || observeRetries >= 10) return;
        observeRetries += 1;
        try {
          var target = document.querySelector("main.dshDesktopConversationSurface,[data-slot='conversation'],.dshDesktopOverlay,[data-shell-overlay]");
          if (target !== null && target !== undefined && typeof window.ResizeObserver === "function") {
            regionObserver = new window.ResizeObserver(scheduleEnforce);
            regionObserver.observe(target);
            return;
          }
        } catch (err) { /* fall through to retry / skip */ }
        retryTimer = ST(tryObserve, 500);
      }
      tryObserve();

      // floating bar through the shell overlay slot when available
      var slots = ctx && ctx.slots;
      var slotRegistered = false;
      if (slots) {
        try {
          slotRegistered = true;
          slots.inject("shell.overlay", function () {
            scheduleEnforce(); // bar may mount/unmount with the overlay render
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
            if (typeof document.removeEventListener === "function") {
              document.removeEventListener("pointerdown", onDocumentPointerDown, true);
            }
            window.removeEventListener("resize", scheduleEnforce);
            off();
            cancelEnforce();
            if (regionObserver !== null) {
              try { regionObserver.disconnect(); } catch (err) { /* ignore */ }
            }
            if (retryTimer !== 0) window.clearTimeout(retryTimer);
            if (activeDrag !== null) detachDrag(activeDrag);
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
