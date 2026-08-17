"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Calendar,
  Gauge,
  Zap,
  Fuel,
  Hash,
  DoorOpen,
  TextQuote,
  Info,
  Phone,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarPreco } from "@/features/showroom/utils/formatters";
import { obterLojaVeiculo } from "@/features/showroom/utils/storeInfo";

interface VehicleDetailProps {
  selectedCar: any;
  onClose: () => void;
  onSimulate: () => void;
  botaoAmareloAnimado: string;
}

const VehicleDetail: React.FC<VehicleDetailProps> = ({
  selectedCar,
  onClose,
  onSimulate,
  botaoAmareloAnimado,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const imagens = useMemo(() => {
    const imagensArray =
      Array.isArray(selectedCar?.images_large) && selectedCar.images_large.length > 0
        ? selectedCar.images_large.filter(Boolean)
        : [];

    if (imagensArray.length > 0) {
      return imagensArray;
    }

    if (selectedCar?.foto_url) {
      return [selectedCar.foto_url];
    }

    return [];
  }, [selectedCar]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedCar]);

  if (!selectedCar) return null;

  const lojaSelecionada = obterLojaVeiculo(selectedCar);

  const imagemAtual = imagens[currentImageIndex] || selectedCar.foto_url || "";

  const irAnterior = () => {
    if (imagens.length <= 1) return;
    setCurrentImageIndex((atual) =>
      atual === 0 ? imagens.length - 1 : atual - 1
    );
  };

  const irProxima = () => {
    if (imagens.length <= 1) return;
    setCurrentImageIndex((atual) =>
      atual === imagens.length - 1 ? 0 : atual + 1
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      <div className="relative w-full max-w-lg mx-auto min-h-screen bg-black pb-10">
        <button
          type="button"
          onClick={onClose}
          className="fixed top-6 right-6 z-[60] bg-black/60 p-2 rounded-full text-white backdrop-blur-md border border-white/10"
        >
          <X size={24} />
        </button>

        <div className="relative w-full h-[45vh] bg-black flex items-center justify-center p-4">
          {imagemAtual ? (
            <>
              <img
                src={imagemAtual}
                alt={`${selectedCar.marca} ${selectedCar.modelo}`}
                className="max-w-full max-h-full object-contain select-none"
              />

              {imagens.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={irAnterior}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 border border-white/10 text-white p-3 rounded-full backdrop-blur-md"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <button
                    type="button"
                    onClick={irProxima}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 border border-white/10 text-white p-3 rounded-full backdrop-blur-md"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight size={22} />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                    {currentImageIndex + 1} / {imagens.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
              <ImageIcon size={32} />
              <span className="text-sm">Nenhuma imagem disponível</span>
            </div>
          )}
        </div>

        {imagens.length > 1 && (
          <div className="px-4 mt-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {imagens.map((img, index) => (
                <button
                  type="button"
                  key={`${img}-${index}`}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    "shrink-0 w-20 h-20 rounded-xl overflow-hidden border",
                    index === currentImageIndex
                      ? "border-[#FFD700]"
                      : "border-white/10 opacity-70"
                  )}
                >
                  <img
                    src={img}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-8 space-y-6 text-white">
          <div>
            <h2 className="text-3xl font-black uppercase italic">
              {selectedCar.marca} {selectedCar.modelo}
            </h2>

            <p className="text-[#FFD700] font-black text-3xl mt-2">
              {formatarPreco(selectedCar.preco)}
            </p>

            <div className="bg-zinc-900/30 p-5 rounded-3xl border border-white/5 mt-6">
              <h5 className="flex items-center gap-2 text-[#FFD700] text-xs font-black uppercase tracking-widest mb-3">
                <Info size={16} /> Loja do veículo
              </h5>

              <p className="text-zinc-300 text-sm leading-relaxed">
                <strong className="text-white">
                  {lojaSelecionada.storeName}
                </strong>
              </p>

              <p className="text-zinc-400 text-sm leading-relaxed mt-2">
                {lojaSelecionada.storeAddress}
              </p>

              <p className="text-zinc-400 text-sm leading-relaxed mt-2 flex items-center gap-2">
                <Phone size={14} className="text-[#FFD700]" />
                {lojaSelecionada.storePhone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Ano",
                val: selectedCar.ano,
                icon: <Calendar size={16} />,
              },
              {
                label: "KM",
                val: selectedCar.km,
                icon: <Gauge size={16} />,
              },
              {
                label: "Câmbio",
                val: selectedCar.cambio,
                icon: <Zap size={16} />,
              },
              {
                label: "Combustível",
                val: selectedCar.combustivel,
                icon: <Fuel size={16} />,
              },
              {
                label: "Cor",
                val: selectedCar.cor,
                icon: (
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: selectedCar.cor }}
                  />
                ),
              },
              {
                label: "Portas",
                val: selectedCar.portas,
                icon: <DoorOpen size={16} />,
              },
              {
                label: "Final da Placa",
                val: selectedCar.placa_final,
                icon: <Hash size={16} />,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col items-start"
              >
                <span className="text-[#FFD700] mb-2">{item.icon}</span>
                <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">
                  {item.label}
                </span>
                <span className="font-bold uppercase text-sm mt-1">
                  {item.val || "---"}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900/30 p-5 rounded-3xl border border-white/5">
              <h5 className="flex items-center gap-2 text-[#FFD700] text-xs font-black uppercase tracking-widest mb-3">
                <TextQuote size={16} /> Opcionais
              </h5>
              <p className="text-zinc-300 text-sm leading-relaxed">
                {selectedCar.opcionais || "Não informados."}
              </p>
            </div>

            <div className="bg-zinc-900/30 p-5 rounded-3xl border border-white/5">
              <h5 className="flex items-center gap-2 text-[#FFD700] text-xs font-black uppercase tracking-widest mb-3">
                <Info size={16} /> Descrição
              </h5>
              <p className="text-zinc-300 text-sm leading-relaxed">
                {selectedCar.descricao || "Sem descrição adicional."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={onSimulate}
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
  );
};

export default VehicleDetail;