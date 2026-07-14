/**
 * Utility functions for formatting currency, documents, and phone numbers.
 */

export const formatarPreco = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

export const somenteNumeros = (value: string) => value.replace(/\D/g, '');

export const parseMoney = (value: string) => Number(value.replace(/\D/g, '')) / 100 || 0;

export const formatarMoedaInput = (valor: string) => {
  const numero = valor.replace(/\D/g, '');

  if (!numero) return '';

  return (Number(numero) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

export const formatarCPF = (valor: string) => {
  const numero = somenteNumeros(valor).slice(0, 11);

  return numero
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatarWhatsApp = (valor: string) => {
  const numero = somenteNumeros(valor).slice(0, 11);

  if (numero.length <= 10) {
    return numero
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return numero
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};