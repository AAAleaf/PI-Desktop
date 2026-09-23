import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), "utf8");

const protocol = read("../../../packages/shared/src/protocol.ts");
const workspaceIpc = read("../electron/main/ipc/workspace-ipc.ts");
const api = read("../src/lib/api.ts");
const filesTab = read("../src/components/workpanel/FilesTab.tsx");
const en = read("../../../packages/i18n/src/locales/en/index.ts");

// The file viewer header keeps the back-to-list button and exposes exactly
// four file actions: edit (system default app), open in browser, reveal in
// the file manager, and refresh. Source-contract style like the neighbors.
test("open-in-browser rides its own gated channel", () => {
  assert.match(protocol, /fsOpenInBrowser:\s*"pi-desktop\/fs\/openInBrowser"/);
  assert.match(
    workspaceIpc,
    /handle\(IPC\.invoke\.fsOpenInBrowser[\s\S]*?resolveOpenablePath\(/,
  );
  // The browser gets a file URL through the same allowed-roots gate as
  // fsOpen; shell.openPath stays the default-app path.
  assert.match(workspaceIpc, /pathToFileURL\(stripWinLongPrefix\(target\)\)\.href/);
  assert.match(api, /fsOpenInBrowser:\s*\(path: string\)\s*=>\s*\n?\s*invoke\(IPC\.invoke\.fsOpenInBrowser/);
});

test("the viewer header wires the four actions and keeps the file list button", () => {
  // Back to the tree stays first.
  assert.match(filesTab, /t\("panel\.files\.back"\)/);
  assert.match(filesTab, /t\("panel\.files\.edit"\)\s*[\s\S]*?api\.fsOpen\(/);
  assert.match(filesTab, /t\("panel\.files\.openInBrowser"\)\s*[\s\S]*?api\.fsOpenInBrowser\(/);
  assert.match(filesTab, /t\("panel\.files\.reveal"\)\s*[\s\S]*?api\.fsReveal\(/);
  // Refresh re-reads the open file rather than navigating away.
  assert.match(filesTab, /t\("panel\.files\.refresh"\)\s*[\s\S]*?openFile\(selected\)/);
});

test("the four action labels are localized", () => {
  const filesBlock = en.match(/files: \{[\s\S]*?\n    \},/)?.[0] ?? "";
  assert.match(filesBlock, /edit: "Edit"/);
  assert.match(filesBlock, /openInBrowser: "Open in browser"/);
  assert.match(filesBlock, /refresh: "Refresh"/);
});
