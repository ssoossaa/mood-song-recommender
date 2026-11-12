import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/geist/index.css"
import "@fontsource-variable/geist-mono/index.css"
import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "./lib/theme-context"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
