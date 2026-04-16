import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, FileText, PencilLine, Trash2 } from 'lucide-react'

import { Pagination } from '../../components/ui/Pagination'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'
import { getMonthLabel, normalizeMonth } from '../../lib/months'
import { PortalFile, Unit } from '../../types'

const ITEMS_PER_PAGE = 10
const FILE_TYPES = ['DRE', 'Gastos', 'Receitas', 'Balancete', 'Contrato', 'Outros']
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const YEARS = Array.from({ length: 8 }, (_, index) => String(new Date().getFullYear() + 2 - index))

type FileEditForm = {
  titulo: string
  tipo_arquivo: string
  mes_referencia: string
  ano_referencia: number
  unit_ids: number[]
}

function FileEditModal({
  file,
  units,
  onClose,
  onSave,
}: {
  file: PortalFile
  units: Unit[]
  onClose: () => void
  onSave: (payload: FileEditForm) => Promise<void>
}) {
  const [form, setForm] = useState<FileEditForm>({
    titulo: file.titulo,
    tipo_arquivo: file.tipo_arquivo,
    mes_referencia: file.mes_referencia,
    ano_referencia: file.ano_referencia,
    unit_ids: [...file.unit_ids],
  })
  const [isSaving, setIsSaving] = useState(false)

  const toggleUnit = (unitId: number) => {
    setForm((prev) => ({
      ...prev,
      unit_ids: prev.unit_ids.includes(unitId)
        ? prev.unit_ids.filter((id) => id !== unitId)
        : [...prev.unit_ids, unitId],
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.titulo.trim()) {
      alert('Informe o titulo do arquivo.')
      return
    }
    if (form.unit_ids.length === 0) {
      alert('Selecione pelo menos uma unidade.')
      return
    }
    setIsSaving(true)
    try {
      await onSave({
        ...form,
        titulo: form.titulo.trim(),
        tipo_arquivo: form.tipo_arquivo.trim(),
        mes_referencia: form.mes_referencia.trim(),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Editar arquivo</h2>
            <p className="modal-subtitle">Atualize os dados do PDF e as unidades vinculadas.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>x</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid two-columns">
            <div className="form-group">
              <label>Titulo</label>
              <input
                value={form.titulo}
                onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                placeholder="Titulo do arquivo"
              />
            </div>

            <div className="form-group">
              <label>Tipo</label>
              <select
                value={form.tipo_arquivo}
                onChange={(event) => setForm((prev) => ({ ...prev, tipo_arquivo: event.target.value }))}
              >
                {FILE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Mes</label>
              <select
                value={form.mes_referencia}
                onChange={(event) => setForm((prev) => ({ ...prev, mes_referencia: event.target.value }))}
              >
                {MONTHS.map((month) => (
                  <option key={month} value={month}>{getMonthLabel(month)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ano</label>
              <select
                value={String(form.ano_referencia)}
                onChange={(event) => setForm((prev) => ({ ...prev, ano_referencia: Number(event.target.value) }))}
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-section">
            <h3>Unidades vinculadas</h3>
            <div className="unit-selection-list compact">
              {units.map((unit) => {
                const checked = form.unit_ids.includes(unit.id)
                return (
                  <label key={unit.id} className={`unit-selection-row ${checked ? 'selected' : ''}`}>
                    <div className="unit-selection-copy">
                      <strong>{unit.nome}</strong>
                      <small>{unit.cidade || unit.endereco || 'Unidade vinculavel'}</small>
                    </div>
                    <input type="checkbox" checked={checked} onChange={() => toggleUnit(unit.id)} />
                  </label>
                )
              })}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FilesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const filePermissions = user?.permissions?.files
  const [files, setFiles] = useState<PortalFile[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUnit, setSelectedUnit] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [editingFile, setEditingFile] = useState<PortalFile | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadFiles = async () => {
    try {
      const res = await api.get('/files')
      setFiles(Array.isArray(res.data) ? res.data : [])
    } catch {
      setFiles([])
    }
  }

  useEffect(() => {
    void loadFiles()
    if (isAdmin) {
      api.get('/units').then((res) => setUnits(Array.isArray(res.data) ? res.data : [])).catch(() => setUnits([]))
    }
  }, [isAdmin])

  const uniqueUnits = useMemo(() => Array.from(new Set(files.flatMap((f) => f.unit_names))).sort(), [files])
  const uniqueMonths = useMemo(() => Array.from(new Set(files.map((f) => normalizeMonth(f.mes_referencia)))).sort(), [files])
  const uniqueYears = useMemo(() => Array.from(new Set(files.map((f) => String(f.ano_referencia)))).sort((a, b) => Number(b) - Number(a)), [files])

  const filteredFiles = files.filter((file) => {
    const unitMatch = selectedUnit === 'all' || file.unit_names.includes(selectedUnit)
    const monthMatch = selectedMonth === 'all' || normalizeMonth(file.mes_referencia) === selectedMonth
    const yearMatch = selectedYear === 'all' || String(file.ano_referencia) === selectedYear
    return unitMatch && monthMatch && yearMatch
  })

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE) || 1
  const paginatedFiles = filteredFiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const clearFilters = () => {
    setSelectedUnit('all')
    setSelectedMonth('all')
    setSelectedYear('all')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    selectedUnit !== 'all' ||
    selectedMonth !== 'all' ||
    selectedYear !== 'all'

  const handlePreview = async (file: PortalFile) => {
    setBusyId(file.id)
    try {
      const response = await api.get(`/files/${file.id}/download`, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    } catch {
      alert('Nao foi possivel visualizar o PDF.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDownload = async (file: PortalFile) => {
    setBusyId(file.id)
    try {
      const response = await api.get(`/files/${file.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = file.nome_arquivo || `arquivo_${file.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Nao foi possivel baixar o arquivo.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (file: PortalFile) => {
    if (!window.confirm(`Excluir o arquivo "${file.titulo}"?`)) return
    setBusyId(file.id)
    try {
      await api.delete(`/files/${file.id}`)
      setFiles((prev) => prev.filter((item) => item.id !== file.id))
    } catch {
      alert('Nao foi possivel excluir o arquivo.')
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveEdit = async (payload: FileEditForm) => {
    if (!editingFile) return
    await api.patch(`/files/${editingFile.id}`, payload)
    await loadFiles()
    setEditingFile(null)
  }

  const canUseFileAction = (action: string, hideKey?: string) => {
    if (!filePermissions) return true
    if (filePermissions[action] !== true) return false
    if (hideKey && filePermissions[hideKey] === true) return false
    return true
  }

  return (
    <div>
      <SectionHeader title="Arquivos" />

      <div className="filters-grid files-filters-grid">
        <div className="filter-box">
          <select value={selectedUnit} onChange={(event) => { setSelectedUnit(event.target.value); setCurrentPage(1) }}>
            <option value="all">Todas as unidades</option>
            {uniqueUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
          {selectedUnit !== 'all' ? <button onClick={() => { setSelectedUnit('all'); setCurrentPage(1) }} className="filter-clear">x</button> : null}
        </div>

        <div className="filter-box">
          <select value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setCurrentPage(1) }}>
            <option value="all">Todos os meses</option>
            {uniqueMonths.map((month) => <option key={month} value={month}>{getMonthLabel(month)}</option>)}
          </select>
          {selectedMonth !== 'all' ? <button onClick={() => { setSelectedMonth('all'); setCurrentPage(1) }} className="filter-clear">x</button> : null}
        </div>

        <div className="filter-box">
          <select value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); setCurrentPage(1) }}>
            <option value="all">Todos os anos</option>
            {uniqueYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          {selectedYear !== 'all' ? <button onClick={() => { setSelectedYear('all'); setCurrentPage(1) }} className="filter-clear">x</button> : null}
        </div>
      </div>

      {hasActiveFilters ? (
        <div style={{ textAlign: 'right', marginBottom: '12px' }}>
          <button onClick={clearFilters} className="link-button">Limpar filtros</button>
        </div>
      ) : null}

      {filteredFiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Nenhum arquivo encontrado com os filtros selecionados.</div>
      ) : (
        <>
          <div className="table-card flat">
            {paginatedFiles.map((file) => (
              <div className="file-row files-page files-page-grid" key={file.id}>
                <span className="file-icon"><FileText size={18} /></span>
                <span className="file-main-text">{file.titulo}</span>
                <span className="file-main-text muted">{file.unit_names.join(', ')}</span>
                <span>{getMonthLabel(file.mes_referencia)}/{file.ano_referencia}</span>
                <div className="file-row-actions">
                  {canUseFileAction('view', 'hide_preview_button') ? (
                    <button
                      type="button"
                      className="icon-square-btn"
                      title="Visualizar PDF"
                      onClick={() => void handlePreview(file)}
                      disabled={busyId === file.id}
                    >
                      <Eye size={17} />
                    </button>
                  ) : null}
                  {isAdmin && canUseFileAction('edit', 'hide_edit_button') ? (
                    <button type="button" className="icon-square-btn" title="Editar" onClick={() => setEditingFile(file)}>
                      <PencilLine size={17} />
                    </button>
                  ) : null}
                  {canUseFileAction('download', 'hide_download_button') ? (
                    <button
                      type="button"
                      className="icon-square-btn"
                      title="Baixar PDF"
                      onClick={() => void handleDownload(file)}
                      disabled={busyId === file.id}
                    >
                      <Download size={17} />
                    </button>
                  ) : null}
                  {isAdmin && canUseFileAction('delete', 'hide_delete_button') ? (
                    <button
                      type="button"
                      className="icon-square-btn danger"
                      title="Excluir"
                      onClick={() => void handleDelete(file)}
                      disabled={busyId === file.id}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginTop: '16px' }}>
            Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredFiles.length)} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredFiles.length)} de {filteredFiles.length} arquivos
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {editingFile && isAdmin ? (
        <FileEditModal file={editingFile} units={units} onClose={() => setEditingFile(null)} onSave={handleSaveEdit} />
      ) : null}
    </div>
  )
}
