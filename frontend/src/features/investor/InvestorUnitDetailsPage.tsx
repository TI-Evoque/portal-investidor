import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarRange, Download, FileText, Filter, FolderOpen, Search } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/api'
import { PortalFile, Unit } from '../../types'

const MONTH_ORDER = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function monthSortValue(month: string) {
  const idx = MONTH_ORDER.findIndex((item) => item.toLowerCase() === String(month).toLowerCase())
  return idx === -1 ? 999 : idx
}

function formatDate(dateValue?: string) {
  if (!dateValue) return 'Data não informada'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue
  return date.toLocaleDateString('pt-BR')
}

function normalizeIsoDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function InvestorUnitDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const unitId = Number(id)

  const [unit, setUnit] = useState<Unit | null>(null)
  const [files, setFiles] = useState<PortalFile[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  // Estados dos Filtros
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (!unitId || Number.isNaN(unitId)) return
    let mounted = true

    async function loadPage() {
      setLoading(true)
      try {
        const [unitsRes, filesRes] = await Promise.all([
          api.get('/investor/units'),
          api.get(`/units/${unitId}/files`),
        ])
        if (!mounted) return
        const unitsData = Array.isArray(unitsRes.data) ? unitsRes.data : []
        const matchedUnit = unitsData.find((item: Unit) => item.id === unitId) || null
        setUnit(matchedUnit)
        setFiles(Array.isArray(filesRes.data) ? filesRes.data : [])
      } catch {
        if (!mounted) return
        setUnit(null)
        setFiles([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadPage()
    return () => { mounted = false }
  }, [unitId])

  async function handleDownload(file: PortalFile) {
    setDownloadingId(file.id)
    try {
      const response = await api.get(`/files/${file.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.nome_arquivo || `arquivo_${file.id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao baixar o arquivo.')
    } finally {
      setDownloadingId(null)
    }
  }

  const years = useMemo(() => {
    return Array.from(new Set(files.map((file) => String(file.ano_referencia)))).sort((a, b) => Number(b) - Number(a))
  }, [files])

  const months = useMemo(() => {
    return Array.from(new Set(files.map((file) => file.mes_referencia))).sort((a, b) => monthSortValue(a) - monthSortValue(b))
  }, [files])

  const types = useMemo(() => {
    return Array.from(new Set(files.map((file) => file.tipo_arquivo))).sort((a, b) => a.localeCompare(b))
  }, [files])

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (yearFilter && String(file.ano_referencia) !== yearFilter) return false
      if (monthFilter && file.mes_referencia !== monthFilter) return false
      if (typeFilter && file.tipo_arquivo !== typeFilter) return false
      if (searchFilter && 
          !file.titulo.toLowerCase().includes(searchFilter.toLowerCase()) && 
          !file.nome_arquivo.toLowerCase().includes(searchFilter.toLowerCase())) return false

      const fileDate = normalizeIsoDate(file.created_at)
      if (startDate && fileDate && fileDate < startDate) return false
      if (endDate && fileDate && fileDate > endDate) return false
      return true
    })
  }, [files, yearFilter, monthFilter, typeFilter, searchFilter, startDate, endDate])

  const groupedFiles = useMemo(() => {
    const grouped = filteredFiles.reduce<Record<string, Record<string, PortalFile[]>>>((acc, file) => {
      const year = String(file.ano_referencia)
      const month = file.mes_referencia
      if (!acc[year]) acc[year] = {}
      if (!acc[year][month]) acc[year][month] = []
      acc[year][month].push(file)
      return acc
    }, {})

    return Object.entries(grouped)
      .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
      .map(([year, monthMap]) => ({
        year,
        months: Object.entries(monthMap)
          .sort(([monthA], [monthB]) => monthSortValue(monthA) - monthSortValue(monthB))
          .map(([month, monthFiles]) => ({ month, files: monthFiles })),
      }))
  }, [filteredFiles])

  const clearFilters = () => {
    setYearFilter('')
    setMonthFilter('')
    setTypeFilter('')
    setSearchFilter('')
    setStartDate('')
    setEndDate('')
  }

  const lastUpload = useMemo(() => {
    if (!files.length) return 'Sem envios'
    const sorted = [...files].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    return formatDate(sorted[0]?.created_at)
  }, [files])

  return (
    <div className="investor-detail-page">
      <div className="hero-banner compact investor-hero investor-detail-hero">
        <div className="investor-detail-hero-main">
          <button type="button" className="back-chip" onClick={() => navigate('/investidor')}>
            <ArrowLeft size={16} />
            Voltar para minhas unidades
          </button>
          <div>
            <h2>{unit?.nome || 'Detalhes da unidade'}</h2>
            <p>Consulte suas DRE's</p>
          </div>
        </div>
      </div>

      <div className="stats-grid investor-detail-stats">
        <div className="stat-card orange">
          <div className="stat-icon"><FolderOpen size={22} /></div>
          <div>
            <div className="stat-title">Documentos encontrados</div>
            <div className="stat-value">{filteredFiles.length}</div>
          </div>
        </div>
        <div className="stat-card dark">
          <div className="stat-icon"><CalendarRange size={22} /></div>
          <div>
            <div className="stat-title">Último envio</div>
            <div className="stat-value">{lastUpload}</div>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><Filter size={22} /></div>
          <div>
            <div className="stat-title">Anos disponíveis</div>
            <div className="stat-value">{years.length || 0}</div>
          </div>
        </div>
      </div>

      <div className="table-card investor-filter-card">
        <div className="table-top investor-filter-top">
          <div>
            <h3>Filtros da unidade</h3>
            <span>Refine por ano, mês, tipo, período e título.</span>
          </div>
          <button type="button" className="outline-soft" onClick={clearFilters}>Limpar filtros</button>
        </div>

        <div className="investor-filter-grid">
          <label className="investor-filter-field investor-search-field">
            <span><Search size={14} /> Buscar por título</span>
            <input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Ex.: DRE, fluxo, fechamento..." />
          </label>

          <label className="investor-filter-field">
            <span>Ano</span>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="">Todos</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>

          <label className="investor-filter-field">
            <span>Mês</span>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="">Todos os meses</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {MONTH_ORDER[parseInt(month, 10) - 1] || month}
                </option>
              ))}
            </select>
          </label>

          <label className="investor-filter-field">
            <span>Tipo</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Todos</option>
              {types.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>

          <label className="investor-filter-field">
            <span>Data inicial</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>

          <label className="investor-filter-field">
            <span>Data final</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="table-card investor-document-card">
        <div className="table-top investor-filter-top">
          <div>
            <h3>Documentos organizados por ano e mês</h3>
            <span>Selecione os filtros acima para refinar a listagem.</span>
          </div>
        </div>

        {loading ? <div className="empty-users-state compact">Carregando documentos da unidade...</div> : null}
        {!loading && groupedFiles.length === 0 ? <div className="empty-users-state compact">Nenhum documento encontrado para os filtros informados.</div> : null}

        <div className="investor-year-stack">
          {groupedFiles.map((yearGroup) => (
            <section key={yearGroup.year} className="investor-year-group">
              <div className="investor-year-header">
                <h4>{yearGroup.year}</h4>
                <span>{yearGroup.months.reduce((acc, month) => acc + month.files.length, 0)} arquivo(s)</span>
              </div>

              <div className="investor-month-stack">
                {yearGroup.months.map((monthGroup) => {
                  const monthLabel = MONTH_ORDER[parseInt(monthGroup.month, 10) - 1] || monthGroup.month;
                  return (
                    <div key={`${yearGroup.year}-${monthGroup.month}`} className="investor-month-group">
                      <div className="investor-month-header">
                        <h5>{monthLabel}</h5>
                        <span>{monthGroup.files.length} documento(s)</span>
                      </div>

                      <div className="unit-file-list investor-detail-file-list">
                        {monthGroup.files.map((file) => (
                          <div className="unit-file-row investor-detail-file-row" key={file.id}>
                            <div className="file-row-main">
                              <div className="file-row-icon"><FileText size={18} /></div>
                              <div>
                                <strong>{file.titulo}</strong>
                                <span>{file.tipo_arquivo} • enviado em {formatDate(file.created_at)}</span>
                              </div>
                            </div>
                            <button
                              className="action-chip primary icon-action-chip"
                              onClick={() => void handleDownload(file)}
                              disabled={downloadingId === file.id}
                            >
                              <Download size={16} />
                              {downloadingId === file.id ? 'Baixando...' : 'Baixar PDF'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}