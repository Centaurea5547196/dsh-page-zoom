// Pre-flight: mimic the desktop generation's bundle resolution for
// dsh-page-zoom using the app's own compiled overlay resolver.
// Run: ELECTRON_RUN_AS_NODE=1 "DSH Desktop.exe" DEV-preflight.mjs
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve as pathResolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

// The desktop's compiled overlay resolver (exports: n/r/t).
const overlay = await import(
  "file:///D:/Program%20Files%20(x86)/DSH%20Desktop/resources/app.asar.unpacked/lib/package-overlay-CMBrTgnt.js"
);
const resolveOverlayPackage = overlay.r;

const INSTALL_ANCHOR = "D:/Program Files (x86)/DSH Desktop/resources/app.asar.unpacked/node_modules/dsh-plugin-desktop/lib/index.js";
const PROFILE_MANIFEST = "C:/Users/55471/.dsh/profiles/desktop/package.json";

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log("PASS", label);
  else { failures += 1; console.error("FAIL", label); }
};

// 1) resolve the bundle from the profile overlay
const resolved = resolveOverlayPackage("dsh-page-zoom", {
  installPackageUrl: pathToFileURL(INSTALL_ANCHOR).href,
  profilePackageUrl: pathToFileURL(PROFILE_MANIFEST).href
});
ok(resolved !== undefined && resolved.selected.packageDir.includes("profiles"), "overlay resolves dsh-page-zoom from profile: " + resolved?.selected?.packageDir);

// 2) manifest fields the desktop requires
const pkg = JSON.parse(readFileSync(resolved.selected.manifestPath, "utf8"));
ok(pkg.dsh?.bundle?.patch === "./cordis.patch.yml", "declares dsh.bundle.patch");
ok(pkg.dsh?.client?.platform === "web", "dsh.client.platform=web");
ok(pkg.exports?.["./client"] === "./client.js", "exports ./client");

// 3) patch file: top-level array with one insert row
const patchText = readFileSync(dirname(resolved.selected.manifestPath).replaceAll("\\", "/") + "/cordis.patch.yml", "utf8");
ok(patchText.includes("- insert:") && patchText.includes("id: dsh-page-zoom") && patchText.includes("name: dsh-page-zoom"), "cordis.patch.yml holds the insert row");

// 4) host entry loads and has the plugin face
const entry = await import(pathToFileURL(resolved.selected.manifestPath.replace(/package\.json$/u, "") + "index.js").href);
ok(entry.name === "dsh-page-zoom" && Array.isArray(entry.inject) && typeof entry.apply === "function", "host entry face {name,inject,apply}");

// 5) client bundle valid + registers the right id (executes registration only)
const clientCode = readFileSync(dirname(resolved.selected.manifestPath) + "/client.js", "utf8");
ok(/window\.__ModuleLoader__\.load\(\{[\s\S]*?id:\s*"dsh-page-zoom"/.test(clientCode), "client bundle registers id dsh-page-zoom");

// 6) manifest bundles/deps carry the entry exactly once
const manifest = JSON.parse(readFileSync(PROFILE_MANIFEST, "utf8"));
const bundleCount = (manifest.dsh.profile.bundles || []).filter((b) => b === "dsh-page-zoom").length;
ok(bundleCount === 1, "dsh.profile.bundles lists dsh-page-zoom exactly once");
ok(manifest.dependencies?.["dsh-page-zoom"] === "file:./dsh-page-zoom", "dependency declared as local file:");

console.log(failures === 0 ? "\nALL PREFLIGHT CHECKS PASSED" : `\n${failures} PREFLIGHT CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
