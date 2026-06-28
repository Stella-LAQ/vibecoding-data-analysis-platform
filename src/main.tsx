import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "react-hot-toast";
import "./index.css";
import { TRPCProvider } from "@/providers/trpc";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <TRPCProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />
    </TRPCProvider>
  </BrowserRouter>
);
