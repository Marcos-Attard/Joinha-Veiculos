"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  User,
  Mail,
  Phone,
  CreditCard,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarPreco, formatarWhatsApp, formatarCPF, formatarMoedaInput } from "@/features/showroom/utils/formatters";

interface FinancingSimulationProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCar: any;
  aceiteTermos: boolean;
  setAceiteTermos: (val: boolean) => void;
  simulationData: {
    nome: string;
    email: string;
    whatsapp: string;
    cpf: string;
    renda: string;
    entrada: string;
  };
  setSimulationData: React.Dispatch<React.SetStateAction<{
    nome: string;
    email: string;
    whatsapp: string;
    cpf: string;
    renda: string;
    entrada: string;
  }>>;
  nomeValido: boolean;
  emailValido: boolean;
  whatsappValido: boolean;
  cpfValido: boolean;
  rendaValida: boolean;
  entradaValida: boolean;
  entradaMinima: number;
  formularioCreditoValido: boolean;
  isAnalyzing: boolean;
  onAnalyse: () => void;
  botaoAmareloAnimado: string;
}

const FinancingSimulation: React.FC<FinancingSimulationProps> = ({
  isOpen,
  onClose,
  selectedCar,
  aceiteTermos,
  setAceiteTermos,
  simulationData,
  setSimulationData,
  nomeValido,
  emailValido,
  whatsappValido,
  cpfValido,
  rendaValida,
  entradaValida,
  entradaMinima,
  formularioCreditoValido,
  isAnalyzing,
  onAnalyse,
  botaoAmareloAnimado,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black p-8 overflow-y-auto">
      <div className="relative w-full max-w-lg mx-auto min-h-screen text-white">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-zinc-500"
        >
          <X size={32} />
        </button>

        <div className="mt-12 mb-8">
          <h2 className="text-[#FFD700] text-4xl font-black italic uppercase">
            QUASE LÁ!
          </h2>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg shadow-black/20">
            <p className="text-sm leading-relaxed text-zinc-300">
              <strong className="text-white">
                Para realizar a simulação de crédito do veículo{" "}
                {(selectedCar?.modelo || "").toUpperCase()}
              </strong>{" "}
              em nossos bancos parceiros, precisamos do preenchimento das
              informações abaixo.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              Os dados inseridos são criptografados e tratados com
              segurança, e somente serão usados para esta análise de
              crédito.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              <span className="font-bold text-[#FFD700]">OBS:</span> Ao
              continuar, você declara estar ciente e concorda com os termos
              desta analise.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aceiteTermos}
              onChange={(e) => setAceiteTermos(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-600"
            />
            <span className="text-sm text-zinc-300 leading-relaxed">
              Concordo com os termos e desejo prosseguir com a simulação.
            </span>
          </label>
        </div>

        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <User size={14} /> NOME COMPLETO
            </label>
            <Input
              value={simulationData.nome}
              onChange={(e) =>
                setSimulationData({
                  ...simulationData,
                  nome: e.target.value,
                })
              }
              className={cn(
                "bg-[#111] h-14 rounded-xl font-bold",
                simulationData.nome && !nomeValido
                  ? "border-red-500"
                  : "border-zinc-800"
              )}
              placeholder="Seu nome completo"
              required
              disabled={!aceiteTermos}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Mail size={14} /> E-MAIL
            </label>
            <Input
              value={simulationData.email}
              onChange={(e) =>
                setSimulationData({
                  ...simulationData,
                  email: e.target.value,
                })
              }
              className={cn(
                "bg-[#111] h-14 rounded-xl font-bold",
                simulationData.email && !emailValido
                  ? "border-red-500"
                  : "border-zinc-800"
              )}
              placeholder="seu@email.com"
              type="email"
              required
              disabled={!aceiteTermos}
            />
            {simulationData.email && !emailValido && (
              <p className="text-[10px] font-bold text-red-500 uppercase">
                Informe um e-mail válido.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Phone size={14} /> WHATSAPP
              </label>
              <Input
                value={simulationData.whatsapp}
                onChange={(e) =>
                  setSimulationData({
                    ...simulationData,
                    whatsapp: formatarWhatsApp(e.target.value),
                  })
                }
                className={cn(
                  "bg-[#111] h-14 rounded-xl font-bold",
                  simulationData.whatsapp && !whatsappValido
                    ? "border-red-500"
                    : "border-zinc-800"
                )}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                required
                disabled={!aceiteTermos}
              />
              {simulationData.whatsapp && !whatsappValido && (
                <p className="text-[10px] font-bold text-red-500 uppercase">
                  Informe DDD + número.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={14} /> CPF
              </label>
              <Input
                value={simulationData.cpf}
                onChange={(e) =>
                  setSimulationData({
                    ...simulationData,
                    cpf: formatarCPF(e.target.value),
                  })
                }
                className={cn(
                  "bg-[#111] h-14 rounded-xl font-bold",
                  simulationData.cpf && !cpfValido
                    ? "border-red-500"
                    : "border-zinc-800"
                )}
                placeholder="000.000.000-00"
                inputMode="numeric"
                required
                disabled={!aceiteTermos}
              />
              {simulationData.cpf && !cpfValido && (
                <p className="text-[10px] font-bold text-red-500 uppercase">
                  CPF inválido.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Wallet size={14} /> RENDA MENSAL ATUAL
            </label>
            <Input
              value={simulationData.renda}
              onChange={(e) =>
                setSimulationData({
                  ...simulationData,
                  renda: formatarMoedaInput(e.target.value),
                })
              }
              className={cn(
                "bg-[#111] h-14 rounded-xl font-bold",
                simulationData.renda && !rendaValida
                  ? "border-red-500"
                  : "border-zinc-800"
              )}
              placeholder="R$ 0.000,00"
              inputMode="numeric"
              required
              disabled={!aceiteTermos}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <ArrowRight size={14} /> VALOR DA ENTRADA
            </label>
            <Input
              value={simulationData.entrada}
              onChange={(e) =>
                setSimulationData({
                  ...simulationData,
                  entrada: formatarMoedaInput(e.target.value),
                })
              }
              className={cn(
                "bg-[#111] h-14 rounded-xl font-bold",
                simulationData.entrada && !entradaValida
                  ? "border-red-500"
                  : "border-zinc-800"
              )}
              placeholder={`ENTRADA MINIMA: ${formatarPreco(entradaMinima)}`}
              inputMode="numeric"
              required
              disabled={!aceiteTermos}
            />

            <p className="text-[9px] font-black text-zinc-600 uppercase italic">
              * SUGERIMOS NO MÍNIMO 30% DO VALOR DO VEÍCULO
            </p>

            {simulationData.entrada && !entradaValida && (
              <p className="text-[10px] font-black text-red-500 uppercase">
                A entrada mínima para este veículo é{" "}
                {formatarPreco(entradaMinima)}.
              </p>
            )}
          </div>

          {!formularioCreditoValido && (
            <p className="text-[10px] font-black text-zinc-500 uppercase text-center leading-relaxed">
              Preencha todos os campos obrigatórios corretamente para
              liberar a análise de crédito.
            </p>
          )}

          <Button
            onClick={onAnalyse}
            type="button"
            disabled={
              isAnalyzing || !formularioCreditoValido || !aceiteTermos
            }
            className={cn(
              "w-full font-black py-8 rounded-2xl text-xl uppercase mt-4 transition-all",
              formularioCreditoValido && !isAnalyzing
                ? cn("bg-[#FFD700] text-black", botaoAmareloAnimado)
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isAnalyzing ? "ANALISANDO..." : "ANALISAR CRÉDITO"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default FinancingSimulation;