"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import JoinhaLogo from '@/assets/Logo-Joinha.png';
import { Send, X, Loader2, Calendar, Gauge, Zap, Fuel, Hash,
DoorOpen, TextQuote, Info, User, Mail, Phone, CreditCard,
Wallet, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  formatarPreco, 
  somenteNumeros, 
  parseMoney, 
  formatarMoedaInput, 
  formatarCPF, 
  formatarWhatsApp 
} from '@/features/showroom/utils/formatters';
import { validarCPF } from '@/features/showroom/utils/validators';
import { normalizarFiltro } from '@/features/showroom/utils/filters';
import { calcularResultadosSimulacaoCredito } from '@/features/showroom/utils/creditSimulation';
import { enviarMensagemN8N } from '@/features/showroom/services/n8nService';

const Showroom = () => {
  const [isChatActive, setIsChatActive] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  
  // Estado para Paginação
  const [lastSearchState, setLastSearchState] = useState({
    filter: null,
    hasMore: false,
    nextOffset: 0
  });

  // Estados para a Lógica de Crédito
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const [simulationData, setSimulationData] = useState({
    nome: '', email: '', whatsapp: '', cpf: '', renda: '', entrada: '',
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const lastMessage = messages[messages.length - 1];
      const secondToLastMessage = messages[messages.length - 2];

      const carMessage = lastMessage?.cars ? lastMessage : (secondToLastMessage?.cars ? secondToLastMessage : null);

      if (carMessage) {
        const carElements = scrollRef.current.querySelectorAll('.car-list-container');
        const lastCarList = carElements[carElements.length - 1];
        if (lastCarList) {
          lastCarList.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const valorCarroSelecionado = Number(selectedCar?.preco || 0);
  const entradaMinima = valorCarroSelecionado * 0.3;
  const entradaInformada = parseMoney(simulationData.entrada);
  const rendaInformada = parseMoney(simulationData.renda);

  const nomeValido = simulationData.nome.trim().length >= 3;
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(simulationData.email.trim());
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
    if (!nomeValido) return 'Informe o nome completo.';
    if (!emailValido) return 'Informe um e-mail válido.';
    if (!whatsappValido) return 'Informe um WhatsApp válido com DDD.';
    if (!cpfValido) return 'Informe um CPF válido.';
    if (!rendaValida) return 'Informe sua renda mensal.';
    if (!entradaValida) {
      return `A entrada mínima para este veículo é ${formatarPreco(entradaMinima)}.`;
    }

    return '';
  };

  const analisarCredito = async () => {
    const erroFormulario = obterErroFormularioCredito();

    if (erroFormulario) {
      alert(erroFormulario);
      return;
    }

    setIsAnalyzing(true);
    
    setTimeout(async () => {
      const valorCarro = valorCarroSelecionado;
      const entrada = entradaInformada;
      const renda = rendaInformada;

      const resultados = calcularResultadosSimulacaoCredito(
        valorCarro,
        entrada,
        renda,
        entradaMinima
      );

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
        ? `PRÉ-APROVADO: ${planosPreAprovados.join(', ')}`
        : `SEM PRÉ-APROVAÇÃO - Entrada sugerida a partir de ${formatarPreco(menorEntradaNecessaria || entradaMinima)}`;

      const parcelasJson = resultados.map((item) => ({
        plano: `${item.parcelas}x`,
        parcela: Number(item.valorParcela.toFixed(2)),
        aprovado: item.preAprovado,
        limite_renda: Number(item.basePreAprovacao.toFixed(2)),
        entrada_necessaria: Number(item.entradaNecessaria.toFixed(2)),
        falta_entrada: Number(item.acrescimoEntrada.toFixed(2))
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
        status: statusSimulacao
      };

      setSimulationResults(resultados);
      setIsAnalyzing(false);
      setIsResultsOpen(true);

      const { data: simulacoesExistentes, error: erroBusca } = await supabase
        .from('simulacoes_credito')
        .select('id')
        .eq('cpf', simulationData.cpf)
        .eq('carro', carroSimulado)
        .order('created_at', { ascending: false })
        .limit(1);

      if (erroBusca) {
        console.error('Erro ao buscar simulação existente:', erroBusca);
        return;
      }

      const simulacaoExistente = simulacoesExistentes?.[0];

      if (simulacaoExistente?.id) {
        const { error: erroAtualizacao } = await supabase
          .from('simulacoes_credito')
          .update(dadosSimulacao)
          .eq('id', simulacaoExistente.id);

        if (erroAtualizacao) {
          console.error('Erro ao atualizar simulação de crédito:', erroAtualizacao);
        }
      } else {
        const { error: erroInsercao } = await supabase
          .from('simulacoes_credito')
          .insert([dadosSimulacao]);

        if (erroInsercao) {
          console.error('Erro ao salvar simulação de crédito:', erroInsercao);
        }
      }

    }, 2500);
  };

  const carregarEstoqueSupabase = async (filtro: any, offset: number = 0) => {
    setIsLoading(true);
    try {
      const f = normalizarFiltro(filtro);

      const normalizarValorFiltro = (valor: any) => {
        if (!valor) return "";

        let texto = String(valor)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();

        const mapa: Record<string, string> = {
          "automaticos": "automatico",
          "automaticas": "automatico",
          "automatica": "automatico",
          "automatico": "automatico",
          "manual": "manual",
          "manuais": "manual",
          "branca": "branco",
          "brancas": "branco",
          "brancos": "branco",
          "branco": "branco",
          "preta": "preto",
          "pretas": "preto",
          "pretos": "preto",
          "preto": "preto",
          "pratas": "prata",
          "prata": "prata",
          "vermelha": "vermelho",
          "vermelhas": "vermelho",
          "vermelhos": "vermelho",
          "vermelho": "vermelho",
          "flexivel": "flex",
          "flex": "flex",
          "fllex": "flex",
          "gasolina": "gasolina",
          "diesel": "diesel",
          "hibrido": "hibrido",
          "eletrico": "eletrico",
          "civi": "civic",
          "trakcer": "tracker",
          "tracker": "tracker",
          "pruto": "preto",
          "astromatico": "automatico",
          "carro": "carro",
          "carros": "carro",
          "moto": "motocicleta",
          "motos": "motocicleta",
          "motocicleta": "motocicleta",
          "motocicletas": "motocicleta",
          "outro": "outros",
          "outros": "outros",
        };

        return mapa[texto] || texto;
      };

      const limparTermoBusca = (valor: any) => {
        if (!valor) return "";

        let texto = String(valor)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[?.,!]/g, " ")
          .trim();

        const stopWords = ["vc", "voce", "vcs", "tem", "quero", "procuro", "busco", "uma", "um", "de", "da", "do", "carro", "moto", "veiculo", "por", "favor"];

        stopWords.forEach((word) => {
          texto = texto.replace(new RegExp(`\\b${word}\\b`, "g"), " ");
        });

        texto = texto.replace(/\bquadriciclos\b/g, "quadriciclo");

        return texto.trim().replace(/\s+/g, " ");
      };
      
      const params = new URLSearchParams();

      const rawQ =
        f?.marca ||
        f?.modelo ||
        f?.veiculo ||
        f?.termo ||
        f?.busca ||
        f?.query ||
        f?.q ||
        f?.tipo ||
        f?.categoria ||
        f?.category ||
        f?.vehicle_type ||
        (typeof filtro === "string" ? filtro : "");

      const qValue = limparTermoBusca(rawQ);

const termosQueNaoDevemIrNoQ = [
  "carro",
  "carros",
  "moto",
  "motos",
  "motocicleta",
  "motocicletas",
  "outro",
  "outros"
];

if (qValue && !termosQueNaoDevemIrNoQ.includes(qValue)) {
  params.append('q', qValue);
}

      const colorValue = normalizarValorFiltro(f?.cor);
      if (colorValue) params.append('color', colorValue);

      const gearValue = normalizarValorFiltro(f?.cambio);
      if (gearValue) params.append('gear', gearValue);

      const fuelValue = normalizarValorFiltro(f?.combustivel);
      if (fuelValue) params.append('fuel', fuelValue);

      const categoryValue = normalizarValorFiltro(f?.categoria || f?.category || f?.tipo);
      if (categoryValue) params.append('category', categoryValue);

      if (f?.ano) params.append('year', f.ano.toString());
      
      const plateFinal = f?.placaFinal || f?.finalPlaca;
      if (plateFinal) params.append('plate_final', plateFinal.toString());
      
      params.append('limit', '5');
      params.append('offset', offset.toString());

      const response = await fetch(`http://localhost:8000/vehicles/search?${params.toString()}`, {
        headers: {
          'x-api-key': 'styllo-estoque-123'
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar veículos na API');
      
      const data = await response.json();
      const vehicles = data.vehicles || [];

      setLastSearchState({
        filter: filtro,
        hasMore: data.has_more,
        nextOffset: data.next_offset || 0
      });

      if (vehicles.length > 0) {
        const mappedVehicles = vehicles.map((v: any) => ({
          id: v.external_id,
          marca: v.make,
          modelo: v.model,
          preco: v.price,
          foto_url: v.images?.[0] || 'https://via.placeholder.com/400x225?text=Sem+Foto',
          ano: v.year,
          km: v.mileage,
          cambio: v.gear,
          combustivel: v.fuel,
          cor: v.color,
          portas: v.doors || '---',
          placa_final: v.plate_final || '---',
          opcionais: '',
          descricao: v.description
        }));

        setMessages(prev => [...prev, { id: `cars-${Date.now()}`, sender: 'ai', cars: mappedVehicles }]);

        if (data.has_more) {
          setMessages(prev => [...prev, { id: `more-${Date.now()}`, text: "Tenho mais algumas opções. Gostaria de ver mais?", sender: 'ai' }]);
        } else {
          setMessages(prev => [...prev, { id: `end-${Date.now()}`, text: "Essas são todas as opções que encontrei com esse filtro.", sender: 'ai' }]);
        }
      } else if (offset === 0) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "Não encontrei veículos com esse filtro.", sender: 'ai' }]);
      }
    } catch (err) {
      console.error("Erro na busca:", err);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "Desculpe, tive um problema ao consultar o estoque agora.", sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const enviarParaN8N = async (textoUsuario: string) => {
    const inputLower = textoUsuario.toLowerCase().trim();
    const verMaisKeywords = ["sim", "quero", "quero ver mais", "mostra mais", "pode mostrar", "ver mais"];
    
    if (verMaisKeywords.includes(inputLower) && lastSearchState.hasMore) {
      await carregarEstoqueSupabase(lastSearchState.filter, lastSearchState.nextOffset);
      return;
    }

    const detectarCategoriaNoTexto = (texto: string) => {
      const t = texto.toLowerCase();

      if (/\bcarro\b|\bcarros\b/.test(t)) return "carro";
      if (/\bmoto\b|\bmotos\b|\bmotocicleta\b|\bmotocicletas\b/.test(t)) return "motocicleta";
      if (/\boutro\b|\boutros\b/.test(t)) return "outros";

      return "";
    };

    setIsLoading(true);
    try {
      const data = await enviarMensagemN8N(textoUsuario, "sessao-marcos");
      
      console.log("DEBUG N8N textoUsuario:", textoUsuario);
      console.log("DEBUG N8N resposta completa:", data);
      console.log("DEBUG N8N filtro:", data?.filtro);
      console.log("DEBUG N8N acao:", data?.acao);

      setMessages(prev => [...prev, { id: Date.now().toString(), text: data.texto, sender: 'ai' }]);
      
      if (data.acao === 'BUSCAR_ESTOQUE') {
        let filtroFinal = data.filtro || textoUsuario;

        if (typeof filtroFinal === 'object' && filtroFinal !== null) {
          const categoriaDetectada = detectarCategoriaNoTexto(textoUsuario);

          if (
            categoriaDetectada &&
            !filtroFinal.categoria &&
            !filtroFinal.category &&
            !filtroFinal.tipo
          ) {
            filtroFinal = {
              ...filtroFinal,
              categoria: categoriaDetectada
            };
          }
        }

        await carregarEstoqueSupabase(filtroFinal, 0);
      }
    } catch (err) {
      console.error("Erro n8n:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startAgente = () => {
    setIsChatActive(true);
    setMessages([{ id: '1', text: "Olá! Sou o Jarvis, assistente virtual da Joinha Veiculos. Poderia me informar seu nome?", sender: 'ai' }]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const txt = inputValue;
    setMessages(prev => [...prev, { id: Date.now().toString(), text: txt, sender: 'user' }]);
    setInputValue('');
    enviarParaN8N(txt);
  };

  const botaoAmareloAnimado =
    "hover:bg-[#FFD800] hover:scale-105 active:scale-95 transition-all duration-300";

  const possuiPreAprovacaoNosResultados = simulationResults.some((item: any) => item.preAprovado);

  return (
    <div className="flex flex-col items-center justify-between h-screen w-full bg-black py-10 px-4 overflow-hidden text-white font-sans">
      {!isChatActive ? (
        <>
          <div className="w-full flex justify-center">
            <img src={StylloLogo} alt="Styllo Motors" style={{ width: '280px', height: 'auto', display: 'block', objectFit: 'contain' }} />
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-2xl font-bold mb-2 tracking-wide uppercase">Seja bem-vindo à loja:</p>
            <h1 className="text-4xl font-extralight tracking-tight text-white mb-10">Styllo Motors</h1>
            <p className="text-xl font-bold text-white tracking-wide">clique abaixo e fale com nosso agente.</p>
            <Button onClick={startAgente} className="w-full max-w-xs bg-[#FFD700] hover:bg-[#FFD800] hover:scale-105 active:scale-95 transition-all duration-300 text-black font-black py-8 rounded-2xl text-xl uppercase mt-14 shadow-[0_10px_30px_rgba(255,215,0,0.3)]">
              Falar com nosso Agente
            </Button>
          </div>
          <div className="h-4" />
        </>
      ) : (
        <div className="flex flex-col h-full w-full max-md relative">
          <div className="w-full flex justify-center pb-4 border-b border-white/5">
            <img src={StylloLogo} alt="Styllo Motors" style={{ width: '100px', height: 'auto' }} />
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-6 pb-32 px-2 no-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col w-full", msg.sender === 'user' ? "items-end" : "items-start")}>
                {msg.text && (
                  <div className={cn("max-w-[85%] px-5 py-4 rounded-[22px] text-[15px]", msg.sender === 'user' ? "bg-zinc-800 text-white" : "bg-[#161616] border border-white/10")}>
                    {msg.text}
                  </div>
                )}
                {msg.cars && (
                  <div className="car-list-container w-full space-y-4">
                    {msg.cars.map((car: any) => (
                      <div key={car.id} className="w-full bg-[#111] rounded-[35px] border border-white/10 mt-4 overflow-hidden">
                        <div className="w-full h-48 bg-black p-2 flex items-center justify-center">
                          <img src={car.foto_url} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="p-6">
                          <h4 className="font-black text-white text-2xl uppercase italic">{car.marca} {car.modelo}</h4>
                          <p className="text-[#FFD700] font-black text-3xl mt-1">{formatarPreco(car.preco)}</p>
                          <Button onClick={() => setSelectedCar(car)} className="w-full bg-zinc-800/50 text-white font-bold py-6 rounded-2xl border border-white/10 mt-4 uppercase text-xs">
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && <div className="flex gap-2 p-4 text-zinc-500 italic text-sm"><Loader2 className="animate-spin" size={16} /> Jarvis processando...</div>}
          </div>
          <div className="absolute bottom-0 left-0 w-full p-4 bg-black">
            <form onSubmit={handleSendMessage} className="flex gap-2 bg-[#1a1a1a] p-2 rounded-[25px]">
              <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="bg-transparent border-none text-white focus-visible:ring-0" placeholder="Digite aqui..." />
              <Button
                type="submit"
                className={cn(
                  "bg-[#FFD700] text-black rounded-full h-12 w-12",
                  botaoAmareloAnimado
                )}
              >
                <Send size={18} />
              </Button>
            </form>
          </div>
        </div>
      )}

      {selectedCar && (
        <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
          <div className="relative w-full max-w-lg mx-auto min-h-screen bg-black pb-10">
            <button onClick={() => setSelectedCar(null)} className="fixed top-6 right-6 z-[60] bg-black/60 p-2 rounded-full text-white backdrop-blur-md border border-white/10">
              <X size={24} />
            </button>
            <div className="w-full h-[45vh] bg-black flex items-center justify-center p-4">
              <img src={selectedCar.foto_url} className="max-w-full max-h-full object-contain" />
            </div>
            <div className="p-8 space-y-6 text-white">
              <div>
                <h2 className="text-3xl font-black uppercase italic">{selectedCar.marca} {selectedCar.modelo}</h2>
                <p className="text-[#FFD700] text-4xl font-black mt-2">{formatarPreco(selectedCar.preco)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Ano', val: selectedCar.ano, icon: <Calendar size={16}/> },
                  { label: 'KM', val: selectedCar.km, icon: <Gauge size={16}/> },
                  { label: 'Câmbio', val: selectedCar.cambio, icon: <Zap size={16}/> },
                  { label: 'Combustível', val: selectedCar.combustivel, icon: <Fuel size={16}/> },
                  { label: 'Cor', val: selectedCar.cor, icon: <div className="w-4 h-4 rounded-full border border-white/20" style={{backgroundColor: selectedCar.cor}} /> },
                  { label: 'Portas', val: selectedCar.portas, icon: <DoorOpen size={16}/> },
                  { label: 'Final da Placa', val: selectedCar.placa_final, icon: <Hash size={16}/> }
                ].map((item, i) => (
                  <div key={i} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col items-start">
                    <span className="text-[#FFD700] mb-2">{item.icon}</span>
                    <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">{item.label}</span>
                    <span className="font-bold uppercase text-sm mt-1">{item.val || '---'}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="bg-zinc-900/30 p-5 rounded-3xl border border-white/5">
                   <h5 className="flex items-center gap-2 text-[#FFD700] text-xs font-black uppercase tracking-widest mb-3"><TextQuote size={16}/> Opcionais</h5>
                   <p className="text-zinc-300 text-sm leading-relaxed">{selectedCar.opcionais || 'Não informados.'}</p>
                </div>
                <div className="bg-zinc-900/30 p-5 rounded-3xl border border-white/5">
                   <h5 className="flex items-center gap-2 text-[#FFD700] text-xs font-black uppercase tracking-widest mb-3"><Info size={16}/> Descrição</h5>
                   <p className="text-zinc-300 text-sm leading-relaxed">{selectedCar.descricao || 'Sem descrição adicional.'}</p>
                </div>
              </div>
              <Button
                onClick={() => setIsSimulationOpen(true)}
                className={cn(
                  "w-full bg-[#FFD700] text-black font-black py-8 rounded-2xl text-lg uppercase shadow-2xl mt-4 leading-tight",
                  botaoAmareloAnimado
                )}
              >
                Simular Financiamento
              </Button>
            </div>
          </div>
        </div>
      )}

      {isSimulationOpen && (
        <div className="fixed inset-0 z-[100] bg-black p-8 overflow-y-auto">
          <div className="relative w-full max-w-lg mx-auto min-h-screen text-white">
            <button onClick={() => setIsSimulationOpen(false)} className="absolute top-0 right-0 text-zinc-500"><X size={32}/></button>
            <div className="mt-12 mb-8">
              <h2 className="text-[#FFD700] text-4xl font-black italic uppercase">QUASE LA!</h2>
              <p className="text-zinc-400 mt-2">Preencha os dados abaixo para simularmos o seu crédito para o <strong>{selectedCar?.modelo}</strong>.</p>
            </div>
            <form className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <User size={14}/> NOME COMPLETO
                </label>
                <Input
                  value={simulationData.nome}
                  onChange={(e) => setSimulationData({...simulationData, nome: e.target.value})}
                  className={cn(
                    "bg-[#111] h-14 rounded-xl font-bold",
                    simulationData.nome && !nomeValido ? "border-red-500" : "border-zinc-800"
                  )}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Mail size={14}/> E-MAIL
                </label>
                <Input
                  value={simulationData.email}
                  onChange={(e) => setSimulationData({...simulationData, email: e.target.value})}
                  className={cn(
                    "bg-[#111] h-14 rounded-xl font-bold",
                    simulationData.email && !emailValido ? "border-red-500" : "border-zinc-800"
                  )}
                  placeholder="seu@email.com"
                  type="email"
                  required
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
                    <Phone size={14}/> WHATSAPP
                  </label>
                  <Input
                    value={simulationData.whatsapp}
                    onChange={(e) => setSimulationData({...simulationData, whatsapp: formatarWhatsApp(e.target.value)})}
                    className={cn(
                      "bg-[#111] h-14 rounded-xl font-bold",
                      simulationData.whatsapp && !whatsappValido ? "border-red-500" : "border-zinc-800"
                    )}
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                    required
                  />
                  {simulationData.whatsapp && !whatsappValido && (
                    <p className="text-[10px] font-bold text-red-500 uppercase">
                      Informe DDD + número.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={14}/> CPF
                  </label>
                  <Input
                    value={simulationData.cpf}
                    onChange={(e) => setSimulationData({...simulationData, cpf: formatarCPF(e.target.value)})}
                    className={cn(
                      "bg-[#111] h-14 rounded-xl font-bold",
                      simulationData.cpf && !cpfValido ? "border-red-500" : "border-zinc-800"
                    )}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    required
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
                  <Wallet size={14}/> RENDA MENSAL ATUAL
                </label>
                <Input
                  value={simulationData.renda}
                  onChange={(e) => setSimulationData({...simulationData, renda: formatarMoedaInput(e.target.value)})}
                  className={cn(
                    "bg-[#111] h-14 rounded-xl font-bold",
                    simulationData.renda && !rendaValida ? "border-red-500" : "border-zinc-800"
                  )}
                  placeholder="R$ 0.000,00"
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <ArrowRight size={14}/> VALOR DA ENTRADA
                </label>
                <Input
                  value={simulationData.entrada}
                  onChange={(e) => setSimulationData({...simulationData, entrada: formatarMoedaInput(e.target.value)})}
                  className={cn(
                    "bg-[#111] h-14 rounded-xl font-bold",
                    simulationData.entrada && !entradaValida ? "border-red-500" : "border-zinc-800"
                  )}
                  placeholder={`ENTRADA MINIMA: ${formatarPreco(entradaMinima)}`}
                  inputMode="numeric"
                  required
                />

                <p className="text-[9px] font-black text-zinc-600 uppercase italic">
                  * SUGERIMOS NO MÍNIMO 30% DO VALOR DO VEÍCULO
                </p>

                {simulationData.entrada && !entradaValida && (
                  <p className="text-[10px] font-black text-red-500 uppercase">
                    A entrada mínima para este veículo é {formatarPreco(entradaMinima)}.
                  </p>
                )}
              </div>

              {!formularioCreditoValido && (
                <p className="text-[10px] font-black text-zinc-500 uppercase text-center leading-relaxed">
                  Preencha todos os campos obrigatórios corretamente para liberar a análise de crédito.
                </p>
              )}

              <Button
                onClick={analisarCredito}
                type="button"
                disabled={isAnalyzing || !formularioCreditoValido}
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
      )}

      {isResultsOpen && (
        <div className="fixed inset-0 z-[120] bg-black p-6 overflow-y-auto italic">
          <div className="max-w-md mx-auto pt-10 pb-10">
            <button
              onClick={() => setIsResultsOpen(false)}
              className="absolute top-6 right-6 text-white"
            >
              <X size={32}/>
            </button>

            <h2 className="text-[#FFD700] text-4xl font-black uppercase italic mb-3">
              Resultado da Análise
            </h2>

            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              Veja abaixo as opções calculadas com base na sua renda, entrada informada e valor do veículo escolhido.
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
                    {formatarPreco(Number(selectedCar?.preco || 0) - parseMoney(simulationData.entrada))}
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
                        Esta opção está dentro da base de pré-aprovação, considerando até 30% da renda informada.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-orange-400 text-[11px] font-black uppercase leading-relaxed">
                          Para pré-aprovação neste plano, será necessária uma entrada mínima de:
                        </p>

                        <p className="text-[#FFD700] text-2xl font-black">
                          {formatarPreco(item.entradaNecessaria)}
                        </p>

                        {item.acrescimoEntrada > 0 && (
                          <p className="text-zinc-400 text-[10px] font-bold uppercase leading-relaxed">
                            Ou seja, aproximadamente mais {formatarPreco(item.acrescimoEntrada)} de entrada para este plano entrar na base de pré-aprovação.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {possuiPreAprovacaoNosResultados ? (
              <a
                href={`https://wa.me/5511999999999?text=${encodeURIComponent(
                  `Olá! Fiz uma simulação para o ${selectedCar?.marca} ${selectedCar?.modelo}. Tive uma opção pré-aprovada e quero avançar agora com minha aprovação, envio de documentos e negociação.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "w-full bg-[#FFD700] text-black font-black py-8 rounded-2xl text-lg uppercase mt-8 flex justify-center items-center text-center leading-tight shadow-[0_10px_30px_rgba(255,215,0,0.25)]",
                  botaoAmareloAnimado
                )}
              >
                Quero avançar com minha aprovação agora
              </a>
            ) : (
              <div className="w-full bg-zinc-800 text-zinc-500 font-black py-8 rounded-2xl text-lg uppercase mt-8 flex justify-center items-center text-center leading-tight cursor-not-allowed border border-zinc-700">
                Ajuste a entrada para liberar a aprovação
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Showroom;