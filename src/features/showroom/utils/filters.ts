/**
 * Normalizes filter input into a structured object for database queries.
 */
export const normalizarFiltro = (filtro: any) => {
  if (typeof filtro === "object") return filtro;
  const texto = String(filtro).toLowerCase();
  let f: any = {};
  const ano = texto.match(/\b(19|20)\d{2}\b/);
  if (ano) f.ano = Number(ano[0]);
  if (texto.includes("preto")) f.cor = "preto";
  if (texto.includes("branco")) f.cor = "branco";
  if (texto.includes("prata")) f.cor = "prata";
  return f;
};