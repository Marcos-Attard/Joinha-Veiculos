"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const clearStaffAuthStorage = () => {
    localStorage.removeItem("is_authenticated");
    localStorage.removeItem("user_id");
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_nome");
    localStorage.removeItem("vendedor_id");
    localStorage.removeItem("force_change_password");
    localStorage.removeItem("onesignal_subscription_id");
    localStorage.removeItem("app_loja");
  };

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("is_authenticated") === "true";
    const forceChangePassword =
      localStorage.getItem("force_change_password") === "true";

    if (isAuthenticated) {
      if (forceChangePassword) {
        navigate("/trocar-senha", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      showError("Informe e-mail e senha.");
      return;
    }

    setLoading(true);

    try {
      clearStaffAuthStorage();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Usuário não encontrado.");
      }

      const { data: profiles, error: profileError } = await (supabase as any)
        .from("profiles_joinha")
        .select("id, role, vendedor_id, ativo, nome, precisa_trocar_senha")
        .eq("id", data.user.id)
        .limit(1);

      if (profileError) {
        throw profileError;
      }

      const profile = Array.isArray(profiles) ? profiles[0] : null;

      if (!profile) {
        throw new Error(
          "Este usuário existe no Auth, mas ainda não tem perfil na Joinha."
        );
      }

      const profileData = profile as any;

      if (profileData.ativo === false) {
        throw new Error("Usuário desativado.");
      }

      const normalizedRole = String(profileData.role || "")
        .trim()
        .toLowerCase();

      if (!normalizedRole) {
        throw new Error("Perfil sem função definida.");
      }

      const nome = profileData.nome
        ? String(profileData.nome).trim()
        : "Usuário Joinha";

      const vendedorId =
        profileData.vendedor_id !== null &&
        profileData.vendedor_id !== undefined &&
        String(profileData.vendedor_id).trim() !== ""
          ? String(profileData.vendedor_id)
          : "";

      const forceChangePassword =
        (normalizedRole === "lojista" ||
          normalizedRole === "vendedor" ||
          normalizedRole === "gerente") &&
        profileData.precisa_trocar_senha === true;

      localStorage.setItem("is_authenticated", "true");
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("auth_role", normalizedRole);
      localStorage.setItem("auth_nome", nome);
      localStorage.setItem("vendedor_id", vendedorId);
      localStorage.setItem("app_loja", "joinha");
      localStorage.setItem(
        "force_change_password",
        forceChangePassword ? "true" : "false"
      );

      showSuccess("Login realizado com sucesso.");

      if (forceChangePassword) {
        navigate("/trocar-senha", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      await supabase.auth.signOut().catch(() => {});
      clearStaffAuthStorage();

      console.error("Erro no login Joinha:", err);
      showError(err?.message || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111b] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-[#0f1d2b] border-[#173146] shadow-2xl">
        <CardHeader className="border-b border-[#173146]">
          <CardTitle className="text-white text-xl font-black">
            Acesso do Staff - Joinha Veículos
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                E-mail
              </label>

              <Input
                type="email"
                placeholder="seuemail@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#09131d] border-[#173146] text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-[#2f7ea1] focus-visible:ring-offset-0"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Senha
              </label>

              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#09131d] border-[#173146] text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-[#2f7ea1] focus-visible:ring-offset-0"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#d4af37] hover:bg-[#c19b2e] text-black font-black"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;