import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  Car,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Store,
  Phone,
} from "lucide-react";

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  veiculo_interesse: string;
  created_at: string;
  status: string;

  vendedor_nome?: string;
  vendedor?: string;
  vendedor_id?: number;

  lojista_nome?: string;
  lojista?: string;
  empresa?: string;
  store_name?: string;

  notificado_status?: boolean | string;
  notificado_em?: string;
  entrada?: number;
  renda?: number;
  saldo_financiado?: number;
  parcela_12x?: number;
  parcela_24x?: number;
  parcela_36x?: number;
  parcela_48x?: number;
  valor_veiculo?: number;
  valor?: number;
  preco?: number;
  preco_veiculo?: number;
  valor_carro?: number;
  valor_total?: number;
  valor_styled?: number;
  renda_max?: number;
  renda_limite?: number;
  pre_aprovacao?: number;
  base_pre_aprovacao?: number;
  parcela_cabivel?: number;
  parcela_nao_cabivel?: number;
  analise?: any;
}

const LEADS_TABLE = "leads_credito_joinha";

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLeads, setExpandedLeads] = useState<Record<string, boolean>>(
    {}
  );

  const role = localStorage.getItem("auth_role") || "lojista";
  const isAdminView = [
    "lojista",
    "gerente",
    "admin",
    "adm",
    "administrador",
  ].includes(String(role).trim().toLowerCase());

  const cardClass = "bg-[#0f1d2b] border-[#173146]";
  const cardClassAlt = "bg-[#101f30] border-[#1b3145]";
  const panelSoftClass = "bg-[#07111b]/70 border-[#173146]";
  const tableClass = "bg-[#0b1623] border-[#173146]";

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "hide-floating-whatsapp-leads";
    style.innerHTML = `
      a[href="https://wa.me/5511999999999"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById("hide-floating-whatsapp-leads");
      if (el) el.remove();
    };
  }, []);

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return "---";
    try {
      return format(new Date(dataStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "---";
    }
  };

  const formatarMoeda = (valor?: number | null) => {
    if (valor === undefined || valor === null) return "---";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const getNomeVendedor = (lead: Lead) => {
    return lead.vendedor_nome || lead.vendedor || "Não designado";
  };

  const getNomeLojista = (lead: Lead) => {
    return (
      lead.lojista_nome ||
      lead.lojista ||
      lead.empresa ||
      lead.store_name ||
      "Joinha Veículos"
    );
  };

  const renderNotificadoBadge = (status?: boolean | string) => {
    const isNotificado =
      status === true ||
      status === "true" ||
      status === "Notificado" ||
      status === "SIM";

    if (isNotificado) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex gap-1 items-center w-fit">
          <CheckCircle2 size={12} /> Notificado
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex gap-1 items-center w-fit animate-pulse">
        <Clock size={12} /> Pendente
      </Badge>
    );
  };

  const limparTelefone = (telefone: string) => {
    return String(telefone || "").replace(/\D/g, "");
  };

  const getWhatsAppLink = (
    telefone: string,
    nome: string,
    veiculo: string
  ) => {
    const limpo = limparTelefone(telefone);
    if (!limpo || limpo.length < 10) return "#";

    const ddi = limpo.startsWith("55") ? "" : "55";
    const msg = encodeURIComponent(
      `Olá, ${nome}. Recebi sua simulação para o veículo ${
        veiculo || "de seu interesse"
      } aqui na Joinha Veículos. Posso te ligar agora para explicar as próximas etapas e dar andamento no seu atendimento?`
    );

    return `https://wa.me/${ddi}${limpo}?text=${msg}`;
  };

  const getPhoneLink = (telefone: string) => {
    const limpo = limparTelefone(telefone);
    return limpo ? `tel:${limpo}` : "#";
  };

  const toggleExpand = (id: string) => {
    setExpandedLeads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getValorVeiculo = (lead: Lead) => {
    return (
      lead.valor_veiculo ??
      lead.valor ??
      lead.preco ??
      lead.preco_veiculo ??
      lead.valor_carro ??
      lead.valor_total ??
      lead.valor_styled ??
      null
    );
  };

  const getAnalise = (lead: Lead) => {
    if (!lead.analise) return null;

    if (typeof lead.analise === "string") {
      try {
        return JSON.parse(lead.analise);
      } catch {
        return null;
      }
    }

    return lead.analise;
  };

  const getBasePreAprovacao = (lead: Lead) => {
    const analise = getAnalise(lead);
    return analise?.base_pre_aprovacao ?? lead.base_pre_aprovacao ?? null;
  };

  const getLimiteRenda = (lead: Lead) => {
    const analise = getAnalise(lead);
    return analise?.limite_renda ?? lead.renda_limite ?? lead.renda_max ?? null;
  };

  const getParcelaInfo = (
    lead: Lead,
    parcela: "12x" | "24x" | "36x" | "48x"
  ) => {
    const analise = getAnalise(lead);
    return analise?.parcelas?.[parcela] ?? null;
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);

      const currentRole = localStorage.getItem("auth_role") || "lojista";
      const currentVendedorId = localStorage.getItem("vendedor_id");

      let query = (supabase as any)
        .from(LEADS_TABLE)
        .select("*", { count: "exact", head: false });

      if (String(currentRole).trim().toLowerCase() === "vendedor") {
        if (!currentVendedorId) {
          setLeads([]);
          return;
        }

        query = query.eq("vendedor_id", Number(currentVendedorId));
      }

      const { data, error } = await query;

      if (error) throw error;

      const sortedLeads = (data || []).sort((a: Lead, b: Lead) => {
        const aNotificado =
          a.notificado_status === true ||
          a.notificado_status === "true" ||
          a.notificado_status === "Notificado" ||
          a.notificado_status === "SIM";

        const bNotificado =
          b.notificado_status === true ||
          b.notificado_status === "true" ||
          b.notificado_status === "Notificado" ||
          b.notificado_status === "SIM";

        if (aNotificado && !bNotificado) return 1;
        if (!aNotificado && bNotificado) return -1;

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setLeads(sortedLeads);
    } catch (error: any) {
      showError("Erro ao carregar leads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel("realtime-leads-joinha")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: LEADS_TABLE,
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 bg-[#102030]" />
          <Skeleton className="h-6 w-24 bg-[#102030]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full bg-[#102030]" />
          <Skeleton className="h-64 w-full bg-[#102030]" />
        </div>
      </div>
    );
  }

  const title = isAdminView ? "Central de Leads" : "Meus Leads";
  const subtitle = isAdminView
    ? "Visualize todos os contatos da Joinha e acompanhe o funil completo."
    : "Visualize apenas os leads vinculados ao seu atendimento.";

  const renderAnaliseCard = (
    lead: Lead,
    parcela: "12x" | "24x" | "36x" | "48x"
  ) => {
    const info = getParcelaInfo(lead, parcela);
    const isPreAprovado = info?.status === "pre_aprovado";

    return (
      <div
        className={`rounded-2xl border p-4 space-y-3 ${
          isPreAprovado
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-orange-500/40 bg-orange-500/5"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="text-2xl font-black text-white">{parcela}</div>
          <Badge
            className={
              isPreAprovado
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
            }
          >
            {isPreAprovado ? (
              <>
                <CheckCircle size={12} className="mr-1" /> Pré-aprovado
              </>
            ) : (
              <>
                <AlertTriangle size={12} className="mr-1" /> Ajuste de entrada
              </>
            )}
          </Badge>
        </div>

        <div className="text-3xl font-black text-white">
          {formatarMoeda(
            info?.valor ??
              (parcela === "12x"
                ? lead.parcela_12x
                : parcela === "24x"
                ? lead.parcela_24x
                : parcela === "36x"
                ? lead.parcela_36x
                : lead.parcela_48x)
          )}
        </div>

        <div className="rounded-xl bg-[#07111b]/70 border border-[#173146] p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-black mb-1">
            Limite pela renda
          </div>
          <div className="text-emerald-400 font-bold">
            {formatarMoeda(getLimiteRenda(lead))}
          </div>

          <div className="mt-3 text-sm leading-relaxed">
            <span
              className={
                isPreAprovado
                  ? "text-emerald-300 font-semibold"
                  : "text-orange-300 font-semibold"
              }
            >
              {info?.texto ||
                (isPreAprovado
                  ? "Esta opção está dentro da base de pré-aprovação."
                  : "Para pré-aprovação neste plano, será necessária uma entrada mínima.")}
            </span>
          </div>

          {!isPreAprovado && info?.entrada_minima !== undefined && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-black">
                Entrada mínima
              </div>
              <div className="text-yellow-400 font-black text-xl">
                {formatarMoeda(info.entrada_minima)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {title}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
        </div>
        <Badge
          variant="outline"
          className="border-[#d4af37] text-[#d4af37] px-4 py-1.5 font-bold text-sm"
        >
          {leads.length} Leads
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:hidden">
        {leads.map((lead) => {
          const isExpanded = !!expandedLeads[lead.id];
          const whatsappUrl = getWhatsAppLink(
            lead.telefone,
            lead.nome,
            lead.veiculo_interesse
          );
          const phoneUrl = getPhoneLink(lead.telefone);
          const valorVeiculo = getValorVeiculo(lead);
          const basePreAprovacao = getBasePreAprovacao(lead);

          return (
            <div
              key={lead.id}
              className="bg-[#0f1d2b] border border-[#173146] rounded-2xl p-5 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Calendar size={14} />
                  <span>{formatarData(lead.created_at)}</span>
                </div>
                {renderNotificadoBadge(lead.notificado_status)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[#d4af37]" />
                  <span className="font-bold text-white text-base">
                    {lead.nome}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300 text-sm">
                  <Car size={14} className="text-zinc-500" />
                  <span className="font-medium">
                    {lead.veiculo_interesse || "Geral"}
                  </span>
                </div>

                <div className="rounded-xl bg-[#07111b]/70 border border-[#173146] p-3 space-y-2 mt-3">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Store size={12} /> Lojista:
                    </span>
                    <span className="text-zinc-200 font-semibold text-right">
                      {getNomeLojista(lead)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">
                      Vendedor:
                    </span>
                    <span className="text-zinc-200 font-semibold text-right">
                      {getNomeVendedor(lead)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex gap-2 items-center justify-center py-5">
                    <MessageSquare size={16} />
                    WhatsApp
                  </Button>
                </a>

                <a href={phoneUrl} className="flex-1">
                  <Button className="w-full bg-[#13283b] hover:bg-[#2f7ea1] text-white font-bold rounded-xl flex gap-2 items-center justify-center py-5">
                    <Phone size={16} />
                    Ligar celular
                  </Button>
                </a>

                <Button
                  variant="outline"
                  onClick={() => toggleExpand(lead.id)}
                  className="border-[#173146] bg-transparent text-zinc-400 hover:bg-[#13283b] rounded-xl px-3"
                >
                  {isExpanded ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </Button>
              </div>

              {isExpanded && (
                <div className="pt-4 border-t border-[#173146] space-y-4 text-sm animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#07111b]/60 p-3 rounded-xl border border-[#173146]">
                      <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider block">
                        Valor do Veículo
                      </span>
                      <span className="text-white font-bold">
                        {valorVeiculo !== null
                          ? formatarMoeda(valorVeiculo)
                          : "Não informado"}
                      </span>
                    </div>
                    <div className="bg-[#07111b]/60 p-3 rounded-xl border border-[#173146]">
                      <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider block">
                        Renda Mensal
                      </span>
                      <span className="text-white font-bold">
                        {formatarMoeda(lead.renda)}
                      </span>
                    </div>
                    <div className="bg-[#07111b]/60 p-3 rounded-xl border border-[#173146]">
                      <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider block">
                        Entrada
                      </span>
                      <span className="text-[#d4af37] font-bold">
                        {formatarMoeda(lead.entrada)}
                      </span>
                    </div>
                    <div className="bg-[#07111b]/60 p-3 rounded-xl border border-[#173146]">
                      <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider block">
                        Saldo a Financiar
                      </span>
                      <span className="text-white font-bold">
                        {formatarMoeda(lead.saldo_financiado)}
                      </span>
                    </div>

                    <div className="bg-[#07111b]/60 p-3 rounded-xl border border-[#173146] col-span-2">
                      <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider block">
                        Base / Pré-aprovação
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {basePreAprovacao !== null
                          ? formatarMoeda(basePreAprovacao)
                          : "Não informado"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider block mb-1">
                      Análise das Parcelas
                    </span>
                    <div className="grid grid-cols-1 gap-3">
                      {renderAnaliseCard(lead, "12x")}
                      {renderAnaliseCard(lead, "24x")}
                      {renderAnaliseCard(lead, "36x")}
                      {renderAnaliseCard(lead, "48x")}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#173146] flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider">
                        Lojista:
                      </span>
                      <span className="text-zinc-300 font-medium">
                        {getNomeLojista(lead)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider">
                        Vendedor:
                      </span>
                      <span className="text-zinc-300 font-medium">
                        {getNomeVendedor(lead)}
                      </span>
                    </div>
                    {lead.notificado_em && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-bold uppercase tracking-wider">
                          Notificado em:
                        </span>
                        <span className="text-zinc-300 font-medium">
                          {formatarData(lead.notificado_em)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {leads.length === 0 && (
          <div className="text-center py-20 border border-dashed border-[#173146] rounded-2xl bg-[#07111b]/40">
            <p className="text-zinc-500">
              Nenhum lead recebido até o momento.
            </p>
          </div>
        )}
      </div>

      <div className="hidden md:block bg-[#0f1d2b] border border-[#173146] rounded-2xl overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-[#07111b]/70">
            <TableRow className="border-[#173146] hover:bg-transparent">
              <TableHead className="text-zinc-400 font-bold py-4">
                Data
              </TableHead>
              <TableHead className="text-zinc-400 font-bold">Nome</TableHead>
              <TableHead className="text-zinc-400 font-bold">
                Veículo
              </TableHead>
              <TableHead className="text-zinc-400 font-bold">
                Lojista
              </TableHead>
              <TableHead className="text-zinc-400 font-bold">
                Renda / Entrada
              </TableHead>
              <TableHead className="text-zinc-400 font-bold">
                Financiamento
              </TableHead>
              <TableHead className="text-zinc-400 font-bold">
                Parcelas
              </TableHead>
              <TableHead className="text-zinc-400 font-bold">
                Vendedor
              </TableHead>
              <TableHead className="text-zinc-400 font-bold">
                Notificação
              </TableHead>
              <TableHead className="text-zinc-400 font-bold text-center">
                Ação
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const whatsappUrl = getWhatsAppLink(
                lead.telefone,
                lead.nome,
                lead.veiculo_interesse
              );
              const phoneUrl = getPhoneLink(lead.telefone);
              const valorVeiculo = getValorVeiculo(lead);
              const basePreAprovacao = getBasePreAprovacao(lead);

              return (
                <TableRow
                  key={lead.id}
                  className="border-[#173146] hover:bg-[#13283b]/30 transition-colors"
                >
                  <TableCell className="text-zinc-300 py-4">
                    {formatarData(lead.created_at)}
                  </TableCell>
                  <TableCell className="font-bold text-white">
                    <div>{lead.nome}</div>
                    <div className="text-xs text-zinc-500 font-normal mt-0.5">
                      {lead.telefone}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-medium">
                    {lead.veiculo_interesse || "Geral"}
                  </TableCell>
                  <TableCell className="text-zinc-300 font-medium">
                    {getNomeLojista(lead)}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    <div className="text-xs text-zinc-400">
                      Renda: {formatarMoeda(lead.renda)}
                    </div>
                    <div className="text-xs text-[#d4af37] mt-0.5">
                      Entrada: {formatarMoeda(lead.entrada)}
                    </div>
                    <div className="text-xs text-white mt-0.5">
                      Valor do veículo:{" "}
                      {valorVeiculo !== null
                        ? formatarMoeda(valorVeiculo)
                        : "Não informado"}
                    </div>
                    <div className="text-xs text-emerald-400 mt-0.5">
                      Base / Pré-aprovação:{" "}
                      {basePreAprovacao !== null
                        ? formatarMoeda(basePreAprovacao)
                        : "Não informado"}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-bold">
                    {formatarMoeda(lead.saldo_financiado)}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    <div className="text-xs">
                      12x:{" "}
                      <span className="font-bold text-white">
                        {formatarMoeda(lead.parcela_12x)}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5">
                      24x:{" "}
                      <span className="font-bold text-white">
                        {formatarMoeda(lead.parcela_24x)}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5">
                      36x:{" "}
                      <span className="font-bold text-white">
                        {formatarMoeda(lead.parcela_36x)}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5">
                      48x:{" "}
                      <span className="font-bold text-white">
                        {formatarMoeda(lead.parcela_48x)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-medium">
                    {getNomeVendedor(lead)}
                  </TableCell>
                  <TableCell>
                    {renderNotificadoBadge(lead.notificado_status)}
                    {lead.notificado_em && (
                      <div className="text-[10px] text-zinc-500 mt-1">
                        {formatarData(lead.notificado_em)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-2 items-center">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex gap-1.5 items-center min-w-[120px] justify-center"
                        >
                          <MessageSquare size={14} />
                          WhatsApp
                        </Button>
                      </a>

                      <a href={phoneUrl}>
                        <Button
                          size="sm"
                          className="bg-[#13283b] hover:bg-[#2f7ea1] text-white font-bold rounded-lg flex gap-1.5 items-center min-w-[120px] justify-center"
                        >
                          <Phone size={14} />
                          Ligar celular
                        </Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {leads.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500">
              Nenhum lead recebido até o momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leads;