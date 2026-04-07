export type Summary = { uploads: number; units: number; users: number }
export type Unit = { id: number; nome: string; endereco: string; cidade: string; estado: string; status_texto: string; foto_url?: string }
export type User = {
  id: number
  nome: string
  sobrenome?: string | null
  email: string
  cpf?: string | null
  telefone?: string | null
  role: string
  is_active: boolean
  is_authorized: boolean
  must_change_password?: boolean
  unit_ids: number[]
}
export type PortalFile = { id: number; titulo: string; nome_arquivo: string; tipo_arquivo: string; mes_referencia: string; ano_referencia: number; unit_ids: number[]; unit_names: string[]; created_at?: string }
