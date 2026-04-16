export type Summary = { uploads: number; units: number; users: number }
export type DashboardOverview = {
  portal_units: number
  portal_users: number
  portal_files: number
  ativos_total: number
  adimplentes_total: number
  inadimplentes_total: number
  agregadores_total: number
}
export type DashboardGridRow = {
  unit_id: number
  unit_name: string
  ativos: number
  adimplentes: number
  inadimplentes: number
  agregadores: number
}
export type DashboardUnitOption = { id: number; label: string; hint?: string }
export type DashboardAnalytics = {
  overview: DashboardOverview
  unit_grid: DashboardGridRow[]
  available_units: DashboardUnitOption[]
  selected_unit_ids: number[]
  metrics_status: 'ok' | 'unavailable'
  metrics_message: string
}
export type Unit = { id: number; nome: string; endereco: string; cidade: string; estado: string; status_texto: string; foto_url?: string }
export type User = {
  id: number
  nome: string
  sobrenome?: string | null
  email: string
  cpf?: string | null
  telefone?: string | null
  role: string
  permission_group_id?: number | null
  permission_group_name?: string | null
  is_active: boolean
  is_authorized: boolean
  must_change_password?: boolean
  last_seen_at?: string | null
  is_online?: boolean
  created_at?: string
  updated_at?: string | null
  unit_ids: number[]
}
export type PermissionGroupOption = { id: number; name: string; slug: string; description?: string | null; is_system: boolean }
export type PortalFile = { id: number; titulo: string; nome_arquivo: string; tipo_arquivo: string; mes_referencia: string; ano_referencia: number; unit_ids: number[]; unit_names: string[]; created_at?: string }
