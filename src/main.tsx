import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Register custom push service worker alongside PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw-push.js").catch((err) => {
    console.log("Push SW registration skipped:", err);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
