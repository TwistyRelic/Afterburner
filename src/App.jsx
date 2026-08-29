import { Route, Routes } from "react-router-dom";
import { RunProvider } from "./RunContext.jsx";
import Shell from "./Shell.jsx";
import Public from "./Public.jsx";
import Live from "./pages/Live.jsx";
import Breath from "./pages/Breath.jsx";
import Phase from "./pages/Phase.jsx";
import Sessions from "./pages/Sessions.jsx";
import Account from "./pages/Account.jsx";
import Settings from "./pages/Settings.jsx";
import Home from "./pages/Home.jsx";
import Features from "./pages/Features.jsx";
import Pricing from "./pages/Pricing.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  return (
    <RunProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Live />} />
          <Route path="/breath" element={<Breath />} />
          <Route path="/phase" element={<Phase />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/account" element={<Account />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route element={<Public />}>
          <Route path="/home" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
        </Route>
      </Routes>
    </RunProvider>
  );
}
