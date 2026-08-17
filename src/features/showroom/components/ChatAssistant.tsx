"use client";

import React from "react";
import LogoJoinha from "@/assets/Logo-Joinha.png";
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
  logoSrc: _logoSrc,
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
    <div className="relative flex h-full w-full flex-col">
      <div className="w-full border-b border-white/5 pb-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            onClick={onBackToHome}
            className="h-9 rounded-full border border-[#173146] bg-[#0b1623] px-3 text-sm font-semibold text-white hover:bg-[#13283b] hover:text-white"
          >
            <ChevronLeft size={14} className="mr-1" />
            Voltar
          </Button>

          <div className="w-[88px]" aria-hidden="true" />
        </div>

        <div className="mt-4 flex justify-center">
          <img
            src={LogoJoinha}
            alt="Joinha Veiculos"
            style={{
              width: "260px",
              height: "auto",
              display: "block",
            }}
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 overflow-y-auto space-y-6 px-2 py-6 pb-32"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex w-full flex-col",
              msg.sender === "user" ? "items-end" : "items-start"
            )}
          >
            {msg.text && (
              <div
                className={cn(
                  "max-w-[85%] rounded-[22px] px-5 py-4 text-[15px]",
                  msg.sender === "user"
                    ? "border border-[#173146] bg-[#13283b] text-white"
                    : "border border-[#173146] bg-[#0f1d2b] text-white"
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
                    className="mt-4 w-full overflow-hidden rounded-[35px] border border-[#173146] bg-[#0f1d2b]"
                  >
                    <div className="flex h-48 w-full items-center justify-center bg-[#07111b] p-2">
                      <img
                        src={car.foto_url}
                        alt={`${car.marca} ${car.modelo}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="p-6">
                      <h4 className="text-2xl font-black uppercase italic text-white">
                        {car.marca} {car.modelo}
                      </h4>

                      <p className="mt-1 text-3xl font-black text-[#FFD700]">
                        {formatarPreco(car.preco)}
                      </p>

                      <Button
                        onClick={() => setSelectedCar(car)}
                        className="mt-4 w-full rounded-2xl border border-[#173146] bg-[#13283b] py-6 text-xs font-bold uppercase text-white hover:bg-[#2f7ea1] hover:text-white"
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
          <div className="flex gap-2 p-4 text-sm italic text-zinc-400">
            <Loader2 className="animate-spin" size={16} />
            Maya processando...
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-transparent p-4">
        <form
          onSubmit={handleSendMessage}
          className="flex gap-2 rounded-[25px] border border-[#173146] bg-[#0b1623] p-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="border-none bg-transparent text-white placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Digite aqui..."
          />

          <Button
            type="submit"
            className={cn(
              "h-12 w-12 rounded-full bg-[#FFD700] text-black hover:bg-[#ffdf33]",
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