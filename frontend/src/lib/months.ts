const MONTH_LABELS: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
}

export function normalizeMonth(value: string | number | null | undefined) {
  return String(value ?? '').padStart(2, '0')
}

export function getMonthLabel(value: string | number | null | undefined) {
  const normalized = normalizeMonth(value)
  return MONTH_LABELS[normalized] || normalized
}
