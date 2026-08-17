import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Car,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatMoney = (value: any) => {
  const numberValue = Number(value || 0);

  if (!numberValue) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
};

const normalizePlate = (value: string) => {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .trim();
};

const getVehicleImage = (vehicle: any) => {
  return (
    vehicle?.images_large?.[0] ||
    vehicle?.image ||
    vehicle?.image_url ||
    vehicle?.foto ||
    "https://via.placeholder.com/800x450?text=Sem+Foto"
  );
};

const getVehicleImages = (vehicle: any) => {
  const imagens =
    Array.isArray(vehicle?.images_large) && vehicle.images_large.length > 0
      ? vehicle.images_large.filter(Boolean)
      : [];

  if (imagens.length > 0) return imagens;

  const fallback = getVehicleImage(vehicle);
  return fallback ? [fallback] : [];
};

const BuscarVeiculo = () => {
  const navigate = useNavigate();

  const role = localStorage.getItem("auth_role");
  const isAuthenticated = localStorage.getItem("is_authenticated") === "true";

  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");

  const [marcas, setMarcas] = useState<string[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);

  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingBusca, setLoadingBusca] = useState(false);

  const [resultados, setResultados] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [mensagem, setMensagem] = useState("");

  const [currentDetailImageIndex, setCurrentDetailImageIndex] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "vendedor") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, role]);

  useEffect(() => {
    const carregarMarcas = async () => {
      setLoadingMarcas(true);

      try {
        const { data, error } = await supabase
          .from("vehicles_joinha")
          .select("make")
          .not("make", "is", null)
          .order("make", { ascending: true })
          .range(0, 999);

        if (error) throw error;

        const unicas = Array.from(
          new Set(
            (data || [])
              .map((item: any) => String(item.make || "").trim())
              .filter(Boolean)
          )
        );

        setMarcas(unicas);
      } catch (error) {
        console.error("Erro ao carregar marcas:", error);
      } finally {
        setLoadingMarcas(false);
      }
    };

    carregarMarcas();
  }, []);

  useEffect(() => {
    const carregarModelos = async () => {
      setModelo("");
      setModelos([]);

      if (!marca) {
        return;
      }

      setLoadingModelos(true);

      try {
        const { data, error } = await supabase
          .from("vehicles_joinha")
          .select("model")
          .eq("make", marca)
          .not("model", "is", null)
          .order("model", { ascending: true })
          .range(0, 999);

        if (error) throw error;

        const unicos = Array.from(
          new Set(
            (data || [])
              .map((item: any) => String(item.model || "").trim())
              .filter(Boolean)
          )
        );

        setModelos(unicos);
      } catch (error) {
        console.error("Erro ao carregar modelos:", error);
      } finally {
        setLoadingModelos(false);
      }
    };

    carregarModelos();
  }, [marca]);

  useEffect(() => {
    setCurrentDetailImageIndex(0);
  }, [selectedVehicle]);

  const detailImages = useMemo(() => {
    return getVehicleImages(selectedVehicle);
  }, [selectedVehicle]);

  const currentDetailImage =
    detailImages[currentDetailImageIndex] ||
    getVehicleImage(selectedVehicle) ||
    "";

  const previousDetailImage = () => {
    if (detailImages.length <= 1) return;

    setCurrentDetailImageIndex((current) =>
      current === 0 ? detailImages.length - 1 : current - 1
    );
  };

  const nextDetailImage = () => {
    if (detailImages.length <= 1) return;

    setCurrentDetailImageIndex((current) =>
      current === detailImages.length - 1 ? 0 : current + 1
    );
  };

  const botaoBuscaHabilitado = useMemo(() => {
    return !!placa.trim() || !!marca.trim() || !!modelo.trim();
  }, [placa, marca, modelo]);

  const limparBusca = () => {
    setPlaca("");
    setMarca("");
    setModelo("");
    setResultados([]);
    setSelectedVehicle(null);
    setMensagem("");
  };

  const buscarVeiculos = async () => {
    if (!botaoBuscaHabilitado) {
      return;
    }

    setLoadingBusca(true);
    setMensagem("");
    setResultados([]);
    setSelectedVehicle(null);

    try {
      let query = supabase.from("vehicles_joinha").select("*");

      const placaNormalizada = normalizePlate(placa);

      if (placaNormalizada) {
        query = query.ilike("plate", placaNormalizada);
      } else {
        if (marca) {
          query = query.eq("make", marca);
        }

        if (modelo) {
          query = query.eq("model", modelo);
        }
      }

      query = query
        .order("make", { ascending: true })
        .order("model", { ascending: true });

      const { data, error } = await query.range(0, 49);

      if (error) throw error;

      const results = data || [];

      setResultados(results);

      if (results.length === 0) {
        setMensagem("Nenhum veículo encontrado com esses critérios.");
      }
    } catch (err: any) {
      console.error("Erro na busca:", err);
      setMensagem("Erro ao buscar veículos: " + err.message);
    } finally {
      setLoadingBusca(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Busca Veículo no Estoque
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Consulte o estoque da Joinha por placa, marca ou modelo. O vendedor
            pode apenas visualizar as informações, sem editar nada.
          </p>
        </div>

        <Button
          onClick={() => navigate("/dashboard")}
          className="border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft size={16} className="mr-2" />
          Voltar
        </Button>
      </div>

      <Card className="bg-[#101010] border-zinc-800 rounded-2xl">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Placa
              </label>
              <Input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="Ex.: FJR1A61"
                className="bg-zinc-900 border-zinc-800 text-white"
              />
              <p className="text-xs text-zinc-500">
                Se preencher a placa, ela terá prioridade na busca.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Marca
              </label>
              <select
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white"
              >
                <option value="">
                  {loadingMarcas ? "Carregando marcas..." : "Selecione uma marca"}
                </option>
                {marcas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                Lista real das marcas existentes no estoque da Joinha.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                Modelo
              </label>
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white"
                disabled={!marca || loadingModelos}
              >
                <option value="">
                  {!marca
                    ? "Selecione primeiro a marca"
                    : loadingModelos
                      ? "Carregando modelos..."
                      : "Selecione um modelo"}
                </option>
                {modelos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                Ao escolher a marca, o sistema carrega os modelos reais dela.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={buscarVeiculos}
              disabled={!botaoBuscaHabilitado || loadingBusca}
              className="bg-[#d4af37] hover:bg-[#c39b2d] text-black font-black"
            >
              <Search size={16} className="mr-2" />
              {loadingBusca ? "Buscando..." : "Buscar"}
            </Button>

            <Button
              onClick={limparBusca}
              variant="outline"
              className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
            >
              Limpar filtros
            </Button>
          </div>

          <div className="text-sm text-zinc-400">
            O botão buscar fica habilitado com apenas 1 campo preenchido. Se a
            placa estiver preenchida, ela será usada como prioridade.
          </div>
        </CardContent>
      </Card>

      {mensagem && (
        <Card className="bg-[#101010] border-zinc-800 rounded-2xl">
          <CardContent className="p-6 text-zinc-300">{mensagem}</CardContent>
        </Card>
      )}

      {resultados.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-zinc-400">
            {resultados.length} veículo(s) encontrado(s).
          </div>

          <div className="grid grid-cols-1 gap-4">
            {resultados.map((vehicle: any) => (
              <Card
                key={
                  vehicle.id ||
                  vehicle.external_id ||
                  `${vehicle.make}-${vehicle.model}-${vehicle.plate}`
                }
                className="bg-black border-zinc-800 rounded-2xl"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="w-full lg:w-[260px] shrink-0">
                      <img
                        src={getVehicleImage(vehicle)}
                        alt={`${vehicle.make || ""} ${vehicle.model || ""}`}
                        className="w-full h-[160px] object-cover rounded-xl border border-zinc-800"
                      />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-black text-white">
                            {vehicle.make || "-"} {vehicle.model || "-"}
                          </h2>
                          <p className="text-zinc-400 text-sm">
                            {vehicle.version || "Versão não informada"}
                          </p>
                        </div>

                        <Car className="text-[#d4af37]" size={22} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Ano
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.year || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Placa
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.plate || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Final Placa
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.plate_final || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            KM
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.mileage || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Câmbio
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.gear || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Combustível
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.fuel || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Cor
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.color || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Portas
                          </p>
                          <p className="text-white font-semibold">
                            {vehicle.doors || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div>
                          <p className="text-zinc-500 uppercase text-xs font-bold">
                            Preço
                          </p>
                          <p className="text-2xl font-black text-[#d4af37]">
                            {formatMoney(vehicle.promo_price || vehicle.price)}
                          </p>
                        </div>

                        <Button
                          onClick={() => setSelectedVehicle(vehicle)}
                          className="bg-transparent hover:bg-zinc-900 text-[#d4af37] font-black px-0"
                        >
                          <Eye size={18} className="mr-2" />
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedVehicle && (
        <Card className="bg-[#101010] border-zinc-800 rounded-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-white">
                  {selectedVehicle.make || "-"} {selectedVehicle.model || "-"}
                </h2>
                <p className="text-zinc-400 mt-1">
                  {selectedVehicle.version || "Versão não informada"}
                </p>
              </div>

              <Button
                onClick={() => setSelectedVehicle(null)}
                variant="outline"
                className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
              >
                Fechar detalhes
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
              <div className="space-y-3">
                <div className="relative w-full">
                  {currentDetailImage ? (
                    <>
                      <img
                        src={currentDetailImage}
                        alt={`${selectedVehicle.make || ""} ${selectedVehicle.model || ""}`}
                        className="w-full h-[220px] object-contain rounded-xl border border-zinc-800 bg-black"
                      />

                      {detailImages.length > 1 && (
                        <>
                          <button
                            onClick={previousDetailImage}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/70 border border-white/10 text-white p-2 rounded-full backdrop-blur-md"
                            aria-label="Foto anterior"
                          >
                            <ChevronLeft size={20} />
                          </button>

                          <button
                            onClick={nextDetailImage}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/70 border border-white/10 text-white p-2 rounded-full backdrop-blur-md"
                            aria-label="Próxima foto"
                          >
                            <ChevronRight size={20} />
                          </button>

                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                            {currentDetailImageIndex + 1} / {detailImages.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-[220px] rounded-xl border border-zinc-800 bg-black flex flex-col items-center justify-center text-zinc-500 gap-2">
                      <ImageIcon size={28} />
                      <span className="text-sm">Nenhuma imagem disponível</span>
                    </div>
                  )}
                </div>

                {detailImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {detailImages.map((img, index) => (
                      <button
                        key={`${img}-${index}`}
                        onClick={() => setCurrentDetailImageIndex(index)}
                        className={cn(
                          "shrink-0 w-16 h-16 rounded-lg overflow-hidden border",
                          index === currentDetailImageIndex
                            ? "border-[#d4af37]"
                            : "border-zinc-800 opacity-70"
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
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Marca</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.make || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Modelo</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.model || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Base Model
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.base_model || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Versão</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.version || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Ano Modelo
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.year || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Ano Fabricação
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.fabric_year || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Placa</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.plate || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Final da Placa
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.plate_final || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Quilometragem
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.mileage || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Câmbio</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.gear || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Combustível
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.fuel || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Cor</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.color || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Portas</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.doors || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Categoria
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.category || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Preço</p>
                  <p className="text-white font-semibold">
                    {formatMoney(selectedVehicle.price)}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Preço Promocional
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.promo_price
                      ? formatMoney(selectedVehicle.promo_price)
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Loja</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.seller || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Telefone
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.phone || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Cidade</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.city || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Estado
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.state || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">Bairro</p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.neighborhood || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500 uppercase text-xs font-bold">
                    Rua / Número
                  </p>
                  <p className="text-white font-semibold">
                    {selectedVehicle.street || "-"}{" "}
                    {selectedVehicle.number ? `, ${selectedVehicle.number}` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-zinc-500 uppercase text-xs font-bold mb-2">
                  Opcionais
                </p>
                <div className="rounded-xl border border-zinc-800 bg-black p-4 text-zinc-300 whitespace-pre-wrap">
                  {selectedVehicle.options_clean || "Não informado."}
                </div>
              </div>

              <div>
                <p className="text-zinc-500 uppercase text-xs font-bold mb-2">
                  Descrição
                </p>
                <div className="rounded-xl border border-zinc-800 bg-black p-4 text-zinc-300 whitespace-pre-wrap">
                  {selectedVehicle.description_clean || "Não informado."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BuscarVeiculo;
