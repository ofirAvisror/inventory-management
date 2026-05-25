import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminProvider } from "./contexts/AdminContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { ToastProvider } from "./contexts/ToastContext.tsx";
import App from "./App.tsx";
import "./i18n";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AdminProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
