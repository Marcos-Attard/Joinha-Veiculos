"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarPreco } from "@/features/showroom/utils/formatters";

interface ChatAssistantProps {
  logoSrc: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  messages: any[];
  setSelectedCar: (car: any) => void;
  isLoading: boolean;
  handleSendMessage: (e?: React.FormEvent) => void;
  inputValue: string;
  setInputValue: (val: string) => void;
  botaoAmareloAnimado: string;
  onBackToHome: () => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({
  logoSrc,
  scrollRef,
  messages,
  setSelectedCar,
  isLoading,
  handleSendMessage,
  inputValue,
  setInputValue,
  botaoAmareloAnimado,
  onBackToHome,
}) => {
  return (
    <div className="flex flex-col h-full w-full max-md relative">
      <div className="w-full flex items-center justify-between gap-3 pb-4 border-b border-white/5">
        <Button
          type="button"
          onClick={onBackToHome}
          className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={16} className="mr-2" />
          Voltar
        </Button>

        <img
          src={logoSrc}
          alt="Joinha Veiculos"
          style={{ width: "160px", height: "auto" }}
        />

        <div className="w-[92px]" aria-hidden="true" />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6 space-y-6 pb-32 px-2 no-scrollbar"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col w-full",
              msg.sender === "user" ? "items-end" : "items-start"
            )}
          >
            {msg.text && (
              <div
                className={cn(
                  "max-w-[85%] px-5 py-4 rounded-[22px] text-[15px]",
                  msg.sender === "user"
                    ? "bg-zinc-800 text-white"
                    : "bg-[#161616] border border-white/10"
                )}
              >
                {msg.text}
              </div>
            )}

            {msg.cars && (
              <div className="car-list-container w-full space-y-4">
                {msg.cars.map((car: any) => (
                  <div
                    key={car.id}
                    className="w-full bg-[#111] rounded-[35px] border border-white/10 mt-4 overflow-hidden"
                  >
                    <div className="w-full h-48 bg-black p-2 flex items-center justify-center">
                      <img
                        src={car.foto_url}
                        alt={`${car.marca} ${car.modelo}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    <div className="p-6">
                      <h4 className="font-black text-white text-2xl uppercase italic">
                        {car.marca} {car.modelo}
                      </h4>

                      <p className="text-[#FFD700] font-black text-3xl mt-1">
                        {formatarPreco(car.preco)}
                      </p>

                      <Button
                        onClick={() => setSelectedCar(car)}
                        className="w-full bg-zinc-800/50 text-white font-bold py-6 rounded-2xl border border-white/10 mt-4 uppercase text-xs"
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 p-4 text-zinc-500 italic text-sm">
            <Loader2 className="animate-spin" size={16} />
            Jarvis processando...
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 bg-black">
        <form
          onSubmit={handleSendMessage}
          className="flex gap-2 bg-[#1a1a1a] p-2 rounded-[25px]"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="bg-transparent border-none text-white focus-visible:ring-0"
            placeholder="Digite aqui..."
          />

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
  );
};

export default ChatAssistant;