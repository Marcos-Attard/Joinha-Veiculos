"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarPreco, parseMoney } from "@/features/showroom/utils/formatters";

interface CreditResultsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCar: any;
  simulationData: {
    nome: string;
    email: string;
    whatsapp: string;
    cpf: string;
    renda: string;
    entrada: string;
  };
  simulationResults: any[];
  isDuplicate: boolean;
  showConfirmStep: boolean;
  setShowConfirmStep: (val: boolean) => void;
  isSubmittingLead: boolean;
  onConfirmSend: () => void;
  possuiPreAprovacaoNosResultados: boolean;
  botaoAmareloAnimado: string;
}

const CreditResults: React.FC<CreditResultsProps> = ({
  isOpen,
  onClose,
  selectedCar,
  simulationData,
  simulationResults,
  isDuplicate,
  showConfirmStep,
  setShowConfirmStep,
  isSubmittingLead,
  onConfirmSend,
  possuiPreAprovacaoNosResultados,
  botaoAmareloAnimado,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black p-6 overflow-y-auto italic">
      <div className="max-w-md mx-auto pt-10 pb-10">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white"
        >
          <X size={32} />
        </button>

        <h2 className="text-[#FFD700] text-4xl font-black uppercase italic mb-3">
          Resultado da Análise
        </h2>

        <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
          Veja abaixo as opções calculadas com base na sua renda, entrada
          informada e valor do veículo escolhido.
        </p>

        <div className="bg-[#111] border border-[#FFD700]/40 rounded-[35px] p-6 mb-6 shadow-[0_0_30px_rgba(255,215,0,0.08)]">
          <h3 className="text-2xl font-black uppercase italic mb-5">
            {selectedCar?.marca} {selectedCar?.modelo}
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between gap-4 text-sm border-b border-white/5 pb-3">
              <span className="text-zinc-500 uppercase font-black text-[10px] tracking-widest">
                Valor total
              </span>
              <span className="font-bold text-white text-right">
                {formatarPreco(selectedCar?.preco)}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm border-b border-white/5 pb-3">
              <span className="text-zinc-500 uppercase font-black text-[10px] tracking-widest">
                Entrada informada
              </span>
              <span className="font-bold text-[#FFD700] text-right">
                {formatarPreco(parseMoney(simulationData.entrada))}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm border-b border-white/5 pb-3">
              <span className="text-zinc-500 uppercase font-black text-[10px] tracking-widest">
                Saldo a financiar
              </span>
              <span className="font-bold text-white text-right">
                {formatarPreco(
                  Number(selectedCar?.preco || 0) -
                    parseMoney(simulationData.entrada)
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-zinc-500 uppercase font-black text-[10px] tracking-widest">
                Base pré-aprovação
              </span>
              <span className="font-bold text-green-400 text-right">
                Até {formatarPreco(parseMoney(simulationData.renda) * 0.3)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {simulationResults.map((item, i) => (
            <div
              key={i}
              className={cn(
                "p-6 rounded-[30px] bg-zinc-900/50 border-2 transition-all",
                item.preAprovado
                  ? "border-green-500/80 shadow-[0_0_25px_rgba(34,197,94,0.10)]"
                  : "border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.10)]"
              )}
            >
              <div className="flex justify-between items-start gap-4 mb-5">
                <div>
                  <span className="block text-4xl font-black leading-none">
                    {item.parcelas}X
                  </span>
                  <span className="block text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-2">
                    Parcela estimada
                  </span>
                </div>

                <span
                  className={cn(
                    "text-[10px] font-black px-3 py-2 rounded-full bg-black border uppercase text-center",
                    item.preAprovado
                      ? "text-green-400 border-green-500/30"
                      : "text-orange-400 border-orange-500/30"
                  )}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-4xl font-black text-white mb-4">
                {formatarPreco(item.valorParcela)}
              </p>

              <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between gap-4 text-xs mb-2">
                  <span className="text-zinc-500 uppercase font-black">
                    Limite pela renda
                  </span>
                  <span className="font-bold text-green-400">
                    {formatarPreco(item.basePreAprovacao)}
                  </span>
                </div>

                {item.preAprovado ? (
                  <p className="text-green-400 text-[11px] font-black uppercase leading-relaxed mt-3">
                    Esta opção está dentro da base de pré-aprovação,
                    considerando até 30% da renda informada.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-orange-400 text-[11px] font-black uppercase leading-relaxed">
                      Para pré-aprovação neste plano, será necessária uma
                      entrada mínima de:
                    </p>

                    <p className="text-[#FFD700] text-2xl font-black">
                      {formatarPreco(item.entradaNecessaria)}
                    </p>

                    {item.acrescimoEntrada > 0 && (
                      <p className="text-zinc-400 text-[10px] font-bold uppercase leading-relaxed">
                        Ou seja, aproximadamente mais{" "}
                        {formatarPreco(item.acrescimoEntrada)} de entrada
                        para este plano entrar na base de pré-aprovação.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* BOTÃO FINAL DE AÇÃO E FLUXO DE CONFIRMAÇÃO */}
        {isDuplicate ? (
          <div className="mt-8 p-6 rounded-2xl bg-red-950/30 border border-red-500/30 text-center">
            <p className="text-red-400 font-bold text-sm leading-relaxed">
              Veículo já simulado anteriormente, para nova simulação aguardar o contato do consultor.
            </p>
          </div>
        ) : showConfirmStep ? (
          <div className="mt-8 space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-[#FFD700]/30 text-center">
              <p className="text-white font-bold text-sm leading-relaxed">
                {simulationData.nome}, assim que você confirmar este envio, um de nossos consultores entrará em contato o mais breve possível, por favor pedimos somente que o aguarde. A Joinha Veículos agradece.
              </p>
            </div>
            <Button
              onClick={onConfirmSend}
              disabled={isSubmittingLead}
              className={cn(
                "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 rounded-2xl text-lg uppercase flex justify-center items-center text-center leading-tight shadow-lg border-none",
                "hover:scale-105 active:scale-95 transition-all duration-300"
              )}
            >
              {isSubmittingLead ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={20} /> Enviando...
                </span>
              ) : (
                "CONFIRMAR ENVIO"
              )}
            </Button>
          </div>
        ) : possuiPreAprovacaoNosResultados ? (
          <Button
            onClick={() => setShowConfirmStep(true)}
            className={cn(
              "w-full bg-[#FFD700] text-black font-black py-5 px-4 rounded-2xl text-base uppercase mt-8 flex justify-center items-center text-center leading-tight shadow-[0_10px_30px_rgba(255,215,0,0.25)] border-none whitespace-normal h-auto break-words",
              botaoAmareloAnimado
            )}
          >
            Quero avançar com minha aprovação agora
          </Button>
        ) : (
          <div className="w-full bg-zinc-800 text-zinc-500 font-black py-8 rounded-2xl text-lg uppercase mt-8 flex justify-center items-center text-center leading-tight cursor-not-allowed border border-zinc-700">
            Ajuste a entrada para liberar a aprovação
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditResults;