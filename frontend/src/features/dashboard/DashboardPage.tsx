import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ShieldAlert, Users } from 'lucide-react'
import axios from 'axios'

import { MultiSelectDropdown } from '../../components/ui/MultiSelectDropdown'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'
import { DashboardAnalytics } from '../../types'

const emptyAnalytics: DashboardAnalytics = {
  overview: {
    portal_units: 0,
    portal_users: 0,
    portal_files: 0,
    ativos_total: 0,
    adimplentes_total: 0,
    inadimplentes_total: 0,
    agregadores_total: 0,
  },
  unit_grid: [],
  available_units: [],
  selected_unit_ids: [],
}

const numberFormatter = new Intl.NumberFormat('pt-BR')

export function DashboardPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<DashboardAnalytics>(emptyAnalytics)
  const [loadError, setLoadError] = useState('')
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([])

  const isStaff = user?.role === 'admin' || user?.role === 'super_admin'
  const selectedUnitsLabel = useMemo(() => {
    if (isStaff) {
      return selectedUnitIds.length === 0 ? 'Todas as unidades' : `${selectedUnitIds.length} unidade(s) filtradas`
    }
    if (analytics.available_units.length === 0) return 'Nenhuma unidade vinculada'
    return analytics.available_units.map((item) => item.label).join(', ')
  }, [analytics.available_units, isStaff, selectedUnitIds.length])

  useEffect(() => {
    const params = isStaff && selectedUnitIds.length > 0 ? { unit_ids: selectedUnitIds.join(',') } : undefined

    void api
      .get<DashboardAnalytics>('/dashboard/analytics', { timeout: 60000, params })
      .then((res) => {
        setAnalytics(res.data)
        setLoadError('')
      })
      .catch((error: unknown) => {
        setAnalytics(emptyAnalytics)
        if (axios.isAxiosError(error)) {
          const detail = typeof error.response?.data?.detail === 'string' ? error.response?.data?.detail : ''
          if (error.response?.status === 401) {
            setLoadError('Sua sessao nao foi aceita pelo backend. Saia e entre novamente para recarregar o token.')
            return
          }
          if (error.response?.status === 403) {
            setLoadError('Seu usuario nao possui permissao para abrir este dashboard.')
            return
          }
          if (detail) {
            setLoadError(detail)
            return
          }
        }
        setLoadError('Nao foi possivel carregar os dados reais do dashboard.')
      })
  }, [isStaff, selectedUnitIds])

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy centered">
          <h2>Dashboard Unidade</h2>
        </div>
      </div>

      <SectionHeader title="Dashboard" />

      <div className="dashboard-filter-bar table-card">
        <div className="dashboard-filter-copy">
          <strong>Filtro de unidades</strong>
        </div>
        <div className="dashboard-filter-actions">
          {isStaff ? (
            <>
              <div className="dashboard-filter-dropdown">
                <MultiSelectDropdown
                  label="Unidades"
                  options={analytics.available_units}
                  selected={selectedUnitIds}
                  onChange={setSelectedUnitIds}
                  placeholder="Todas as unidades"
                />
              </div>
            </>
          ) : null}
          <div className="dashboard-filter-badge">{selectedUnitsLabel}</div>
        </div>
      </div>

      {loadError ? (
        <div className="error-box dashboard-error-box">{loadError}</div>
      ) : null}

      <div className="dashboard-overview-grid">
        <article className="dashboard-overview-card orange">
          <div className="dashboard-overview-icon"><Users size={20} /></div>
          <span>Ativos</span>
          <strong>{numberFormatter.format(analytics.overview.ativos_total)}</strong>
          <small>Total das unidades filtradas.</small>
        </article>
        <article className="dashboard-overview-card dark">
          <div className="dashboard-overview-icon"><BarChart3 size={20} /></div>
          <span>Adimplentes</span>
          <strong>{numberFormatter.format(analytics.overview.adimplentes_total)}</strong>
          <small>Ativos menos inadimplentes.</small>
        </article>
        <article className="dashboard-overview-card orange">
          <div className="dashboard-overview-icon"><ShieldAlert size={20} /></div>
          <span>Inadimplentes</span>
          <strong>{numberFormatter.format(analytics.overview.inadimplentes_total)}</strong>
          <small>Total das unidades filtradas.</small>
        </article>
        <article className="dashboard-overview-card dark">
          <div className="dashboard-overview-icon"><BarChart3 size={20} /></div>
          <span>Agregadores</span>
          <strong>{numberFormatter.format(analytics.overview.agregadores_total)}</strong>
          <small>Gympass + TotalPass por unidade.</small>
        </article>
      </div>

      <section className="table-card dashboard-panel">
        <div className="dashboard-panel-head">
          <div>
            <h3>Dashboard por unidade</h3>
          </div>
        </div>

        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Ativos</th>
                <th>Adimplentes</th>
                <th>Inadimplentes</th>
                <th>Agregadores</th>
              </tr>
            </thead>
            <tbody>
              {analytics.unit_grid.length === 0 ? (
                <tr>
                  <td colSpan={5} className="dashboard-table-empty">Nenhuma unidade encontrada para o filtro atual.</td>
                </tr>
              ) : (
                analytics.unit_grid.map((row) => (
                  <tr key={row.unit_id}>
                    <td>{row.unit_name}</td>
                    <td>{numberFormatter.format(row.ativos)}</td>
                    <td>{numberFormatter.format(row.adimplentes)}</td>
                    <td>{numberFormatter.format(row.inadimplentes)}</td>
                    <td>{numberFormatter.format(row.agregadores)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
