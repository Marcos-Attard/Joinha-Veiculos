import { somenteNumeros } from './formatters';

export const formatarTelefoneExibicao = (telefone?: string | null) => {
  if (!telefone) return null;

  const numeros = somenteNumeros(telefone);

  if (numeros.length === 11) {
    return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (numeros.length === 10) {
    return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return telefone;
};

export const extrairInfoLoja = (descricao?: string) => {
  const textoOriginal = descricao || "";

  const textoNormalizado = textoOriginal
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const storeName =
    textoNormalizado.includes("unidade 03") ||
    textoNormalizado.includes("unidade 3")
      ? "Loja 3"
      : textoNormalizado.includes("unidade 02") ||
          textoNormalizado.includes("unidade 2")
        ? "Loja 2"
        : textoNormalizado.includes("unidade 01") ||
            textoNormalizado.includes("unidade 1") ||
            textoNormalizado.includes("unidade 001")
          ? "Loja 1"
          : null;

  const matchEndereco = textoOriginal.match(
    /((av\.|avenida|rua|rodovia|estrada)\s+[^|\n\r]*)/i
  );

  const matchTelefone = textoOriginal.match(
    /(\+?55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}[-.\s]?\d{4}/
  );

  return {
    storeName,
    storeAddress: matchEndereco?.[1]?.trim() || null,
    storePhone: matchTelefone?.[0]?.trim() || null,
  };
};

export const montarEnderecoLoja = (vehicle: any) => {
  if (!vehicle) return null;

  const partes = [
    vehicle.street,
    vehicle.number,
    vehicle.neighborhood,
    vehicle.location_city,
    vehicle.location_state
      ? `${vehicle.location_city ? "- " : ""}${vehicle.location_state}`
      : null,
  ]
    .filter(Boolean)
    .map((item) => String(item).trim());

  if (partes.length > 0) {
    return partes.join(", ").replace(", - ", " - ");
  }

  return extrairInfoLoja(vehicle.description).storeAddress || null;
};

export const obterLojaVeiculo = (vehicle: any) => {
  const infoDescricao = extrairInfoLoja(
    vehicle?.descricao || vehicle?.description
  );

  return {
    storeName:
      vehicle?.store_name || infoDescricao.storeName || "Loja não identificada",
    storeAddress:
      vehicle?.store_address ||
      montarEnderecoLoja(vehicle) ||
      infoDescricao.storeAddress ||
      "Endereço não informado",
    storePhone:
      formatarTelefoneExibicao(
        vehicle?.store_phone || vehicle?.phone || infoDescricao.storePhone
      ) || "Telefone não informado",
  };
};