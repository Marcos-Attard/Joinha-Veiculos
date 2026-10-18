"use client";

import { supabase } from "@/integrations/supabase/client";
import { parseMoney, formatarPreco } from "@/features/showroom/utils/formatters";
import { calcularResultadosSimulacaoCredito } from "@/features/showroom/utils/creditSimulation";
import { showSuccess, showError } from "@/utils/toast";

const LEADS_TABLE = "leads_credito_joinha";
const SIMULACOES_TABLE = "simu_credito_joinha";

const notificarLeadNoN8N = async (payload: any) => {
  const webhookUrl =
    "https://semidefensively-hymnological-elvia.ngrok-free.dev/webhook/a3c917a1-1e38-46cb-810a-724b2b0fdb89";

  if (!webhookUrl) {
    throw new Error(
      "VITE_N8N_LEAD_NOTIFICATION_WEBHOOK não configurado no .env"
    );
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const textoErro = await response.text().catch(() => "");
    throw new Error(
      `Falha ao notificar lead no n8n (${response.status})${
        textoErro ? `: ${textoErro}` : ""
      }`
    );
  }

  return response.json().catch(() => null);
};

const normalizarResultadoCredito = (item: any) => {
  const preAprovado = item?.preAprovado ?? item?.aprovado ?? false;

  const parcelasRaw = item?.parcelas ?? item?.plano ?? 0;
  const parcelas =
    typeof parcelasRaw === "string"
      ? Number(String(parcelasRaw).replace(/\D/g, "")) || 0
      : Number(parcelasRaw || 0);

  const valorParcela = Number(item?.valorParcela ?? item?.parcela ?? 0);
  const basePreAprovacao = Number(
    item?.basePreAprovacao ?? item?.limite_renda ?? 0
  );
  const entradaNecessaria = Number(
    item?.entradaNecessaria ?? item?.entrada_necessaria ?? 0
  );
  const acrescimoEntrada = Number(
    item?.acrescimoEntrada ?? item?.falta_entrada ?? 0
  );

  return {
    ...item,
    parcelas,
    valorParcela,
    preAprovado,
    aprovado: item?.aprovado ?? preAprovado,
    status: item?.status ?? (preAprovado ? "pre_aprovado" : "ajuste_entrada"),
    basePreAprovacao,
    entradaNecessaria,
    acrescimoEntrada,
  };
};

const montarAnaliseLead = (simulationResults: any[]) => {
  const basePreAprovacao = Number(simulationResults?.[0]?.basePreAprovacao ?? 0);

  const parcelas = Object.fromEntries(
    (simulationResults || []).map((r) => {
      const aprovado = r?.preAprovado ?? r?.aprovado ?? false;
      const chave = `${r?.parcelas}x`;

      return [
        chave,
        {
          valor: Number(Number(r?.valorParcela || 0).toFixed(2)),
          status: aprovado ? "pre_aprovado" : "ajuste_entrada",
          texto: aprovado
            ? "Esta opção está dentro da base de pré-aprovação, considerando até 30% da renda informada."
            : "Para pré-aprovação neste plano, será necessária uma entrada mínima.",
          entrada_minima: Number(Number(r?.entradaNecessaria || 0).toFixed(2)),
          limite_renda: Number(Number(r?.basePreAprovacao || 0).toFixed(2)),
          base_pre_aprovacao: Number(Number(r?.basePreAprovacao || 0).toFixed(2)),
          preAprovado: aprovado,
          aprovado,
        },
      ];
    })
  );

  return {
    base_pre_aprovacao: basePreAprovacao,
    limite_renda: basePreAprovacao,
    parcelas,
  };
};

export const executarAnaliseCredito = async (
  selectedCar: any,
  simulationData: {
    nome: string;
    email: string;
    whatsapp: string;
    cpf: string;
    renda: string;
    entrada: string;
  },
  entradaMinima: number,
  entradaInformada: number,
  rendaInformada: number,
  setIsAnalyzing: (val: boolean) => void,
  setSimulationResults: (results: any[]) => void,
  setIsResultsOpen: (val: boolean) => void,
  setIsDuplicate: (val: boolean) => void
) => {
  setIsAnalyzing(true);

  setTimeout(async () => {
    try {
      const valorCarro = Number(selectedCar?.preco || 0);
      const entrada = entradaInformada;
      const renda = rendaInformada;

      let resultados: any[] = [];

      try {
        const respostaN8n = await fetch(
          "https://semidefensively-hymnological-elvia.ngrok-free.dev/webhook/simulacao-veiculo",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              valorVeiculo: valorCarro,
              entrada: entrada,
              rendaMensal: renda,
              tipoVeiculo: "usado",
              perfilCliente: "medio",
              incluirSeguro: true,
              planos: [12, 24, 36, 48],
            }),
          }
        );

        if (!respostaN8n.ok) {
          throw new Error("Falha ao chamar n8n");
        }

        const dadosN8n = await respostaN8n.json();

        const resultadosBrutos =
          (Array.isArray(dadosN8n?.resultados) && dadosN8n.resultados) ||
          (Array.isArray(dadosN8n?.data?.resultados) &&
            dadosN8n.data.resultados) ||
          (Array.isArray(dadosN8n?.body?.resultados) &&
            dadosN8n.body.resultados) ||
          (Array.isArray(dadosN8n?.json?.resultados) && dadosN8n.json.resultados) ||
          (Array.isArray(dadosN8n) && dadosN8n) ||
          null;

        if (!resultadosBrutos) {
          throw new Error("Resposta inválida do n8n");
        }

        resultados = resultadosBrutos.map(normalizarResultadoCredito);
      } catch (erro) {
        console.error("Falha na simulação n8n. Usando cálculo local:", erro);

        resultados = calcularResultadosSimulacaoCredito(
          valorCarro,
          entrada,
          renda,
          entradaMinima
        ).map(normalizarResultadoCredito);
      }

      const possuiPreAprovacao = resultados.some((item) => item.preAprovado);

      const planosPreAprovados = resultados
        .filter((item) => item.preAprovado)
        .map((item) => `${item.parcelas}x`);

      const menorEntradaNecessaria = resultados
        .filter((item) => !item.preAprovado)
        .reduce((menor, item) => {
          if (!menor) return item.entradaNecessaria;
          return item.entradaNecessaria < menor ? item.entradaNecessaria : menor;
        }, 0);

      const statusSimulacao = possuiPreAprovacao
        ? `PRÉ-APROVADO: ${planosPreAprovados.join(", ")}`
        : `SEM PRÉ-APROVAÇÃO - Entrada sugerida a partir de ${formatarPreco(
            menorEntradaNecessaria || entradaMinima
          )}`;

      const analiseLead = montarAnaliseLead(resultados);

      const carroSimulado = `${selectedCar?.marca} ${selectedCar?.modelo}`;

      const dadosSimulacao = {
        nome: simulationData.nome.trim(),
        email: simulationData.email.trim().toLowerCase(),
        whatsapp: simulationData.whatsapp,
        cpf: simulationData.cpf,
        renda: renda,
        entrada: entrada,
        carro: carroSimulado,
        valor_carro: valorCarro,
        status: statusSimulacao,
      };

      setSimulationResults(resultados);
      setIsResultsOpen(true);

      // Verificação de duplicidade no Supabase
      try {
        const { data: existingLeads, error: leadError } = await (
          supabase as any
        )
          .from(LEADS_TABLE)
          .select("id")
          .eq("cpf", simulationData.cpf)
          .eq("veiculo_interesse", carroSimulado)
          .limit(1);

        if (leadError) throw leadError;

        if (existingLeads && existingLeads.length > 0) {
          setIsDuplicate(true);
        } else {
          setIsDuplicate(false);
        }
      } catch (err) {
        console.error("Erro ao verificar duplicidade de lead:", err);
      }

      // Salvar simulação de crédito
      const { data: simulacoesExistentes, error: erroBusca } = await (
        supabase as any
      )
        .from(SIMULACOES_TABLE)
        .select("id")
        .eq("cpf", simulationData.cpf)
        .eq("carro", carroSimulado)
        .order("created_at", { ascending: false })
        .limit(1);

      if (erroBusca) {
        console.error("Erro ao buscar simulação existente:", erroBusca);
        return;
      }

      const simulacaoExistente = simulacoesExistentes?.[0];

      if (simulacaoExistente?.id) {
        const { error: erroAtualizacao } = await (supabase as any)
          .from(SIMULACOES_TABLE)
          .update(dadosSimulacao)
          .eq("id", simulacaoExistente.id);

        if (erroAtualizacao) {
          console.error(
            "Erro ao atualizar simulação de crédito:",
            erroAtualizacao
          );
        }
      } else {
        const { error: erroInsercao } = await (supabase as any)
          .from(SIMULACOES_TABLE)
          .insert([dadosSimulacao]);

        if (erroInsercao) {
          console.error("Erro ao salvar simulação de crédito:", erroInsercao);
        }
      }
    } catch (error: any) {
      console.error("Erro na análise de crédito:", error);
      showError("Erro ao processar análise de crédito: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, 2500);
};

export const confirmarEnvioLead = async (
  selectedCar: any,
  simulationData: {
    nome: string;
    email: string;
    whatsapp: string;
    cpf: string;
    renda: string;
    entrada: string;
  },
  simulationResults: any[],
  setIsSubmittingLead: (val: boolean) => void,
  onSuccess: () => void
) => {
  setIsSubmittingLead(true);

  try {
    const p12 =
      simulationResults.find((r) => r.parcelas === 12)?.valorParcela || 0;
    const p24 =
      simulationResults.find((r) => r.parcelas === 24)?.valorParcela || 0;
    const p36 =
      simulationResults.find((r) => r.parcelas === 36)?.valorParcela || 0;
    const p48 =
      simulationResults.find((r) => r.parcelas === 48)?.valorParcela || 0;

    const veiculoInteresse = `${selectedCar?.marca} ${selectedCar?.modelo}`;
    const agora = new Date();
    const dezMinAtras = new Date(
      agora.getTime() - 10 * 60 * 1000
    ).toISOString();

    const analiseLead = montarAnaliseLead(simulationResults);

    // 1) Rodízio
    const { data, error } = await supabase.rpc(
      "proximo_vendedor_rodizio_joinha"
    );

    if (error) {
      showError("Não foi possível designar um vendedor: " + error.message);
      return;
    }

    let vendedorRaw = null;
    if (data) {
      vendedorRaw = Array.isArray(data) ? data[0] : data;
    }

    let vendedorEscolhido = null;
    if (vendedorRaw) {
      vendedorEscolhido = {
        vendedor_id: vendedorRaw.id || vendedorRaw.vendedor_id || null,
        vendedor_nome: vendedorRaw.nome || vendedorRaw.vendedor_nome || null,
        vendedor_telefone:
          vendedorRaw.telefone || vendedorRaw.vendedor_telefone || null,
      };
    }

    if (!vendedorEscolhido || !vendedorEscolhido.vendedor_id) {
      showError("Não foi possível designar um vendedor válido no rodízio.");
      return;
    }

    // 2) Verificar se já existe lead recente igual
    const { data: leadsExistentes, error: erroBuscaLead } = await (
      supabase as any
    )
      .from(LEADS_TABLE)
      .select("id, notificado_status, created_at")
      .eq("cpf", simulationData.cpf)
      .eq("veiculo_interesse", veiculoInteresse)
      .gte("created_at", dezMinAtras)
      .order("created_at", { ascending: false })
      .limit(1);

    if (erroBuscaLead) {
      throw erroBuscaLead;
    }

    let leadId: string | null = null;

    if (leadsExistentes && leadsExistentes.length > 0) {
      leadId = leadsExistentes[0].id;

      const { error: updateError } = await (supabase as any)
        .from(LEADS_TABLE)
        .update({
          analise: analiseLead,
        })
        .eq("id", leadId);

      if (updateError) throw updateError;
    } else {
      // 3) Inserir lead só se não existir um recente igual
      const { data: leadCriado, error: insertError } = await (supabase as any)
        .from(LEADS_TABLE)
        .insert([
          {
            nome: simulationData.nome,
            telefone: simulationData.whatsapp,
            email: simulationData.email,
            cpf: simulationData.cpf,
            renda: parseMoney(simulationData.renda),
            veiculo_interesse: veiculoInteresse,
            valor_veiculo: Number(selectedCar?.preco || 0),
            entrada: parseMoney(simulationData.entrada),
            saldo_financiado:
              Number(selectedCar?.preco || 0) -
              parseMoney(simulationData.entrada),
            parcela_12x: p12,
            parcela_24x: p24,
            parcela_36x: p36,
            parcela_48x: p48,
            status: "Novo",
            vendedor_id: vendedorEscolhido.vendedor_id,
            vendedor_nome: vendedorEscolhido.vendedor_nome,
            vendedor_telefone: vendedorEscolhido.vendedor_telefone,
            notificado_status: "PENDENTE",
            notificado_em: null,
            analise: analiseLead,
          },
        ])
        .select("id")
        .single();

      if (insertError) throw insertError;

      leadId = leadCriado.id;
    }

    // 4) Tentar notificar
    try {
      await notificarLeadNoN8N({
        lead_id: leadId,
        nome: simulationData.nome,
        telefone: simulationData.whatsapp,
        email: simulationData.email,
        cpf: simulationData.cpf,
        vendedor_id: vendedorEscolhido.vendedor_id,
        vendedor_nome: vendedorEscolhido.vendedor_nome,
        vendedor_telefone: vendedorEscolhido.vendedor_telefone,
        veiculo_interesse: veiculoInteresse,
        valor_veiculo: Number(selectedCar?.preco || 0),
        entrada: parseMoney(simulationData.entrada),
        saldo_financiado:
          Number(selectedCar?.preco || 0) - parseMoney(simulationData.entrada),
        parcela_12x: p12,
        parcela_24x: p24,
        parcela_36x: p36,
        parcela_48x: p48,
        status: "Novo",
      });

      const { error: updateOkError } = await (supabase as any)
        .from(LEADS_TABLE)
        .update({
          notificado_status: "SIM",
          notificado_em: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (updateOkError) {
        console.error("Erro ao marcar lead como notificado:", updateOkError);
      }

      showSuccess("Simulação enviada com sucesso!");
      onSuccess();
    } catch (notifError: any) {
      console.error("Erro ao notificar vendedor:", notifError);

      await (supabase as any)
        .from(LEADS_TABLE)
        .update({
          notificado_status: "ERRO",
        })
        .eq("id", leadId);

      showError("Lead salvo, mas a notificação do vendedor falhou.");
      onSuccess();
    }
  } catch (err: any) {
    console.error("Erro ao salvar lead:", err);
    showError("Erro ao enviar simulação: " + err.message);
  } finally {
    setIsSubmittingLead(false);
  }
};