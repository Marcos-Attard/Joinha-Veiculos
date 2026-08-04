"use client";

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  Users,
  Menu,
  X,
  Settings2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import JoinhaLogo from "@/assets/Logo-Joinha.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const role = (localStorage.getItem("auth_role") || "lojista")
    .trim()
    .toLowerCase();

  const canManageGerentes = [
    "lojista",
    "admin",
    "adm",
    "administrador",
  ].includes(role);

  const logoSrc = JoinhaLogo;

  const menuItems =
    role === "vendedor"
      ? [
          { icon: LayoutDashboard, label: "Início", path: "/dashboard" },
          { icon: Car, label: "Estoque", path: "/estoque" },
          { icon: Users, label: "Leads", path: "/leads" },
        ]
      : [
          { icon: LayoutDashboard, label: "Início", path: "/dashboard" },
          { icon: Car, label: "Estoque", path: "/estoque" },
          { icon: Users, label: "Leads", path: "/leads" },
          { icon: Users, label: "Vendedores", path: "/vendedores" },
          ...(canManageGerentes
            ? [{ icon: Shield, label: "Gerentes", path: "/gerentes" }]
            : []),
          { icon: Settings2, label: "Integrações", path: "/integracoes" },
        ];

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex min-h-screen w-full bg-[#121212] overflow-x-hidden">
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[260px] bg-black border-r border-zinc-800 flex flex-col z-[100] transition-transform duration-300 ease-in-out md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={toggleMenu}
          className="absolute top-4 right-4 text-[#d4af37] md:hidden"
        >
          <X size={28} />
        </button>

        <div className="flex justify-center py-8 px-6">
          <img
            src={logoSrc}
            alt="Joinha Veículos"
            className="w-[210px] h-auto object-contain"
          />
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 rounded-lg transition-all duration-200 font-bold text-sm",
                  isActive
                    ? "bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20"
                    : "text-white hover:bg-zinc-900"
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-black" : "text-white"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-zinc-900 bg-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[#d4af37] font-black border border-zinc-700">
              {role === "vendedor" ? "VN" : role === "gerente" ? "GR" : "AD"}
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">
                {role === "vendedor"
                  ? "Vendedor"
                  : role === "gerente"
                  ? "Gerente"
                  : "Administrador"}
              </span>

              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                Painel Joinha
              </span>
            </div>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
          onClick={toggleMenu}
        />
      )}

      <main className="flex-1 md:ml-[260px] flex flex-col min-h-screen w-full">
        <header className="h-20 border-b border-zinc-800 bg-black/40 backdrop-blur-md flex items-center px-6 md:px-10 sticky top-0 z-40">
          <button
            onClick={toggleMenu}
            className="mr-4 text-[#d4af37] md:hidden hover:scale-110 transition-transform"
          >
            <Menu size={32} />
          </button>

          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">
            {menuItems.find((i) => i.path === location.pathname)?.label ||
              "Dashboard"}
          </h2>
        </header>

        <div className="p-6 md:p-12 lg:p-16">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;