"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  parseMoney,
  somenteNumeros,
  formatarPreco,
} from "@/features/showroom/utils/formatters";
import { validarCPF } from "@/features/showroom/utils/validators";
import {
  carregarEstoqueSupabase,
  enviarParaN8N,
} from "@/features/showroom/services/showroomService";
import {
  executarAnaliseCredito,
  confirmarEnvioLead,
} from "@/features/showroom/services/creditFlowService";
import VehicleDetail from "@/features/showroom/components/VehicleDetail";
import FinancingSimulation from "@/features/showroom/components/FinancingSimulation";
import CreditResults from "@/features/showroom/components/CreditResults";
import ChatAssistant from "@/features/showroom/components/ChatAssistant";
import WelcomeScreen from "@/features/showroom/components/WelcomeScreen";
import JoinhaLogo from "@/assets/Logo-Joinha.png";

const initialSimulationData = {
  nome: "",
  email: "",
  whatsapp: "",
  cpf: "",
  renda: "",
  entrada: "",
};

const initialSearchState = {
  filter: null,
  hasMore: false,
  nextOffset: 0,
};

const Showroom = () => {
  const navigate = useNavigate();
  const [isChatActive, setIsChatActive] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);

  const [isDuplicate, setIsDuplicate] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const [lastSearchState, setLastSearchState] = useState<{
    filter: any;
    hasMore: boolean;
    nextOffset: number;
  }>(initialSearchState);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const [simulationData, setSimulationData] = useState(initialSimulationData);

  const scrollRef = useRef<HTMLDivElement>(null);

  const logoSrc = JoinhaLogo;

  useEffect(() => {
    if (scrollRef.current) {
      const lastMessage = messages[messages.length - 1];
      const secondToLastMessage = messages[messages.length - 2];

      const carMessage = lastMessage?.cars
        ? lastMessage
        : secondToLastMessage?.cars
          ? secondToLastMessage
          : null;

      if (carMessage) {
        const carElements =
          scrollRef.current.querySelectorAll(".car-list-container");
        const lastCarList = carElements[carElements.length - 1];
        if (lastCarList) {
          lastCarList.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (selectedCar) {
      setIsDuplicate(false);
      setShowConfirmStep(false);
    }
  }, [selectedCar]);

  const valorCarroSelecionado = Number(selectedCar?.preco || 0);
  const entradaMinima = valorCarroSelecionado * 0.3;
  const entradaInformada = parseMoney(simulationData.entrada);
  const rendaInformada = parseMoney(simulationData.renda);

  const nomeValido = simulationData.nome.trim().length >= 3;
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    simulationData.email.trim()
  );
  const whatsappValido = somenteNumeros(simulationData.whatsapp).length === 11;
  const cpfValido = validarCPF(simulationData.cpf);
  const rendaValida = rendaInformada > 0;
  const entradaValida = entradaInformada >= entradaMinima && entradaMinima > 0;

  const formularioCreditoValido =
    nomeValido &&
    emailValido &&
    whatsappValido &&
    cpfValido &&
    rendaValida &&
    entradaValida;

  const obterErroFormularioCredito = () => {
    if (!nomeValido) return "Informe o nome completo.";
    if (!emailValido) return "Informe um e-mail válido.";
    if (!whatsappValido) return "Informe um WhatsApp válido com DDD.";
    if (!cpfValido) return "Informe um CPF válido.";
    if (!rendaValida) return "Informe sua renda mensal.";
    if (!entradaValida) {
      return `A entrada mínima para este veículo é ${formatarPreco(
        entradaMinima
      )}.`;
    }

    return "";
  };

  const voltarParaTelaInicial = () => {
    setIsChatActive(false);
    setMessages([]);
    setInputValue("");
    setIsLoading(false);
    setSelectedCar(null);
    setIsSimulationOpen(false);
    setAceiteTermos(false);
    setIsDuplicate(false);
    setShowConfirmStep(false);
    setIsSubmittingLead(false);
    setIsAnalyzing(false);
    setIsResultsOpen(false);
    setSimulationResults([]);
    setSimulationData(initialSimulationData);
    setLastSearchState(initialSearchState);
  };

  const analisarCredito = async () => {
    const erroFormulario = obterErroFormularioCredito();

    if (erroFormulario) {
      alert(erroFormulario);
      return;
    }

    await executarAnaliseCredito(
      selectedCar,
      simulationData,
      entradaMinima,
      entradaInformada,
      rendaInformada,
      setIsAnalyzing,
      setSimulationResults,
      setIsResultsOpen,
      setIsDuplicate
    );
  };

  const handleConfirmarEnvio = async () => {
    await confirmarEnvioLead(
      selectedCar,
      simulationData,
      simulationResults,
      setIsSubmittingLead,
      () => {
        setIsChatActive(false);
        setSelectedCar(null);
        setIsSimulationOpen(false);
        setIsResultsOpen(false);
        setSimulationData(initialSimulationData);
        setAceiteTermos(false);
        setShowConfirmStep(false);
        setIsDuplicate(false);

        navigate("/");
      }
    );
  };

  const startAgente = () => {
    setIsChatActive(true);
    setMessages([
      {
        id: "1",
        text: "Olá! Sou a Maya, assistente virtual da Joinha Veículos. Poderia me informar seu nome?",
        sender: "ai",
      },
    ]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const txt = inputValue;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: txt, sender: "user" },
    ]);
    setInputValue("");

    enviarParaN8N(
      txt,
      lastSearchState,
      setIsLoading,
      setMessages,
      async (filtro, offset) => {
        await carregarEstoqueSupabase(
          filtro,
          offset,
          setIsLoading,
          setMessages,
          setLastSearchState
        );
      }
    );
  };

  const botaoAmareloAnimado =
    "hover:bg-[#FFD800] hover:scale-105 active:scale-95 transition-all duration-300";

  const possuiPreAprovacaoNosResultados = simulationResults.some(
    (item: any) => item.preAprovado
  );

  return (
    <div className="flex flex-col items-center justify-between min-h-screen w-full bg-[#081521] py-10 px-4 overflow-y-auto text-white font-sans">
      {!isChatActive ? (
        <WelcomeScreen logoSrc={logoSrc} startAgente={startAgente} />
      ) : (
        <ChatAssistant
          logoSrc={logoSrc}
          scrollRef={scrollRef}
          messages={messages}
          setSelectedCar={setSelectedCar}
          isLoading={isLoading}
          handleSendMessage={handleSendMessage}
          inputValue={inputValue}
          setInputValue={setInputValue}
          botaoAmareloAnimado={botaoAmareloAnimado}
          onBackToHome={voltarParaTelaInicial}
        />
      )}

      <VehicleDetail
        selectedCar={selectedCar}
        onClose={() => setSelectedCar(null)}
        onSimulate={() => setIsSimulationOpen(true)}
        botaoAmareloAnimado={botaoAmareloAnimado}
      />

      <FinancingSimulation
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        selectedCar={selectedCar}
        aceiteTermos={aceiteTermos}
        setAceiteTermos={setAceiteTermos}
        simulationData={simulationData}
        setSimulationData={setSimulationData}
        nomeValido={nomeValido}
        emailValido={emailValido}
        whatsappValido={whatsappValido}
        cpfValido={cpfValido}
        rendaValida={rendaValida}
        entradaValida={entradaValida}
        entradaMinima={entradaMinima}
        formularioCreditoValido={formularioCreditoValido}
        isAnalyzing={isAnalyzing}
        onAnalyse={analisarCredito}
        botaoAmareloAnimado={botaoAmareloAnimado}
      />

      <CreditResults
        isOpen={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
        selectedCar={selectedCar}
        simulationData={simulationData}
        simulationResults={simulationResults}
        isDuplicate={isDuplicate}
        showConfirmStep={showConfirmStep}
        setShowConfirmStep={setShowConfirmStep}
        isSubmittingLead={isSubmittingLead}
        onConfirmSend={handleConfirmarEnvio}
        possuiPreAprovacaoNosResultados={possuiPreAprovacaoNosResultados}
        botaoAmareloAnimado={botaoAmareloAnimado}
      />
    </div>
  );
};

export default Showroom;