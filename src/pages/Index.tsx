import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Car,
  Users,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  Clock,
  Bell,
  BellRing,
  Search,
  Shield,
  RefreshCcw,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const role = (localStorage.getItem("auth_role") || "lojista")
    .trim()
    .toLowerCase();
  const vendedorId = localStorage.getItem("vendedor_id");

  const isVendedor = role === "vendedor";
  const isLojista = ["lojista", "gerente", "admin", "adm", "administrador"].includes(role);
  const canManageGerentes = ["lojista", "admin", "adm", "administrador"].includes(role);

  const [estoqueCount, setEstoqueCount] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [novosHojeCount, setNovosHojeCount] = useState(0);
  const [aguardandoCount, setAguardandoCount] = useState(0);
  const [vendedoresTotal, setVendedoresTotal] = useState(0);
  const [vendedoresAtivos, setVendedoresAtivos] = useState(0);
  const [gerentesTotal, setGerentesTotal] = useState(0);
  const [gerentesAtivos, setGerentesAtivos] = useState(0);
  const [userName, setUserName] = useState("");
  const [pushStatus, setPushStatus] = useState("");
  const [pushAtivo, setPushAtivo] = useState(false);
  const [verificandoPush, setVerificandoPush] = useState(true);

  // Paleta azul do app
  const cardClass = "bg-[#0f1d2b] border-[#1b3145]";
  const cardAltClass = "bg-[#101f30] border-[#1b3145]";
  const panelClass = "bg-[#0b1623] border-[#173146]";
  const imageAreaClass = "bg-[#07111b]";
  const hoverBlue = "hover:bg-[#13283b]";

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("is_authenticated") === "true";

    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const name = localStorage.getItem("auth_nome") || "";
        setUserName(name);

        const { count: stockCount, error: stockError } = await (supabase as any)
          .from("vehicles_joinha")
          .select("*", { count: "exact", head: true })
          .eq("available", true);

        if (stockError) throw stockError;

        setEstoqueCount(stockCount || 0);

        let leadsQuery = (supabase as any)
          .from("leads_credito_joinha")
          .select("*", { count: "exact", head: true });

        let novosHojeQuery = (supabase as any)
          .from("leads_credito_joinha")
          .select("*", { count: "exact", head: true })
          .gte(
            "created_at",
            new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
          );

        let aguardandoQuery = (supabase as any)
          .from("leads_credito_joinha")
          .select("*", { count: "exact", head: true })
          .or(
            "notificado_status.is.null,notificado_status.eq.false,notificado_status.eq.Pendente,notificado_status.eq.SIM"
          );

        if (isVendedor && vendedorId) {
          const id = Number(vendedorId);

          leadsQuery = leadsQuery.eq("vendedor_id", id);
          novosHojeQuery = novosHojeQuery.eq("vendedor_id", id);
          aguardandoQuery = aguardandoQuery.eq("vendedor_id", id);
        }

        const [
          { count: totalLeads, error: totalLeadsError },
          { count: novosHoje, error: novosHojeError },
          { count: aguardando, error: aguardandoError },
        ] = await Promise.all([leadsQuery, novosHojeQuery, aguardandoQuery]);

        if (totalLeadsError) throw totalLeadsError;
        if (novosHojeError) throw novosHojeError;
        if (aguardandoError) throw aguardandoError;

        setLeadsCount(totalLeads || 0);
        setNovosHojeCount(novosHoje || 0);
        setAguardandoCount(aguardando || 0);

        if (isLojista || role === "gerente") {
          const { count: totalVendedores, error: totalVendedoresError } =
            await (supabase as any)
              .from("vendedores_joinha")
              .select("*", { count: "exact", head: true });

          if (totalVendedoresError) throw totalVendedoresError;

          const { count: ativosVendedores, error: ativosVendedoresError } =
            await (supabase as any)
              .from("vendedores_joinha")
              .select("*", { count: "exact", head: true })
              .eq("ativo", true);

          if (ativosVendedoresError) throw ativosVendedoresError;

          setVendedoresTotal(totalVendedores || 0);
          setVendedoresAtivos(ativosVendedores || 0);
        }

        if (canManageGerentes) {
          const { count: totalGerentes, error: totalGerentesError } =
            await (supabase as any)
              .from("profiles_joinha")
              .select("*", { count: "exact", head: true })
              .eq("role", "gerente");

          if (totalGerentesError) throw totalGerentesError;

          const { count: ativosGerentes, error: ativosGerentesError } =
            await (supabase as any)
              .from("profiles_joinha")
              .select("*", { count: "exact", head: true })
              .eq("role", "gerente")
              .eq("ativo", true);

          if (ativosGerentesError) throw ativosGerentesError;

          setGerentesTotal(totalGerentes || 0);
          setGerentesAtivos(ativosGerentes || 0);
        }
      } catch (error) {
        console.error("Erro ao carregar contadores da Joinha:", error);
      }
    };

    loadCounts();
  }, [canManageGerentes, isLojista, isVendedor, vendedorId, role]);

  const subtitle = isVendedor
    ? "Acesse seus leads ou consulte veículos do estoque da Joinha."
    : "Resumo da Joinha Veículos hoje.";

  const goToLeads = () => navigate("/leads");
  const goToStock = () => navigate("/estoque");
  const goToIntegrations = () => navigate("/integracoes");
  const goToBuscarVeiculo = () => navigate("/buscar-veiculo");
  const goToVendedores = () => navigate("/vendedores");
  const goToGerentes = () => navigate("/gerentes");

  const esperar = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const sincronizarSubscriptionDoVendedor = async (
    subscriptionId: string | null
  ) => {
    try {
      if (!isVendedor) return false;
      if (!vendedorId) return false;
      if (!subscriptionId) return false;

      const id = Number(vendedorId);

      const { error } = await (supabase as any)
        .from("vendedores_joinha")
        .update({
          onesignal_subscription_id: subscriptionId,
        })
        .eq("id", id);

      if (error) {
        console.error(
          "Erro ao atualizar onesignal_subscription_id do vendedor Joinha:",
          error
        );
        return false;
      }

      localStorage.setItem("onesignal_subscription_id", subscriptionId);
      return true;
    } catch (error) {
      console.error("Erro ao sincronizar subscription do vendedor Joinha:", error);
      return false;
    }
  };

  const obterSubscriptionId = (OneSignal: any): string | null => {
    return (
      OneSignal?.User?.PushSubscription?.id ||
      OneSignal?.User?.pushSubscription?.id ||
      OneSignal?.Subscription?.id ||
      OneSignal?.pushSubscription?.id ||
      null
    );
  };

  const obterOptedIn = (OneSignal: any): boolean => {
    return !!(
      OneSignal?.User?.PushSubscription?.optedIn ||
      OneSignal?.User?.pushSubscription?.optedIn ||
      false
    );
  };

  const lerEstadoPush = async (OneSignal: any) => {
    const permissao =
      typeof Notification !== "undefined"
        ? Notification.permission
        : "default";

    let optedIn = false;
    let subscriptionId: string | null = null;

    for (let i = 0; i < 12; i++) {
      try {
        optedIn = obterOptedIn(OneSignal);
        subscriptionId = obterSubscriptionId(OneSignal);

        if (subscriptionId) break;
      } catch (error) {
        console.error("Erro ao ler estado do OneSignal:", error);
      }

      await esperar(1000);
    }

    const ativo = permissao === "granted" && optedIn && !!subscriptionId;

    return {
      permissao,
      optedIn,
      subscriptionId,
      ativo,
    };
  };

  const verificarESincronizarPush = async () => {
    if (!isVendedor) {
      setVerificandoPush(false);
      return;
    }

    try {
      if (typeof window === "undefined") {
        setVerificandoPush(false);
        return;
      }

      const w = window as any;
      w.OneSignalDeferred = w.OneSignalDeferred || [];

      w.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          setPushStatus("Verificando notificações neste celular...");

          const estado = await lerEstadoPush(OneSignal);

          setPushAtivo(estado.ativo);

          if (estado.ativo && estado.subscriptionId) {
            const salvou = await sincronizarSubscriptionDoVendedor(
              estado.subscriptionId
            );

            if (salvou) {
              setPushStatus("Push ativo e sincronizado neste celular.");
              setPushAtivo(true);
            } else {
              setPushStatus("Push ativo, mas não foi possível sincronizar o ID.");
              setPushAtivo(false);
            }
          } else {
            setPushStatus("Notificações ainda não ativadas neste celular.");
            setPushAtivo(false);
          }
        } catch (error) {
          console.error("Erro ao verificar/sincronizar push:", error);
          setPushAtivo(false);
          setPushStatus("Não foi possível verificar as notificações.");
        } finally {
          setVerificandoPush(false);
        }
      });
    } catch (error) {
      console.error("Erro ao iniciar verificação do push:", error);
      setVerificandoPush(false);
      setPushAtivo(false);
      setPushStatus("Erro ao iniciar verificação das notificações.");
    }
  };

  useEffect(() => {
    verificarESincronizarPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, vendedorId]);

  const ativarNotificacoes = async () => {
    setVerificandoPush(true);

    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted") {
          setPushStatus("Solicitando permissão de notificações...");
          const permissao = await Notification.requestPermission();

          if (permissao !== "granted") {
            setPushStatus("Permissão de notificações não foi concedida.");
            setPushAtivo(false);
            setVerificandoPush(false);
            return;
          }
        }
      }

      const w = window as any;
      w.OneSignalDeferred = w.OneSignalDeferred || [];

      w.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          if (OneSignal?.User?.PushSubscription?.optIn) {
            await OneSignal.User.PushSubscription.optIn();
          } else if (OneSignal?.Notifications?.optIn) {
            await OneSignal.Notifications.optIn();
          }

          await esperar(2000);

          const estado = await lerEstadoPush(OneSignal);

          setPushAtivo(estado.ativo);

          if (estado.ativo && estado.subscriptionId) {
            const salvou = await sincronizarSubscriptionDoVendedor(
              estado.subscriptionId
            );

            if (salvou) {
              setPushStatus("Push ativo e sincronizado neste celular.");
              setPushAtivo(true);
            } else {
              setPushStatus("Push ativo, mas não foi possível sincronizar o ID.");
              setPushAtivo(false);
            }
          } else {
            setPushStatus("Não foi possível ativar as notificações neste celular.");
            setPushAtivo(false);
          }
        } catch (error) {
          console.error("Erro ao ativar notificações:", error);
          setPushStatus("Erro ao ativar notificações neste celular.");
          setPushAtivo(false);
        } finally {
          setVerificandoPush(false);
        }
      });
    } catch (error) {
      console.error("Erro ao solicitar notificações:", error);
      setPushStatus("Erro ao solicitar permissão de notificações.");
      setPushAtivo(false);
      setVerificandoPush(false);
    }
  };

  const vendedoresInativos = Math.max(vendedoresTotal - vendedoresAtivos, 0);
  const gerentesInativos = Math.max(gerentesTotal - gerentesAtivos, 0);

  return (
    <div className="space-y-8">
      <div>
        {isVendedor ? (
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xl font-bold tracking-tight">
              Bem-vindo,
            </span>
            <span className="text-4xl font-black text-white tracking-tight mt-1">
              {userName || "Vendedor"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xl font-bold tracking-tight">
              Olá,
            </span>
            <span className="text-4xl font-black text-white tracking-tight mt-1">
              {userName || "Administrador"}
            </span>
          </div>
        )}
        <p className="text-zinc-400 text-sm mt-2">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          className="border-[#d4af37] text-[#d4af37] px-4 py-2 font-black text-sm w-fit"
        >
          <Clock size={14} className="mr-2" />
          SINCRONIZADO
        </Badge>

        {isVendedor && pushAtivo && (
          <Badge
            variant="outline"
            className="border-emerald-500 text-emerald-400 px-4 py-2 font-black text-sm w-fit"
          >
            <BellRing size={14} className="mr-2" />
            PUSH ATIVO
          </Badge>
        )}
      </div>

      {isVendedor && (
        <Card className={`${panelClass} rounded-2xl`}>
          <CardContent className="p-6 md:p-8 flex flex-col gap-4">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Bell size={22} />
              Notificações Push
            </h2>

            {verificandoPush ? (
              <p className="text-zinc-400">
                Verificando e sincronizando notificações neste celular...
              </p>
            ) : pushAtivo ? (
              <p className="text-emerald-400 font-bold">
                Este celular já está pronto para receber novos leads.
              </p>
            ) : (
              <p className="text-zinc-400">
                Ative este celular para receber alertas quando chegarem novos
                leads.
              </p>
            )}

            {pushStatus && (
              <p className="text-sm text-zinc-400">{pushStatus}</p>
            )}

            <div className="flex flex-wrap gap-3">
              {!pushAtivo && !verificandoPush && (
                <Button
                  onClick={ativarNotificacoes}
                  className="w-fit bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
                >
                  Ativar notificações neste celular
                </Button>
              )}

              {!verificandoPush && (
                <Button
                  onClick={verificarESincronizarPush}
                  variant="outline"
                  className="w-fit border-[#173146] bg-transparent text-white hover:bg-[#13283b] hover:text-white"
                >
                  <RefreshCcw size={16} className="mr-2" />
                  Reverificar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLojista && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <Card className={`${cardClass} rounded-2xl`}>
              <CardContent className="p-5 min-h-[140px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                    Veículos em Estoque
                  </span>
                  <Car size={18} className="text-blue-400" />
                </div>
                <div className="text-4xl font-black text-white">
                  {estoqueCount}
                </div>
              </CardContent>
            </Card>

            <Card className={`${cardClass} rounded-2xl`}>
              <CardContent className="p-5 min-h-[140px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                    Total de Leads
                  </span>
                  <Users size={18} className="text-yellow-400" />
                </div>
                <div className="text-4xl font-black text-white">
                  {leadsCount}
                </div>
              </CardContent>
            </Card>

            <Card className={`${cardClass} rounded-2xl`}>
              <CardContent className="p-5 min-h-[140px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                    Novos (Hoje)
                  </span>
                  <TrendingUp size={18} className="text-emerald-400" />
                </div>
                <div className="text-4xl font-black text-white">
                  {novosHojeCount}
                </div>
              </CardContent>
            </Card>

            <Card className={`${cardClass} rounded-2xl`}>
              <CardContent className="p-5 min-h-[140px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                    Aguardando Contato
                  </span>
                  <MessageSquare size={18} className="text-purple-400" />
                </div>
                <div className="text-4xl font-black text-[#d4af37]">
                  {aguardandoCount}
                </div>
              </CardContent>
            </Card>

            <Card className={`${cardClass} rounded-2xl`}>
              <CardContent className="p-5 min-h-[140px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                    Vendedores
                  </span>
                  <Users size={18} className="text-[#d4af37]" />
                </div>

                <div>
                  <div className="text-4xl font-black text-white">
                    {vendedoresTotal}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    {vendedoresAtivos} ativos • {vendedoresInativos} inativos
                  </p>
                </div>
              </CardContent>
            </Card>

            {canManageGerentes && (
              <Card className={`${cardClass} rounded-2xl`}>
                <CardContent className="p-5 min-h-[140px] flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="text-zinc-500 text-sm font-black uppercase tracking-widest">
                      Gerentes
                    </span>
                    <Shield size={18} className="text-[#d4af37]" />
                  </div>

                  <div>
                    <div className="text-4xl font-black text-white">
                      {gerentesTotal}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      {gerentesAtivos} ativos • {gerentesInativos} inativos
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className={`${cardAltClass} rounded-2xl`}>
              <CardContent className="p-6 md:p-8 flex flex-col gap-4">
                <h2 className="text-2xl font-black text-white">
                  Consultar Estoque
                </h2>
                <p className="text-zinc-400">
                  Consulte o estoque real da Joinha e visualize os detalhes dos
                  veículos disponíveis.
                </p>
                <Button
                  onClick={goToStock}
                  className={`w-fit bg-transparent ${hoverBlue} text-[#d4af37] font-black px-0`}
                >
                  Ir para Estoque <ArrowRight size={18} className="ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className={`${cardAltClass} rounded-2xl`}>
              <CardContent className="p-6 md:p-8 flex flex-col gap-4">
                <h2 className="text-2xl font-black text-white">Vendedores</h2>
                <p className="text-zinc-400">
                  Ative ou desative vendedores da Joinha para controlar o rodízio de leads
                  e o acesso ao app.
                </p>
                <Button
                  onClick={goToVendedores}
                  className={`w-fit bg-transparent ${hoverBlue} text-[#d4af37] font-black px-0`}
                >
                  Gerenciar vendedores <ArrowRight size={18} className="ml-2" />
                </Button>
              </CardContent>
            </Card>

            {canManageGerentes && (
              <Card className={`${cardAltClass} rounded-2xl`}>
                <CardContent className="p-6 md:p-8 flex flex-col gap-4">
                  <h2 className="text-2xl font-black text-white">Gerentes</h2>
                  <p className="text-zinc-400">
                    Cadastre gerentes da Joinha e controle quem pode operar as áreas administrativas.
                  </p>
                  <div className="text-sm text-zinc-500">
                    {gerentesAtivos} ativos • {gerentesInativos} inativos
                  </div>
                  <Button
                    onClick={goToGerentes}
                    className={`w-fit bg-transparent ${hoverBlue} text-[#d4af37] font-black px-0`}
                  >
                    Gerenciar gerentes <ArrowRight size={18} className="ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className={`${cardAltClass} rounded-2xl`}>
              <CardContent className="p-6 md:p-8 flex flex-col gap-4">
                <h2 className="text-2xl font-black text-white">
                  Central de Leads
                </h2>
                <p className="text-zinc-400">
                  Visualize os contatos da Joinha e acompanhe seus clientes.
                </p>
                <Button
                  onClick={goToLeads}
                  className={`w-fit bg-transparent ${hoverBlue} text-[#d4af37] font-black px-0`}
                >
                  Ver todos os Leads <ArrowRight size={18} className="ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className={`${cardAltClass} rounded-2xl`}>
              <CardContent className="p-6 md:p-8 flex flex-col gap-4">
                <h2 className="text-2xl font-black text-white">
                  Integrações Bancárias
                </h2>
                <p className="text-zinc-400">
                  Gerencie bancos parceiros e credenciais do sistema.
                </p>
                <Button
                  onClick={goToIntegrations}
                  className={`w-fit bg-transparent ${hoverBlue} text-[#d4af37] font-black px-0`}
                >
                  Ir para Integrações <ArrowRight size={18} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {isVendedor && (
        <div className="space-y-4">
          <Card className={`${cardAltClass} rounded-2xl`}>
            <CardContent className="p-6 md:p-8 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <h2 className="text-2xl font-black text-white">Leads</h2>
                <Users size={22} className="text-[#d4af37]" />
              </div>
              <p className="text-zinc-400">
                Veja apenas os leads vinculados ao seu atendimento na Joinha.
              </p>
              <div className="text-4xl font-black text-white">{leadsCount}</div>
              <Button
                onClick={goToLeads}
                className={`w-fit bg-transparent ${hoverBlue} text-[#d4af37] font-black px-0`}
              >
                Abrir meus Leads <ArrowRight size={18} className="ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className={`${cardAltClass} rounded-2xl`}>
            <CardContent className="p-6 md:p-8 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <h2 className="text-2xl font-black text-white">
                  Busca Veículo no Estoque
                </h2>
                <Search size={22} className="text-[#d4af37]" />
              </div>
              <p className="text-zinc-400">
                Consulte veículos por placa, marca ou modelo, sem editar nada do
                estoque.
              </p>
              <Button
                onClick={goToBuscarVeiculo}
                className={`w-fit bg-transparent ${hoverBlue} text-[#d4af37] font-black px-0`}
              >
                Buscar veículo <ArrowRight size={18} className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Index;