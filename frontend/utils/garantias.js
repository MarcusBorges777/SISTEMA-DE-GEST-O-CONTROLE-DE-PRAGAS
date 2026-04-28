// Helpers para classificar/agrupar garantias retornadas por
// /api/documentos/vencimentos. Centraliza a lógica para
// GarantiaAlerts (compact + full), GarantiaBell e Garantias.jsx.

/**
 * Recebe a lista FLAT do endpoint e retorna { vencidas, esta_semana, proximas }.
 * - vencidas:    dias_restantes < 0
 * - esta_semana: 0 <= dias_restantes <= 7
 * - proximas:    dias_restantes > 7 (até o limite que o backend retornou)
 */
export function groupGarantias(items) {
  const lista = Array.isArray(items) ? items : [];
  const vencidas = [];
  const esta_semana = [];
  const proximas = [];
  for (const g of lista) {
    const d = Number(g.dias_restantes ?? 0);
    if (d < 0) vencidas.push(g);
    else if (d <= 7) esta_semana.push(g);
    else proximas.push(g);
  }
  return { vencidas, esta_semana, proximas };
}

/**
 * Classifica uma garantia individual.
 * Retorna 'vencida' | 'urgente' | 'proxima'
 */
export function statusGarantia(g) {
  const d = Number(g?.dias_restantes ?? 0);
  if (d < 0) return 'vencida';
  if (d <= 7) return 'urgente';
  return 'proxima';
}

/** Texto legível do prazo: "Vencido há 3d" / "Vence hoje" / "Vence em 12d" */
export function labelPrazo(g) {
  const d = Number(g?.dias_restantes ?? 0);
  if (d < 0) return `Vencido há ${Math.abs(d)} dia${Math.abs(d) !== 1 ? 's' : ''}`;
  if (d === 0) return 'Vence hoje';
  return `Vence em ${d} dia${d !== 1 ? 's' : ''}`;
}

/** Cor base usada em badges/dots por status */
export function corStatus(g) {
  const s = statusGarantia(g);
  if (s === 'vencida') return { bg: 'bg-red-500',    text: 'text-red-600',    bgSoft: 'bg-red-100 dark:bg-red-900/30',    textSoft: 'text-red-700 dark:text-red-300' };
  if (s === 'urgente') return { bg: 'bg-amber-500',  text: 'text-amber-600',  bgSoft: 'bg-amber-100 dark:bg-amber-900/30', textSoft: 'text-amber-700 dark:text-amber-300' };
  return                       { bg: 'bg-blue-500',  text: 'text-blue-600',  bgSoft: 'bg-blue-100 dark:bg-blue-900/30',  textSoft: 'text-blue-700 dark:text-blue-300' };
}
