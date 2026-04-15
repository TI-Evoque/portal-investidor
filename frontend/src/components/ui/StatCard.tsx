import { Building2, FileText, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type StatCardProps = {
  title: string
  value: number
  accent?: 'orange' | 'dark'
  href?: string
}

function resolveIcon(title: string) {
  const normalized = title.toLowerCase()
  if (normalized.includes('upload') || normalized.includes('arquivo')) return FileText
  if (normalized.includes('unidade')) return Building2
  if (normalized.includes('usuario') || normalized.includes('usuário')) return Users
  return FileText
}

export function StatCard({ title, value, accent = 'orange', href }: StatCardProps) {
  const navigate = useNavigate()
  const Icon = resolveIcon(title)

  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-icon">
        <Icon size={22} strokeWidth={2} />
      </div>
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
      {href ? (
        <button onClick={() => navigate(href)}>Ver todos</button>
      ) : (
        <button>Ver todos</button>
      )}
    </div>
  )
}
