import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import TranslatorPage from "./pages/TranslatorPage";
import LearnPage from "./pages/LearnPage";
import GamePage from "./pages/GamePage";
import AuthPage from "./pages/AuthPage";
import AITutorPage from "./pages/AITutorPage";
import SpellNamePage from "./pages/SpellNamePage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/translator" element={<TranslatorPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/ai-tutor" element={<AITutorPage />} />
          <Route path="/spell-name" element={<SpellNamePage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
