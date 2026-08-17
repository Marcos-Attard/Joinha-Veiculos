"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";

const TrocarSenha = () => {
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const prepareSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!data.session?.access_token || !data.session?.refresh_token) {
          showError("Sessão ausente. Faça login novamente.");
          navigate("/login", { replace: true });
          return;
        }

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (setSessionError) {
          throw setSessionError;
        }

        setSessionReady(true);
      } catch (err) {
        console.error("Erro ao preparar sessão:", err);
        showError("Não foi possível carregar sua sessão.");
        navigate("/login", { replace: true });
      }
    };

    prepareSession();
  }, [navigate]);

  const handleSalvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionReady) {
      showError("Sessão ainda não carregou.");
      return;
    }

    const senha = novaSenha.trim();
    const confirmacao = confirmarNovaSenha.trim();

    if (!senha || !confirmacao) {
      showError("Preencha os dois campos de senha.");
      return;
    }

    if (senha.length < 6) {
      showError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      showError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!data.session?.access_token || !data.session?.refresh_token) {
        throw new Error("Auth session missing!");
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (setSessionError) {
        throw setSessionError;
      }

      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: senha,
      });

      if (updateAuthError) {
        throw updateAuthError;
      }

      const userId = localStorage.getItem("user_id") || "";
      if (userId) {
        const { error: profileError } = await supabase
          .from("profiles_joinha")
          .update({
            precisa_trocar_senha: false,
          })
          .eq("id", userId);

        if (profileError) {
          throw profileError;
        }
      }

      localStorage.setItem("force_change_password", "false");

      showSuccess("Nova senha salva com sucesso.");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error("Erro ao trocar senha:", err);
      showError(err?.message || "Não foi possível salvar a nova senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111b] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-[#0f1d2b] border-[#173146] shadow-2xl">
        <CardHeader className="border-b border-[#173146]">
          <CardTitle className="text-white text-xl font-black">
            Trocar senha
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSalvarNovaSenha} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Nova senha
              </label>

              <Input
                type="password"
                placeholder="********"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="bg-[#09131d] border-[#173146] text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-[#2f7ea1] focus-visible:ring-offset-0"
                autoComplete="new-password"
                disabled={loading || !sessionReady}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Confirmar nova senha
              </label>

              <Input
                type="password"
                placeholder="********"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                className="bg-[#09131d] border-[#173146] text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-[#2f7ea1] focus-visible:ring-offset-0"
                autoComplete="new-password"
                disabled={loading || !sessionReady}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#d4af37] hover:bg-[#c19b2e] text-black font-black"
              disabled={loading || !sessionReady}
            >
              {loading
                ? "Salvando..."
                : sessionReady
                ? "Salvar nova senha"
                : "Carregando sessão..."}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrocarSenha;