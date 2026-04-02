import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { Summary, PortalFile } from '../../types'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({ uploads: 0, units: 0, users: 0 })
  const [recentFiles, setRecentFiles] = useState<PortalFile[]>([])

  useEffect(() => {
    void api
      .get<Summary>('/dashboard/summary')
      .then((res) => setSummary(res.data))
      .catch(() => undefined)

    void api
      .get<PortalFile[]>('/files')
      .then((res) => setRecentFiles(Array.isArray(res.data) ? res.data.slice(0, 3) : []))
      .catch(() => undefined)
  }, [])

  return (
    <div>
      <div className="hero-banner">
        <div>
          <h2>Bem-vindo</h2>
          <p>ao seu portal do investidor</p>
        </div>
      </div>

      <SectionHeader title="Visão geral" />

      <div className="stats-grid">
        <StatCard title="Upload de arquivos" value={summary.uploads} accent="orange" href="/arquivos" />
        <StatCard title="Unidades Cadastradas" value={summary.units} accent="dark" href="/unidades" />
        <StatCard title="Usuários Cadastrados" value={summary.users} accent="orange" href="/usuarios" />
      </div>

      <div className="table-card">
        <div className="table-top">
          <h3>Últimos arquivos enviados</h3>
          <a href="/arquivos">Ver todos</a>
        </div>

        {recentFiles.length === 0 ? (
          <div className="file-row">
            <span className="file-icon">▣</span>
            <span>Nenhum arquivo recente encontrado.</span>
            <span>-</span>
            <span>-</span>
            <span>-</span>
            <span>-</span>
          </div>
        ) : (
          recentFiles.map((file) => (
            <div className="file-row" key={file.id}>
              <span className="file-icon">▣</span>
              <span>{file.titulo}</span>
              <span>{Array.isArray(file.unit_names) ? file.unit_names.join(', ') : '-'}</span>
              <span>{file.tipo_arquivo}</span>
              <span>{file.mes_referencia}</span>
              <span>⇩</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
