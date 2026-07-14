"use client";

import { supabase } from "@/integrations/supabase/client";
import { parseMoney, formatarPreco } from "@/features/showroom/utils/formatters";
import { calcularResultadosSimulacaoCredito } from "@/features/showroom/utils/creditSimulation";
import { showSuccess, showError } from "@/utils/toast";

const notificarLeadNoN8N = async (payload: any) => {
  const webhookUrl = "https://semidefensively-hymnological-elvia.ngrok-free.dev/webhook/lead-notificacao";

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
      `Falha ao notificar lead no n8n (${response.status})${textoErro ? `: ${textoErro}` : ""}`
    );
  }

  return response.json().catch(() => null);
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

        if (!dadosN8n.resultados || !Array.isArray(dadosN8n.resultados)) {
          throw new Error("Resposta inválida do n8n");
        }

        resultados = dadosN8n.resultados;
      } catch (erro) {
        console.error("Falha na simulação n8n. Usando cálculo local:", erro);

        resultados = calcularResultadosSimulacaoCredito(
          valorCarro,
          entrada,
          renda,
          entradaMinima
        );
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

      const parcelasJson = resultados.map((item) => ({
        plano: `${item.parcelas}x`,
        parcela: Number(item.valorParcela.toFixed(2)),
        aprovado: item.preAprovado,
        limite_renda: Number(item.basePreAprovacao.toFixed(2)),
        entrada_necessaria: Number(item.entradaNecessaria.toFixed(2)),
        falta_entrada: Number(item.acrescimoEntrada.toFixed(2)),
      }));

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
        parcelas_json: parcelasJson,
        status: statusSimulacao,
      };

      setSimulationResults(resultados);
      setIsResultsOpen(true);

      // Verificação de duplicidade no Supabase
      try {
        const { data: existingLeads, error: leadError } = await supabase
          .from("Leads_Credito")
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
      const { data: simulacoesExistentes, error: erroBusca } = await supabase
        .from("simulacoes_credito")
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
        const { error: erroAtualizacao } = await supabase
          .from("simulacoes_credito")
          .update(dadosSimulacao)
          .eq("id", simulacaoExistente.id);

        if (erroAtualizacao) {
          console.error(
            "Erro ao atualizar simulação de crédito:",
            erroAtualizacao
          );
        }
      } else {
        const { error: erroInsercao } = await supabase
          .from("simulacoes_credito")
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
    const dezMinAtras = new Date(agora.getTime() - 10 * 60 * 1000).toISOString();

    // 1) Rodízio
    const { data, error } = await supabase.rpc("proximo_vendedor_rodizio");

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
    const { data: leadsExistentes, error: erroBuscaLead } = await supabase
      .from("Leads_Credito")
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
    } else {
      // 3) Inserir lead só se não existir um recente igual
      const { data: leadCriado, error: insertError } = await supabase
        .from("Leads_Credito")
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
              Number(selectedCar?.preco || 0) - parseMoney(simulationData.entrada),
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

      const { error: updateOkError } = await supabase
        .from("Leads_Credito")
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

      await supabase
        .from("Leads_Credito")
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