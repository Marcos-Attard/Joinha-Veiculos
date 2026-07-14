/**
 * Calculates credit simulation results based on car value, down payment, and income.
 */
export const calcularResultadosSimulacaoCredito = (
  valorCarro: number,
  entrada: number,
  renda: number,
  entradaMinima: number
) => {
  const valorFinanciado = valorCarro - entrada;
  const taxa = 0.0159; // 1.59% rate
  const planos = [12, 24, 36, 48];
  const basePreAprovacao = renda * 0.3;

  return planos.map(parcelas => {
    const fatorFinanciamento = taxa / (1 - Math.pow(1 + taxa, -parcelas));
    const valorParcela = valorFinanciado * fatorFinanciamento;

    const preAprovado = valorParcela <= basePreAprovacao;

    const saldoMaximoFinanciavel = basePreAprovacao / fatorFinanciamento;
    const entradaNecessariaCalculada = valorCarro - saldoMaximoFinanciavel;

    const entradaNecessaria = Math.min(
      valorCarro,
      Math.max(entrada, entradaMinima, entradaNecessariaCalculada)
    );

    const acrescimoEntrada = Math.max(0, entradaNecessaria - entrada);

    return {
      parcelas,
      valorParcela,
      preAprovado,
      status: preAprovado ? 'PRÉ-APROVADO' : 'AJUSTE DE ENTRADA',
      basePreAprovacao,
      entradaNecessaria,
      acrescimoEntrada
    };
  });
};