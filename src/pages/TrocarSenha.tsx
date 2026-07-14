"use client";

import React, { useState } from "react";
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

  const handleSalvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    const userId = localStorage.getItem("user_id") || "";
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

    if (!userId) {
      showError("Usuário não identificado.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: senha,
      });

      if (updateAuthError) {
        throw updateAuthError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          precisa_trocar_senha: false,
        })
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      localStorage.setItem("force_change_password", "false");

      showSuccess("Nova senha salva com sucesso.");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      showError(err.message || "Não foi possível salvar a nova senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-black border-zinc-800 shadow-2xl">
        <CardHeader className="border-b border-zinc-900">
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
                className="bg-zinc-900 border-zinc-800 text-white"
                autoComplete="new-password"
                disabled={loading}
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
                className="bg-zinc-900 border-zinc-800 text-white"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#d4af37] hover:bg-[#c19b2e] text-black font-black"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrocarSenha;