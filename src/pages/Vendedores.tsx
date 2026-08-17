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
  Users,
  UserCheck,
  UserX,
  Phone,
  RefreshCcw,
  Plus,
  X,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

type Vendedor = {
  id: number;
  nome: string;
  telefone: string | null;
  ativo: boolean;
  ordem: number | null;
  onesignal_subscription_id: string | null;
};

const Vendedores = () => {
  const navigate = useNavigate();

  const role = (localStorage.getItem("auth_role") || "").trim().toLowerCase();
  const isAuthenticated = localStorage.getItem("is_authenticated") === "true";

  const [loading, setLoading] = useState(true);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [cadastrandoVendedor, setCadastrandoVendedor] = useState(false);

  const [novoVendedorNome, setNovoVendedorNome] = useState("");
  const [novoVendedorTelefone, setNovoVendedorTelefone] = useState("");
  const [novoVendedorEmail, setNovoVendedorEmail] = useState("");
  const [novaSenhaVendedor, setNovaSenhaVendedor] = useState("");
  const [novoVendedorAtivo, setNovoVendedorAtivo] = useState(false);

  const allowedRoles = ["lojista", "gerente", "admin", "adm", "administrador"];
  const isLojista = allowedRoles.includes(role);

  const cardClass = "bg-[#0f1d2b] border-[#173146]";
  const cardClassAlt = "bg-[#101f30] border-[#1b3145]";
  const inputClass =
    "bg-[#09131d] border-[#173146] text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-[#2f7ea1] focus-visible:ring-offset-0";
  const hoverBlue = "hover:bg-[#13283b]";

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!isLojista) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLojista, navigate]);

  const carregarVendedores = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_vendedores_admin_list");

      if (error) throw error;

      setVendedores((data || []) as Vendedor[]);
    } catch (error: any) {
      console.error("Erro ao carregar vendedores:", error);
      showError(error?.message || "Não foi possível carregar os vendedores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLojista) {
      carregarVendedores();
    }
  }, [isLojista]);

  const totalVendedores = useMemo(() => vendedores.length, [vendedores]);

  const vendedoresAtivos = useMemo(
    () => vendedores.filter((item) => item.ativo).length,
    [vendedores]
  );

  const vendedoresInativos = useMemo(
    () => vendedores.filter((item) => !item.ativo).length,
    [vendedores]
  );

  const abrirCadastro = () => {
    setNovoVendedorNome("");
    setNovoVendedorTelefone("");
    setNovoVendedorEmail("");
    setNovaSenhaVendedor("");
    setNovoVendedorAtivo(false);
    setCadastroAberto(true);
  };

  const fecharCadastro = () => {
    if (cadastrandoVendedor) return;
    setCadastroAberto(false);
  };

  const alterarStatusVendedor = async (
    vendedorId: number,
    proximoStatus: boolean,
    nome: string
  ) => {
    try {
      setProcessingId(vendedorId);

      const { error } = await supabase.rpc("set_vendedor_ativo_status", {
        p_vendedor_id: vendedorId,
        p_ativo: proximoStatus,
      });

      if (error) throw error;

      setVendedores((prev) =>
        prev.map((item) =>
          item.id === vendedorId ? { ...item, ativo: proximoStatus } : item
        )
      );

      showSuccess(
        proximoStatus
          ? `${nome} foi ativado com sucesso.`
          : `${nome} foi desativado com sucesso.`
      );
    } catch (error: any) {
      console.error("Erro ao alterar status do vendedor:", error);
      showError(
        error?.message || "Não foi possível alterar o status do vendedor."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const cadastrarVendedor = async (event: React.FormEvent) => {
    event.preventDefault();

    const nome = novoVendedorNome.trim();
    const telefone = novoVendedorTelefone.replace(/\D/g, "");
    const email = novoVendedorEmail.trim().toLowerCase();
    const senhaTemporaria = novaSenhaVendedor.trim();

    if (nome.length < 3) {
      showError("Informe o nome do vendedor.");
      return;
    }

    if (!/^[1-9]{2}9\d{8}$/.test(telefone)) {
      showError("Informe um celular válido com DDD. Exemplo: 11999999999.");
      return;
    }

    if (!email || !email.includes("@")) {
      showError("Informe um e-mail válido para o vendedor.");
      return;
    }

    if (senhaTemporaria.length < 6) {
      showError(
        "A senha temporária do vendedor deve ter pelo menos 6 caracteres."
      );
      return;
    }

    try {
      setCadastrandoVendedor(true);

      const { data, error } = await supabase.functions.invoke(
        "create-vendedor-admin",
        {
          body: {
            nome,
            telefone,
            email,
            senhaTemporaria,
            ativo: novoVendedorAtivo,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Não foi possível cadastrar vendedor.");
      }

      showSuccess("Vendedor cadastrado com sucesso.");

      setNovoVendedorNome("");
      setNovoVendedorTelefone("");
      setNovoVendedorEmail("");
      setNovaSenhaVendedor("");
      setNovoVendedorAtivo(false);
      setCadastroAberto(false);

      await carregarVendedores();
    } catch (error: any) {
      console.error("Erro ao cadastrar vendedor:", error);
      showError(error?.message || "Erro ao cadastrar vendedor.");
    } finally {
      setCadastrandoVendedor(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Vendedores
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Cadastre vendedores, acompanhe o status e controle quem participa do rodízio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={abrirCadastro}
            className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
          >
            <Plus size={16} className="mr-2" />
            Cadastrar vendedor
          </Button>

          <Button
            onClick={carregarVendedores}
            variant="outline"
            className="border-[#173146] bg-transparent text-white hover:bg-[#13283b] hover:text-white"
            disabled={loading}
          >
            <RefreshCcw size={16} className="mr-2" />
            Atualizar
          </Button>

          <Button
            onClick={() => navigate("/dashboard")}
            className="border border-[#173146] bg-[#0b1623] text-white hover:bg-[#13283b] hover:text-white"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {cadastroAberto && (
        <Card className={`${cardClass} rounded-2xl`}>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Cadastrar Vendedor
                </h2>
                <p className="text-zinc-400 text-sm mt-2">
                  O novo vendedor receberá uma senha provisória e precisará trocá-la no primeiro acesso.
                </p>
              </div>

              <Button
                onClick={fecharCadastro}
                variant="outline"
                className="border-[#173146] bg-transparent text-white hover:bg-[#13283b] hover:text-white"
                disabled={cadastrandoVendedor}
              >
                <X size={16} className="mr-2" />
                Fechar
              </Button>
            </div>

            <form onSubmit={cadastrarVendedor} className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    Nome
                  </label>
                  <Input
                    value={novoVendedorNome}
                    onChange={(e) => setNovoVendedorNome(e.target.value)}
                    placeholder="Nome do vendedor"
                    className={inputClass}
                    disabled={cadastrandoVendedor}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    Telefone
                  </label>
                  <Input
                    value={novoVendedorTelefone}
                    onChange={(e) =>
                      setNovoVendedorTelefone(
                        e.target.value.replace(/\D/g, "").slice(0, 11)
                      )
                    }
                    placeholder="11999999999"
                    inputMode="numeric"
                    className={inputClass}
                    disabled={cadastrandoVendedor}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    E-mail de login
                  </label>
                  <Input
                    type="email"
                    value={novoVendedorEmail}
                    onChange={(e) => setNovoVendedorEmail(e.target.value)}
                    placeholder="vendedor@email.com"
                    className={inputClass}
                    disabled={cadastrandoVendedor}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    Senha provisória
                  </label>
                  <Input
                    type="text"
                    value={novaSenhaVendedor}
                    onChange={(e) => setNovaSenhaVendedor(e.target.value)}
                    placeholder="mínimo 6 caracteres"
                    className={inputClass}
                    disabled={cadastrandoVendedor}
                  />
                </div>

                <div className="space-y-2 xl:col-span-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                    Status inicial
                  </label>
                  <select
                    value={novoVendedorAtivo ? "true" : "false"}
                    onChange={(e) =>
                      setNovoVendedorAtivo(e.target.value === "true")
                    }
                    className="w-full h-10 rounded-md border border-[#173146] bg-[#09131d] px-3 text-white outline-none focus:ring-1 focus:ring-[#2f7ea1]"
                    disabled={cadastrandoVendedor}
                  >
                    <option value="false">Inativo</option>
                    <option value="true">Ativo</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-[#173146] bg-[#07111b]/70 p-4 text-sm text-zinc-400">
                Se estiver inativo, o vendedor não acessa o app e não entra no rodízio.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={cadastrandoVendedor}
                  className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                >
                  {cadastrandoVendedor
                    ? "Cadastrando vendedor..."
                    : "Cadastrar vendedor"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${cardClass} rounded-2xl`}>
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Total
              </span>
              <Users size={18} className="text-[#d4af37]" />
            </div>
            <div className="text-4xl font-black text-white">
              {totalVendedores}
            </div>
          </CardContent>
        </Card>

        <Card className={`${cardClass} rounded-2xl`}>
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Ativos
              </span>
              <UserCheck size={18} className="text-emerald-400" />
            </div>
            <div className="text-4xl font-black text-emerald-400">
              {vendedoresAtivos}
            </div>
          </CardContent>
        </Card>

        <Card className={`${cardClass} rounded-2xl`}>
          <CardContent className="p-5 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                Inativos
              </span>
              <UserX size={18} className="text-zinc-300" />
            </div>
            <div className="text-4xl font-black text-zinc-300">
              {vendedoresInativos}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card className={`${cardClass} rounded-2xl`}>
          <CardContent className="p-6 text-zinc-400">
            Carregando vendedores...
          </CardContent>
        </Card>
      ) : vendedores.length === 0 ? (
        <Card className={`${cardClass} rounded-2xl`}>
          <CardContent className="p-6 text-zinc-400">
            Nenhum vendedor encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {vendedores.map((vendedor) => {
            const estaProcessando = processingId === vendedor.id;

            return (
              <Card
                key={vendedor.id}
                className={`${cardClassAlt} rounded-2xl`}
              >
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-white">
                          {vendedor.nome || "Sem nome"}
                        </h2>

                        {vendedor.ativo ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-500/15 text-zinc-300 border border-zinc-500/30">
                            Inativo
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            ID
                          </p>
                          <p className="text-white font-semibold">
                            {vendedor.id}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Telefone
                          </p>
                          <p className="text-white font-semibold flex items-center gap-2">
                            <Phone size={14} className="text-zinc-500" />
                            {vendedor.telefone || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Ativo
                          </p>
                          <p className="text-white font-semibold">
                            {vendedor.ativo ? "Sim" : "Não"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Ordem no rodízio
                          </p>
                          <p className="text-white font-semibold">
                            {vendedor.ordem ?? "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {vendedor.ativo ? (
                        <Button
                          onClick={() =>
                            alterarStatusVendedor(
                              vendedor.id,
                              false,
                              vendedor.nome
                            )
                          }
                          disabled={estaProcessando}
                          className="bg-[#13283b] hover:bg-[#2f7ea1] text-white font-black"
                        >
                          {estaProcessando ? "Processando..." : "Desativar"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() =>
                            alterarStatusVendedor(
                              vendedor.id,
                              true,
                              vendedor.nome
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

export default Vendedores;