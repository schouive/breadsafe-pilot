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

createRoot(document.getElementById("root")!).render(<App />);
