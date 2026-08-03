"use client";

import type React from "react";
import { supabase } from "@/integrations/supabase/client";
import { enviarMensagemN8N } from "@/features/showroom/services/n8nService";
import {
  formatarTelefoneExibicao,
  extrairInfoLoja,
  montarEnderecoLoja,
} from "@/features/showroom/utils/storeInfo";

const PAGE_SIZE = 5;
const FALLBACK_LIMIT = 300;
const ESTOQUE_TABLE = "vehicles_joinha";

const normalize = (v: any) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?.,!/\\|()[\]{}:;"'`~^<>+=_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compact = (v: any) => normalize(v).replace(/\s+/g, "");

const trigrams = (value: string) => {
  const s = compact(value);
  if (!s) return new Set<string>();
  if (s.length < 3) return new Set([s]);

  const padded = `  ${s} `;
  const set = new Set<string>();

  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3));
  }

  return set;
};

const trigramSimilarity = (a: string, b: string) => {
  const sa = trigrams(a);
  const sb = trigrams(b);

  if (sa.size === 0 || sb.size === 0) return 0;

  let intersection = 0;
  for (const gram of sa) {
    if (sb.has(gram)) intersection++;
  }

  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

const fuzzyScore = (field: any, token: string) => {
  const f = normalize(field);
  const t = normalize(token);

  if (!f || !t) return 0;

  if (f === t) return 1;
  if (f.includes(t)) return 0.98;
  if (t.includes(f) && f.length >= 3) return 0.9;

  const cf = compact(f);
  const ct = compact(t);

  if (!cf || !ct) return 0;

  if (cf === ct) return 1;
  if (cf.includes(ct)) return 0.96;
  if (ct.includes(cf) && cf.length >= 3) return 0.88;

  return trigramSimilarity(cf, ct);
};

const firstFilled = (...values: any[]) => {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return v;
    }
  }
  return null;
};

const normalizeCategory = (value: any) => {
  const t = normalize(value);

  if (!t) return null;

  if (["moto", "motos", "motocicleta", "motocicletas"].includes(t)) {
    return "moto";
  }

  if (
    [
      "carro",
      "carros",
      "automovel",
      "automoveis",
      "veiculo",
      "veiculos",
    ].includes(t)
  ) {
    return "carro";
  }

  if (["quadriciclo", "quadriciclos", "atv", "outros"].includes(t)) {
    return "outros";
  }

  return t;
};

const isMore = (text: string) => {
  const t = normalize(text);
  return [
    "sim",
    "quero",
    "mais",
    "tem mais",
    "ver mais",
    "mostra mais",
    "me mostra mais",
    "proximo",
    "próximo",
    "continua",
    "continuar",
  ].includes(t);
};

const tokenize = (text: any) => {
  const t = normalize(text);
  if (!t) return [];

  const stopWords = new Set([
    "tem",
    "tenho",
    "quero",
    "mostrar",
    "mostra",
    "procuro",
    "uma",
    "um",
    "de",
    "do",
    "da",
    "com",
    "e",
    "ou",
    "para",
    "por",
    "favor",
    "vejo",
    "ver",
    "me",
    "ai",
    "aí",
    "no",
    "na",
    "os",
    "as",
    "o",
    "a",
    "carro",
    "carros",
    "moto",
    "motos",
    "veiculo",
    "veiculos",
    "veículo",
    "veículos",
    "automovel",
    "automoveis",
    "automóvel",
    "automóveis",
    "quadriciclo",
    "outros",
    "ate",
    "até",
    "mil",
    "km",
    "final",
    "placa",
    "preco",
    "preço",
    "barato",
    "barata",
    "mais",
  ]);

  return t
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !stopWords.has(s) && !/^\d+$/.test(s));
};

const buildSearchBlob = (v: any) =>
  normalize(
    [
      v.title_clean,
      v.model,
      v.base_model,
      v.make,
      v.version,
      v.search_text,
      v.category,
      v.color,
      v.fuel,
      v.gear,
      v.motor,
      v.year,
      v.fabric_year,
      v.plate_final,
      v.seller,
    ].join(" ")
  );

const scoreVehicle = (vehicle: any, tokens: string[]) => {
  const blob = buildSearchBlob(vehicle);
  if (!blob) return 0;

  let score = 0;

  for (const token of tokens) {
    if (!token) continue;

    const titleScore = fuzzyScore(vehicle.title_clean, token);
    const modelScore = fuzzyScore(vehicle.model, token);
    const baseModelScore = fuzzyScore(vehicle.base_model, token);
    const makeScore = fuzzyScore(vehicle.make, token);
    const versionScore = fuzzyScore(vehicle.version, token);
    const searchTextScore = fuzzyScore(vehicle.search_text, token);

    score += titleScore * 10;
    score += modelScore * 9;
    score += baseModelScore * 8;
    score += makeScore * 8;
    score += versionScore * 7;
    score += searchTextScore * 5;
  }

  return score;
};

const mapVehicles = (vehicles: any[]) => {
  return vehicles.map((v: any) => ({
    id: v.external_id,
    marca: v.make,
    modelo: v.model,
    preco: v.promo_price || v.price,
    preco_original: v.price,
    promo_price: v.promo_price,
    images_large: Array.isArray(v.images_large)
      ? v.images_large.filter(Boolean)
      : [],
    foto_url:
      (Array.isArray(v.images_large) &&
        v.images_large.length > 0 &&
        v.images_large[0]) ||
      v.image ||
      v.image_url ||
      v.foto ||
      "https://via.placeholder.com/400x225?text=Sem+Foto",
    ano: v.year,
    fabric_year: v.fabric_year,
    km: v.mileage,
    cambio: v.gear,
    combustivel: v.fuel,
    motor: v.motor,
    cor: v.color,
    portas: v.doors || "---",
    placa_final: v.plate_final || "---",
    opcionais: v.options_clean || "",
    descricao: v.description_clean || "",
    version: v.version || "",
    base_model: v.base_model || "",
    category: v.category || "",
    plate: v.plate || "",
    street: v.street,
    number: v.number,
    neighborhood: v.neighborhood,
    location_city: v.city,
    location_state: v.state,
    phone: v.phone,
    store_name: v.seller || extrairInfoLoja(v.description_clean).storeName,
    store_address: montarEnderecoLoja(v),
    store_phone: formatarTelefoneExibicao(
      v.phone || extrairInfoLoja(v.description_clean).storePhone
    ),
  }));
};

const applyFilters = (
  query: any,
  filtro: any,
  options?: { ignoreCategory?: boolean; ignoreVehicleTextFilters?: boolean }
) => {
  const category = normalizeCategory(firstFilled(filtro?.category, filtro?.categoria));
  const make = firstFilled(filtro?.make, filtro?.marca);
  const model = firstFilled(filtro?.model, filtro?.modelo);
  const baseModel = firstFilled(filtro?.base_model);
  const titleClean = firstFilled(filtro?.title_clean);
  const version = firstFilled(filtro?.version);
  const year = firstFilled(filtro?.year, filtro?.ano);
  const fabricYear = firstFilled(filtro?.fabric_year);
  const fuel = firstFilled(filtro?.fuel, filtro?.combustivel);
  const gear = firstFilled(filtro?.gear, filtro?.cambio);
  const motor = firstFilled(filtro?.motor);
  const doors = firstFilled(filtro?.doors, filtro?.portas);
  const color = firstFilled(filtro?.color, filtro?.cor);
  const priceMin = firstFilled(filtro?.price_min);
  const priceMax = firstFilled(filtro?.price_max);
  const promoPriceMin = firstFilled(filtro?.promo_price_min);
  const promoPriceMax = firstFilled(filtro?.promo_price_max);
  const plateFinal = firstFilled(
    filtro?.plate_final,
    filtro?.placaFinal,
    filtro?.finalPlaca
  );
  const city = firstFilled(filtro?.city, filtro?.cidade);
  const state = firstFilled(filtro?.state, filtro?.estado);
  const neighborhood = firstFilled(filtro?.neighborhood, filtro?.bairro);
  const seller = firstFilled(filtro?.seller, filtro?.loja);

  if (filtro?.available !== undefined && filtro?.available !== null) {
    query = query.eq("available", filtro.available);
  } else {
    query = query.eq("available", true);
  }

  if (!options?.ignoreCategory && category) {
    if (category === "moto") {
      query = query.or("category.ilike.moto,category.ilike.motocicleta");
    } else if (category === "carro") {
      query = query.or("category.ilike.carro,category.ilike.automovel,category.ilike.automóvel");
    } else if (category === "outros") {
      // Não restringe categoria para quadriciclo/ATV/outros.
    } else {
      query = query.ilike("category", `%${category}%`);
    }
  }

  if (!options?.ignoreVehicleTextFilters) {
    if (make) query = query.ilike("make", `%${make}%`);
    if (model) query = query.ilike("model", `%${model}%`);
    if (baseModel) query = query.ilike("base_model", `%${baseModel}%`);
    if (titleClean) query = query.ilike("title_clean", `%${titleClean}%`);
    if (version) query = query.ilike("version", `%${version}%`);
    if (fuel) query = query.ilike("fuel", `%${fuel}%`);
    if (gear) query = query.ilike("gear", `%${gear}%`);
    if (motor) query = query.ilike("motor", `%${motor}%`);
    if (color) query = query.ilike("color", `%${color}%`);
    if (seller) query = query.ilike("seller", `%${seller}%`);
  }

  if (year) query = query.eq("year", Number(year));
  if (fabricYear) query = query.eq("fabric_year", Number(fabricYear));
  if (doors) query = query.eq("doors", Number(doors));
  if (priceMin) query = query.gte("price", Number(priceMin));
  if (priceMax) query = query.lte("price", Number(priceMax));
  if (promoPriceMin) query = query.gte("promo_price", Number(promoPriceMin));
  if (promoPriceMax) query = query.lte("promo_price", Number(promoPriceMax));

  if (
    plateFinal !== null &&
    plateFinal !== undefined &&
    String(plateFinal).trim() !== ""
  ) {
    query = query.eq("plate_final", String(plateFinal).trim());
  }

  if (city) query = query.ilike("city", `%${city}%`);
  if (state) query = query.ilike("state", `%${state}%`);
  if (neighborhood) query = query.ilike("neighborhood", `%${neighborhood}%`);

  return query;
};

const uniqueByExternalId = (items: any[]) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.external_id || item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortVehiclesLocally = (items: any[], filtro: any) => {
  const sortBy = filtro?.sort_by;
  const sortOrder =
    String(filtro?.sort_order || "asc").toLowerCase() === "desc"
      ? "desc"
      : "asc";

  if (!sortBy) return items;

  return [...items].sort((a, b) => {
    let av = a?.[sortBy];
    let bv = b?.[sortBy];

    const numericFields = [
      "price",
      "promo_price",
      "year",
      "fabric_year",
      "mileage",
    ];

    if (numericFields.includes(sortBy)) {
      av = Number(av || 0);
      bv = Number(bv || 0);
    } else {
      av = normalize(av);
      bv = normalize(bv);
    }

    if (av < bv) return sortOrder === "asc" ? -1 : 1;
    if (av > bv) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
};

const localFallbackSearch = async (filtro: any) => {
  let query = (supabase as any).from(ESTOQUE_TABLE).select("*");

  query = applyFilters(query, filtro, {
    ignoreVehicleTextFilters: true,
  });

  query = query.limit(FALLBACK_LIMIT);

  const { data, error } = await query;
  if (error) throw error;

  const raw = data || [];

  const term = firstFilled(
    filtro?.term,
    filtro?.title_clean,
    filtro?.version,
    filtro?.make,
    filtro?.model,
    filtro?.base_model,
    filtro?.termo,
    filtro?.veiculo,
    filtro?.marca,
    filtro?.modelo,
    filtro?.original_text
  );

  const tokens = tokenize(term || filtro?.original_text || "");
  const searchTokens = tokens.filter((t) => /[a-z]/i.test(t));

  if (searchTokens.length === 0) {
    return sortVehiclesLocally(raw, filtro);
  }

  const scored = raw
    .map((vehicle) => ({
      vehicle,
      score: scoreVehicle(vehicle, searchTokens),
    }))
    .filter((item) => item.score >= 8)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.vehicle);

  return sortVehiclesLocally(uniqueByExternalId(scored), filtro);
};

export const carregarEstoqueSupabase = async (
  filtro: any,
  offset: number = 0,
  setIsLoading: (loading: boolean) => void,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  setLastSearchState: React.Dispatch<
    React.SetStateAction<{
      filter: any;
      hasMore: boolean;
      nextOffset: number;
    }>
  >
) => {
  setIsLoading(true);

  try {
    const term = firstFilled(
      filtro?.term,
      filtro?.title_clean,
      filtro?.version,
      filtro?.make,
      filtro?.model,
      filtro?.base_model,
      filtro?.termo,
      filtro?.veiculo,
      filtro?.marca,
      filtro?.modelo
    );

    const tokens = tokenize(term || filtro?.original_text || "");
    const searchTokens = tokens.filter((t) => /[a-z]/i.test(t));
    let raw: any[] = [];

    let query = (supabase as any).from(ESTOQUE_TABLE).select("*");
    query = applyFilters(query, filtro);

    const sortBy = filtro?.sort_by;
    const ascending =
      String(filtro?.sort_order || "asc").toLowerCase() !== "desc";

    if (sortBy) {
      query = query.order(sortBy, { ascending });
    }

    if (searchTokens.length > 0) {
      const orParts: string[] = [];

      for (const token of searchTokens) {
        orParts.push(`title_clean.ilike.%${token}%`);
        orParts.push(`model.ilike.%${token}%`);
        orParts.push(`base_model.ilike.%${token}%`);
        orParts.push(`make.ilike.%${token}%`);
        orParts.push(`version.ilike.%${token}%`);
        orParts.push(`search_text.ilike.%${token}%`);
      }

      query = query.or(orParts.join(","));
    }

    query = query.limit(FALLBACK_LIMIT);

    const { data, error } = await query;
    if (error) throw error;

    raw = uniqueByExternalId(data || []);
    raw = sortVehiclesLocally(raw, filtro);

    if (raw.length === 0) {
      raw = await localFallbackSearch(filtro);
    }

    const start = offset;
    const end = offset + PAGE_SIZE;
    const vehicles = raw.slice(start, end);
    const hasMore = raw.length > end;
    const nextOffset = hasMore ? end : 0;

    setLastSearchState({
      filter: filtro,
      hasMore,
      nextOffset,
    });

    if (vehicles.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `cars-${Date.now()}`,
          sender: "ai",
          cars: mapVehicles(vehicles),
        },
        {
          id: `msg-${Date.now()}`,
          sender: "ai",
          text: hasMore
            ? "Encontrei estas opções. Se quiser, posso mostrar mais."
            : "Estas foram as opções que encontrei.",
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text:
            offset === 0
              ? "Não encontrei veículos com esse filtro."
              : "Não há mais veículos para este filtro.",
          sender: "ai",
        },
      ]);
    }
  } catch (err) {
    console.error("Erro na busca:", err);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: "Desculpe, tive um problema ao consultar o estoque agora.",
        sender: "ai",
      },
    ]);
  } finally {
    setIsLoading(false);
  }
};

export const enviarParaN8N = async (
  textoUsuario: string,
  lastSearchState: {
    filter: any;
    hasMore: boolean;
    nextOffset: number;
  },
  setIsLoading: (loading: boolean) => void,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  carregarEstoque: (filtro: any, offset: number) => Promise<void>
) => {
  if (isMore(textoUsuario)) {
    if (lastSearchState.hasMore) {
      await carregarEstoque(lastSearchState.filter, lastSearchState.nextOffset);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "Não há mais veículos para este filtro.",
          sender: "ai",
        },
      ]);
    }
    return;
  }

  setIsLoading(true);

  try {
    const data = await enviarMensagemN8N(textoUsuario, "sessao-joinha-showroom");

    const textoResposta =
      data?.texto ||
      data?.text ||
      data?.resposta ||
      data?.message ||
      "Entendi. Me diga qual veículo você procura.";

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: textoResposta,
        sender: "ai",
      },
    ]);

    if (data?.acao === "BUSCAR_ESTOQUE") {
      await carregarEstoque(data.filtro || {}, 0);
    }

    if (data?.acao === "CONTINUAR_BUSCA") {
      if (lastSearchState.hasMore) {
        await carregarEstoque(lastSearchState.filter, lastSearchState.nextOffset);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: "Não há mais veículos para este filtro.",
            sender: "ai",
          },
        ]);
      }
    }
  } catch (err) {
    console.error("Erro n8n:", err);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: "Desculpe, tive um problema ao processar sua solicitação.",
        sender: "ai",
      },
    ]);
  } finally {
    setIsLoading(false);
  }
};