import "./imports.css";
import "./index.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n";
import { registerServiceWorker } from "./services/pwaService";
import { preloadStaticData } from "./services/db/staticDataService";

registerServiceWorker();

// Fire-and-forget: loads companies, industries, roles from Supabase into the
// in-memory cache so all synchronous getters (getCompanySync etc.) work
// instantly. Falls back to bundled TypeScript arrays if Supabase is offline.
preloadStaticData().catch(() => { /* fallback already handled inside */ });

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </I18nProvider>
);
