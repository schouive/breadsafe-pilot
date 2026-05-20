import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateServiceWorker(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => registration.update(), 60 * 60 * 1000);
    }
  },
});

// Auto-recover from stale chunk references after a new deploy.
// When lazy-loaded chunks 404 (old index.html cached referencing removed hashed files),
// the browser throws "Importing a module script failed" / "Failed to fetch dynamically imported module".
// We force a one-time hard reload to pick up the fresh index.html + chunks.
const RELOAD_FLAG = "__chunk_reload__";
function handleChunkLoadError(message: string) {
  if (!/Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(message)) {
    return;
  }
  try {
    const already = sessionStorage.getItem(RELOAD_FLAG);
    if (already) return;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    // ignore storage errors
  }
  window.location.reload();
}

window.addEventListener("error", (e) => {
  handleChunkLoadError(e?.message || "");
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = (e?.reason && (e.reason.message || String(e.reason))) || "";
  handleChunkLoadError(msg);
});

// Clear the reload guard on a successful app boot.
try {
  sessionStorage.removeItem(RELOAD_FLAG);
} catch {
  // ignore
}

createRoot(document.getElementById("root")!).render(<App />);
