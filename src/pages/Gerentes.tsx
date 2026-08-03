"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Shield,
  UserCheck,
  UserX,
  RefreshCcw,
  Plus,
  X,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

type Gerente = {
  id: string;
  nome: string | null;
  ativo: boolean;
  role: string;
};

const Gerentes = () => {
  const navigate = useNavigate();

  const role = (localStorage.getItem("auth_role") || "").trim().toLowerCase();
  const isAuthenticated = localStorage.getItem("is_authenticated") === "true";

  const [loading, setLoading] = useState(true);
  const [gerentes, setGerentes] = useState<Gerente[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [cadastrandoGerente, setCadastrandoGerente] = useState(false);

  const [novoGerenteNome, setNovoGerenteNome] = useState("");
  const [novoGerenteEmail, setNovoGerenteEmail] = useState("");
  const [novaSenhaGerente, setNovaSenhaGerente] = useState("");
  const [statusInicial, setStatusInicial] = useState<"Ativo" | "Inativo">(
    "Ativo"
  );

  const allowedRoles = ["lojista", "admin", "adm", "administrador"];
  const canManageGerentes = allowedRoles.includes(role);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!canManageGerentes) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, canManageGerentes, navigate]);

  const carregarGerentes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles_joinha")
        .select("id, nome, ativo, role")
        .eq("role", "gerente")
        .order("nome", { ascending: true });

      if (error) throw error;

      setGerentes((data || []) as Gerente[]);
    } catch (error: any) {
      console.error("Erro ao carregar gerentes:", error);
      showError(error?.message || "Não foi possível carregar os gerentes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageGerentes) {
      carregarGerentes();
    }
  }, [canManageGerentes]);

  const totalGerentes = useMemo(() => gerentes.length, [gerentes]);

  const gerentesAtivos = useMemo(
    () => gerentes.filter((item) => item.ativo).length,
    [gerentes]
  );

  const gerentesInativos = useMemo(
    () => gerentes.filter((item) => !item.ativo).length,
    [gerentes]
  );

  const abrirCadastro = () => {
    setNovoGerenteNome("");
    setNovoGerenteEmail("");
    setNovaSenhaGerente("");
    setStatusInicial("Ativo");
    setCadastroAberto(true);
  };

  const fecharCadastro = () => {
    if (cadastrandoGerente) return;
    setCadastroAberto(false);
  };

  const alterarStatusGerente = async (
    gerenteId: string,
    proximoStatus: boolean,
    nome: string
  ) => {
    try {
      setProcessingId(gerenteId);

      const { error } = await supabase
        .from("profiles_joinha")
        .update({ ativo: proximoStatus })
        .eq("id", gerenteId)
        .eq("role", "gerente");

      if (error) throw error;

      setGerentes((prev) =>
        prev.map((item) =>
          item.id === gerenteId ? { ...item, ativo: proximoStatus } : item
        )
      );

      showSuccess(
        proximoStatus
          ? `${nome} foi ativado com sucesso.`
          : `${nome} foi desativado com sucesso.`
      );
    } catch (error: any) {
      console.error("Erro ao alterar status do gerente:", error);
      showError(
        error?.message || "Não foi possível alterar o status do gerente."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const cadastrarGerente = async (event: React.FormEvent) => {
    event.preventDefault();

    const nome = novoGerenteNome.trim();
    const email = novoGerenteEmail.trim().toLowerCase();
    const senhaTemporaria = novaSenhaGerente.trim();

    if (nome.length < 3) {
      showError("Informe o nome do gerente.");
      return;
    }

    if (!email || !email.includes("@")) {
      showError("Informe um e-mail válido para o gerente.");
      return;
    }

    if (senhaTemporaria.length < 6) {
      showError(
        "A senha provisória do gerente deve ter pelo menos 6 caracteres."
      );
      return;
    }

    try {
      setCadastrandoGerente(true);

      const { data, error } = await supabase.functions.invoke(
        "create-gerente-admin",
        {
          body: {
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            senhaTemporaria: senhaTemporaria.trim(),
            ativo: statusInicial === "Ativo",
          },
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.error || data?.message || "Erro ao cadastrar gerente."
        );
      }

      showSuccess("Gerente cadastrado com sucesso.");

      setNovoGerenteNome("");
      setNovoGerenteEmail("");
      setNovaSenhaGerente("");
      setStatusInicial("Ativo");
      setCadastroAberto(false);

      await carregarGerentes();
    } catch (err: any) {
      let message = err?.message || "Erro ao cadastrar gerente.";

      if (err?.context?.response) {
        try {
          const responseText = await err.context.response.text();
          try {
            const parsed = JSON.parse(responseText);
            message = parsed.error || parsed.message || responseText || message;
          } catch {
            message = responseText || message;
          }
        } catch {}
      }

      console.error("Erro ao cadastrar gerente:", err);
      showError(message);
    } finally {
      setCadastrandoGerente(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Gerentes
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Cadastre gerentes e controle quem pode operar as áreas
            administrativas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={abrirCadastro}
            className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
          >
            <Plus size={16} className="mr-2" />
            Cadastrar gerente
          </Button>

          <Button
            onClick={carregarGerentes}
            variant="outline"
            className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
            disabled={loading}
          >
            <RefreshCcw size={16} className="mr-2" />
            Atualizar
          </Button>

          <Button
            onClick={() => navigate("/dashboard")}
            className="border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {cadastroAberto && (
        <Card className="bg-[#101010] border-[#d4af37]/40 rounded-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Cadastrar Gerente
                </h2>
                <p className="text-zinc-400 text-sm mt-2">
                  O novo gerente será criado no Auth e em profiles_joinha, sem
                  entrar no rodízio.
                </p>
              </div>

              <Button
                onClick={fecharCadastro}
                variant="outline"
                className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
                disabled={cadastrandoGerente}
              >
                <X size={16} className="mr-2" />
                Fechar
              </Button>
            </div>

            <form onSubmit={cadastrarGerente} className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    Nome
                  </label>
                  <Input
                    value={novoGerenteNome}
                    onChange={(e) => setNovoGerenteNome(e.target.value)}
                    placeholder="Nome do gerente"
                    className="bg-zinc-900 border-zinc-800 text-white"
                    disabled={cadastrandoGerente}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    E-mail de login
                  </label>
                  <Input
                    type="email"
                    value={novoGerenteEmail}
                    onChange={(e) => setNovoGerenteEmail(e.target.value)}
                    placeholder="gerente@email.com"
                    className="bg-zinc-900 border-zinc-800 text-white"
                    disabled={cadastrandoGerente}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    Senha provisória
                  </label>
                  <Input
                    type="text"
                    value={novaSenhaGerente}
                    onChange={(e) => setNovaSenhaGerente(e.target.value)}
                    placeholder="mínimo 6 caracteres"
                    className="bg-zinc-900 border-zinc-800 text-white"
                    disabled={cadastrandoGerente}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    Status inicial
                  </label>
                  <select
                    value={statusInicial}
                    onChange={(e) =>
                      setStatusInicial(e.target.value as "Ativo" | "Inativo")
                    }
                    className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white"
                    disabled={cadastrandoGerente}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
                O gerente terá acesso operacional administrativo, mas não
                participa do rodízio.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={cadastrandoGerente}
                  className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                >
                  {cadastrandoGerente
                    ? "Cadastrando gerente..."
                    : "Cadastrar gerente"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black border-zinc-800 rounded-2xl">
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Total
              </span>
              <Shield size={18} className="text-[#d4af37]" />
            </div>
            <div className="text-4xl font-black text-white">{totalGerentes}</div>
          </CardContent>
        </Card>

        <Card className="bg-black border-zinc-800 rounded-2xl">
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Ativos
              </span>
              <UserCheck size={18} className="text-emerald-400" />
            </div>
            <div className="text-4xl font-black text-emerald-400">
              {gerentesAtivos}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black border-zinc-800 rounded-2xl">
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Inativos
              </span>
              <UserX size={18} className="text-zinc-300" />
            </div>
            <div className="text-4xl font-black text-zinc-300">
              {gerentesInativos}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card className="bg-[#101010] border-zinc-800 rounded-2xl">
          <CardContent className="p-6 text-zinc-400">
            Carregando gerentes...
          </CardContent>
        </Card>
      ) : gerentes.length === 0 ? (
        <Card className="bg-[#101010] border-zinc-800 rounded-2xl">
          <CardContent className="p-6 text-zinc-400">
            Nenhum gerente encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {gerentes.map((gerente) => {
            const estaProcessando = processingId === gerente.id;

            return (
              <Card
                key={gerente.id}
                className="bg-[#101010] border-zinc-800 rounded-2xl"
              >
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-white">
                          {gerente.nome || "Sem nome"}
                        </h2>

                        {gerente.ativo ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-500/15 text-zinc-300 border border-zinc-500/30">
                            Inativo
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Nome
                          </p>
                          <p className="text-white font-semibold">
                            {gerente.nome || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Status
                          </p>
                          <p className="text-white font-semibold">
                            {gerente.ativo ? "Ativo" : "Inativo"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {gerente.ativo ? (
                        <Button
                          onClick={() =>
                            alterarStatusGerente(
                              gerente.id,
                              false,
                              gerente.nome || "Gerente"
                            )
                          }
                          disabled={estaProcessando}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white font-black"
                        >
                          {estaProcessando ? "Processando..." : "Desativar"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() =>
                            alterarStatusGerente(
                              gerente.id,
                              true,
                              gerente.nome || "Gerente"
                            )
                          }
                          disabled={estaProcessando}
                          className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                        >
                          {estaProcessando ? "Processando..." : "Ativar"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Gerentes;