/**
 * dsh-page-zoom — host half.
 *
 * The row identity lives here so the bundle can be composed as a regular
 * host plugin (the desktop generation requires every profile bundle to
 * declare `dsh.bundle.patch`). All user-facing functionality is implemented
 * in the client bundle (`./client.js`, served at /plugins/dsh-page-zoom/
 * client.js and booted by the Web GUI): floating zoom bar, Ctrl+wheel and
 * Ctrl+"="/"-"/"0" shortcuts, persistence in localStorage.
 */
export const name = "dsh-page-zoom";
export const inject = [];
export function apply() {
  // Deliberately host-inert: nothing to run on the Node side.
}
