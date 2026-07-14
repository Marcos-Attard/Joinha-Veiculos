import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type ReactNode, useEffect, useState } from "react";

import Index from "./pages/Index";
import Inventory from "./pages/Inventory";
import Leads from "./pages/Leads";
import Showroom from "./pages/Showroom";
import BankIntegrations from "./pages/BankIntegrations";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import BuscarVeiculo from "./pages/BuscarVeiculo";
import Vendedores from "./pages/Vendedores";
import Gerentes from "./pages/Gerentes";
import TrocarSenha from "./pages/TrocarSenha";
import DashboardLayout from "./components/DashboardLayout";

const queryClient = new QueryClient();

const isAuthenticated = () => {
  return localStorage.getItem("is_authenticated") === "true";
};

const needsPasswordChange = () => {
  const force = localStorage.getItem("force_change_password") === "true";
  const role = String(localStorage.getItem("auth_role") || "")
    .trim()
    .toLowerCase();
  return force && (role === "vendedor" || role === "gerente");
};

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (needsPasswordChange()) {
    return <Navigate to="/trocar-senha" replace />;
  }

  return children;
};

const RequireLojista = ({ children }: { children: JSX.Element }) => {
  const role = String(localStorage.getItem("auth_role") || "")
    .trim()
    .toLowerCase();
  const allowedRoles = ["lojista", "gerente", "admin", "adm", "administrador"];

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (needsPasswordChange()) {
    return <Navigate to="/trocar-senha" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RequireOwnerAdmin = ({ children }: { children: JSX.Element }) => {
  const role = String(localStorage.getItem("auth_role") || "")
    .trim()
    .toLowerCase();
  const allowedRoles = ["lojista", "admin", "adm", "administrador"];

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (needsPasswordChange()) {
    return <Navigate to="/trocar-senha" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RequirePasswordChange = ({ children }: { children: JSX.Element }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!needsPasswordChange()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ClosedScreen = () => {
  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-zinc-100 font-extrabold uppercase tracking-[0.22em] text-3xl sm:text-4xl md:text-5xl leading-tight">
          MINIMIZE A TELA
          <br />
          E DESLIZE PARA CIMA
        </div>
      </div>
    </div>
  );
};

const StaffShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/fechado", { replace: true });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair do Supabase:", error);
    } finally {
      localStorage.removeItem("is_authenticated");
      localStorage.removeItem("user_id");
      localStorage.removeItem("auth_role");
      localStorage.removeItem("auth_nome");
      localStorage.removeItem("vendedor_id");
      localStorage.removeItem("force_change_password");
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="fixed top-4 right-4 z-[9999] flex gap-2">
        <Button
          onClick={handleClose}
          className="border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white active:bg-zinc-700"
        >
          <X size={16} className="mr-2" />
          Fechar
        </Button>

        <Button
          onClick={handleLogout}
          className="border border-zinc-700 bg-black text-white hover:bg-zinc-800 hover:text-white active:bg-zinc-700"
        >
          <LogOut size={16} className="mr-2" />
          Sair
        </Button>
      </div>

      <DashboardLayout>{children}</DashboardLayout>
    </div>
  );
};

const StoreShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [showCloseButton, setShowCloseButton] = useState(false);

  const handleClose = () => {
    navigate("/loja-fechada", { replace: true });
  };

  useEffect(() => {
    const checkIfIsHomeScreen = () => {
      const pageText = document.body.innerText || "";

      const isHomeScreen =
        pageText.includes("SEJA BEM-VINDO À LOJA") ||
        pageText.includes("FALAR COM NOSSO AGENTE");

      setShowCloseButton(isHomeScreen);
    };

    checkIfIsHomeScreen();

    const observer = new MutationObserver(() => {
      checkIfIsHomeScreen();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {showCloseButton && (
        <div className="fixed top-4 right-4 z-[9999]">
          <Button
            onClick={handleClose}
            className="border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white active:bg-zinc-700"
          >
            <X size={16} className="mr-2" />
            Fechar
          </Button>
        </div>
      )}

      {children}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <StoreShell>
                <Showroom />
              </StoreShell>
            }
          />

          <Route path="/loja-fechada" element={<ClosedScreen />} />

          <Route path="/login" element={<Login />} />

          <Route path="/fechado" element={<ClosedScreen />} />

          <Route
            path="/trocar-senha"
            element={
              <RequirePasswordChange>
                <TrocarSenha />
              </RequirePasswordChange>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <StaffShell>
                  <Index />
                </StaffShell>
              </RequireAuth>
            }
          />

          <Route
            path="/estoque"
            element={
              <RequireLojista>
                <StaffShell>
                  <Inventory />
                </StaffShell>
              </RequireLojista>
            }
          />

          <Route
            path="/leads"
            element={
              <RequireAuth>
                <StaffShell>
                  <Leads />
                </StaffShell>
              </RequireAuth>
            }
          />

          <Route
            path="/integracoes"
            element={
              <RequireLojista>
                <StaffShell>
                  <BankIntegrations />
                </StaffShell>
              </RequireLojista>
            }
          />

          <Route
            path="/vendedores"
            element={
              <RequireLojista>
                <StaffShell>
                  <Vendedores />
                </StaffShell>
              </RequireLojista>
            }
          />

          <Route
            path="/gerentes"
            element={
              <RequireOwnerAdmin>
                <StaffShell>
                  <Gerentes />
                </StaffShell>
              </RequireOwnerAdmin>
            }
          />

          <Route
            path="/buscar-veiculo"
            element={
              <RequireAuth>
                <StaffShell>
                  <BuscarVeiculo />
                </StaffShell>
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;