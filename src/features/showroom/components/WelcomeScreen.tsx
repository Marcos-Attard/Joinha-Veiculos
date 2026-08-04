"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  logoSrc: string;
  startAgente: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  logoSrc,
  startAgente,
}) => {
  return (
    <div className="flex flex-col items-center justify-between h-full w-full py-10">
      <div className="w-full flex justify-center">
        <img
          src={logoSrc}
          alt="Joinha Veiculos"
          style={{
            width: "340px",
            height: "auto",
            display: "block",
            objectFit: "contain",
          }}
        />
      </div>

      <div className="flex flex-col items-center text-center">
        <p className="text-2xl font-bold mb-2 tracking-wide uppercase">
          Seja bem-vindo à loja:
        </p>
        <h1 className="text-4xl font-extralight tracking-tight text-white mb-10">
          Joinha Veiculos
        </h1>
        <p className="text-xl font-bold text-white tracking-wide">
          clique abaixo e fale com nosso agente.
        </p>

        <Button
          onClick={startAgente}
          className="w-full max-w-xs bg-[#FFD700] hover:bg-[#FFD800] hover:scale-105 active:scale-95 transition-all duration-300 text-black font-black py-8 rounded-2xl text-xl uppercase mt-14 shadow-[0_10px_30px_rgba(255,215,0,0.3)]"
        >
          Falar com nosso Agente
        </Button>
      </div>

      <div className="h-4" />
    </div>
  );
};

export default WelcomeScreen;