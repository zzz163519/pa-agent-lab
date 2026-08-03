import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ResearchConsoleApp } from "./app/research-console-app.tsx";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("Research Console root element is missing");

createRoot(root).render(
  <StrictMode>
    <ResearchConsoleApp />
  </StrictMode>,
);
