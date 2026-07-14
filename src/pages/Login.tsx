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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, vendedor_id, ativo, nome, precisa_trocar_senha")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error("Perfil do usuário não encontrado.");
      }

      const profileData = profile as any;

      if (profileData.ativo === false) {
        throw new Error("Usuário desativado.");
      }

      const normalizedRole = String(profileData.role || "").trim().toLowerCase();
      const nome = profileData.nome ? String(profileData.nome).trim() : "";
      const vendedorId = profileData.vendedor_id
        ? String(profileData.vendedor_id)
        : "";
      const forceChangePassword =
        (normalizedRole === "vendedor" || normalizedRole === "gerente") &&
        profileData.precisa_trocar_senha === true;

      localStorage.setItem("is_authenticated", "true");
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("auth_role", normalizedRole);
      localStorage.setItem("auth_nome", nome);
      localStorage.setItem("vendedor_id", vendedorId);
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
      showError(err.message || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-black border-zinc-800 shadow-2xl">
        <CardHeader className="border-b border-zinc-900">
          <CardTitle className="text-white text-xl font-black">
            Acesso do Staff
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
                className="bg-zinc-900 border-zinc-800 text-white"
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
                className="bg-zinc-900 border-zinc-800 text-white"
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