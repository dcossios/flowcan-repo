/**
 * Formatea montos en pesos colombianos (COP) al estilo "$3.200" o "$20.000"
 * según la especificación de AGENTS.md (sección 9).
 */
export function formatCOP(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
    return '$0';
  }
  const rounded = Math.round(Number(amount));
  return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(rounded);
}

/**
 * Normaliza un Payment Pointer ($ilp.interledger-test.dev/...)
 * a formato URL de Open Payments (https://ilp.interledger-test.dev/...).
 */
export function normalizeWalletAddress(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('$')) {
    return 'https://' + trimmed.slice(1);
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

export function formatHora(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

export function formatFechaHora(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}
