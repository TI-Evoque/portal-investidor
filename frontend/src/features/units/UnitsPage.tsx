import { useEffect, useMemo, useState } from 'react'
import { Download, FilePenLine, FolderUp, PencilLine, Search, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import { getMonthLabel } from '../../lib/months'
import { DEFAULT_UNIT_IMAGE } from '../../lib/unitPhoto'
import { PortalFile, Unit, User } from '../../types'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { UnitFormModal } from '../../components/modals/UnitFormModal'
import { Pagination } from '../../components/ui/Pagination'
import { AuthenticatedImage } from '../../components/ui/AuthenticatedImage'
import { useAuth } from '../../contexts/AuthContext'

const ITEMS_PER_PAGE = 10
const currentYear = new Date().getFullYear()
const FILE_TYPES = ['DRE', 'Gastos', 'Receitas', 'Balancete', 'Contrato', 'Outros']
const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => String(currentYear + 2 - index))

type UnitFilesTab = 'upload' | 'documents'

function UnitFilesModal({
  unit,
  files,
  onClose,
  onRefresh,
}: {
  unit: Unit
  files: PortalFile[]
  onClose: () => void
  onRefresh: () => Promise<void>
}) {
  const [titulo, setTitulo] = useState('')
  const [tipoArquivo, setTipoArquivo] = useState('Gastos')
  const [mesReferencia, setMesReferencia] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [anoReferencia, setAnoReferencia] = useState(String(currentYear))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<UnitFilesTab>('upload')
  const [filterYear, setFilterYear] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const filteredFiles = useMemo(
    () =>
      files.filter((file) => {
        const yearOk = filterYear === 'all' || String(file.ano_referencia) === filterYear
        const monthOk = filterMonth === 'all' || String(file.mes_referencia).padStart(2, '0') === filterMonth
        const typeOk = filterType === 'all' || file.tipo_arquivo === filterType
        return yearOk && monthOk && typeOk
      }),
    [files, filterMonth, filterType, filterYear]
  )

  const availableYears = useMemo(
    () => Array.from(new Set(files.map((file) => String(file.ano_referencia)))).sort((a, b) => Number(b) - Number(a)),
    [files]
  )

  const tabClassName = (tab: UnitFilesTab) => `modal-tab-btn ${activeTab === tab ? 'active' : ''}`

  const handleDownload = async (file: PortalFile) => {
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Selecione um PDF para enviar.')
      return
    }
    const formData = new FormData()
    formData.append('titulo', titulo || selectedFile.name.replace(/\.pdf$/i, ''))
    formData.append('tipo_arquivo', tipoArquivo)
    formData.append('mes_referencia', mesReferencia)
    formData.append('ano_referencia', anoReferencia)
    formData.append('upload', selectedFile)

    setSubmitting(true)
    setError('')
    try {
      await api.post(`/units/${unit.id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setTitulo('')
      setTipoArquivo('Gastos')
      setMesReferencia(String(new Date().getMonth() + 1).padStart(2, '0'))
      setAnoReferencia(String(currentYear))
      setSelectedFile(null)
      await onRefresh()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Não foi possível enviar o PDF.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Excluir este PDF desta unidade?')) return
    await api.delete(`/files/${fileId}`)
    await onRefresh()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Arquivos da unidade</h2>
            <p className="modal-subtitle">{unit.nome}</p>
          </div>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <div className="modal-tabs" role="tablist" aria-label="Arquivos da unidade">
          <button type="button" className={tabClassName('upload')} onClick={() => setActiveTab('upload')}>
            Enviar documento
          </button>
          <button type="button" className={tabClassName('documents')} onClick={() => setActiveTab('documents')}>
            Documentos enviados
          </button>
        </div>

        {activeTab === 'upload' ? (
          <form className="modal-form" onSubmit={handleUpload}>
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Enviar PDF da unidade</h3>
                <p className="modal-subtitle">Cadastre um novo documento sem misturar com a listagem já enviada.</p>
              </div>

              <div className="form-grid two-columns">
                <div className="form-group">
                  <label>Título</label>
                  <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Gastos operacionais" />
                </div>
                <div className="form-group">
                  <label>Tipo do arquivo</label>
                  <select value={tipoArquivo} onChange={(e) => setTipoArquivo(e.target.value)}>
                    {FILE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Mês de referência</label>
                  <select value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} required>
                    {MONTH_OPTIONS.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Ano</label>
                  <select value={anoReferencia} onChange={(e) => setAnoReferencia(e.target.value)} required>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>PDF</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} required />
                </div>
              </div>
              {error ? <div className="form-error">{error}</div> : null}
              <div className="modal-actions modal-actions-end" style={{ marginTop: 16 }}>
                <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Enviando...' : 'Enviar PDF'}</button>
              </div>
            </div>
          </form>
        ) : (
          <div className="modal-form">
            <div className="modal-section modal-tab-panel">
              <div className="modal-panel-intro">
                <h3>Documentos enviados</h3>
                <p className="modal-subtitle">Filtre por ano, mês e tipo para manter tudo organizado.</p>
              </div>

              <div className="filters-grid unit-files-filters">
                <div className="filter-box">
                  <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                    <option value="all">Todos os anos</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-box">
                  <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                    <option value="all">Todos os meses</option>
                    {MONTH_OPTIONS.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-box">
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="all">Todos os tipos</option>
                    {FILE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredFiles.length === 0 ? <div className="empty-users-state compact">Nenhum documento encontrado com os filtros selecionados.</div> : null}
              <div className="unit-file-list">
                {filteredFiles.map((file) => (
                  <div className="unit-file-row" key={file.id}>
                    <div>
                      <strong>{file.titulo}</strong>
                      <span>{file.tipo_arquivo} • {getMonthLabel(file.mes_referencia)}/{file.ano_referencia}</span>
                    </div>
                    <div className="unit-inline-actions">
                      <button
                        type="button"
                        className="action-chip primary icon-action-chip"
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id}
                      >
                        <Download size={16} />
                        {downloadingId === file.id ? 'Baixando...' : 'Baixar'}
                      </button>
                      <button type="button" className="action-chip danger icon-action-chip" onClick={() => handleDeleteFile(file.id)}>
                        <Trash2 size={16} /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function UnitUsersModal({
  unit,
  users,
  onClose,
}: {
  unit: Unit
  users: User[]
  onClose: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Investidores associados</h2>
            <p className="modal-subtitle">{unit.nome}</p>
          </div>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <div className="unit-user-list">
          {users.length === 0 ? <div className="empty-users-state compact">Nenhum usuário vinculado a esta unidade.</div> : null}
          {users.map((user) => (
            <div className="unit-user-row" key={user.id}>
              <div className="mini-avatar">{user.nome[0]}</div>
              <div>
                <strong>{user.nome} {user.sobrenome || ''}</strong>
                <span>{user.email}</span>
              </div>
              <div className="pill-status ok">{user.role === 'super_admin' ? 'Super admin' : user.role === 'admin' ? 'Administrador' : 'Investidor'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function UnitsPage() {
  const { user } = useAuth()
  const unitPermissions = user?.permissions?.units
  const [units, setUnits] = useState<Unit[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUnitForFiles, setSelectedUnitForFiles] = useState<Unit | null>(null)
  const [selectedUnitForUsers, setSelectedUnitForUsers] = useState<Unit | null>(null)
  const [unitFiles, setUnitFiles] = useState<PortalFile[]>([])
  const [unitUsers, setUnitUsers] = useState<User[]>([])

  const loadUnits = async () => {
    try {
      const res = await api.get('/units')
      setUnits(Array.isArray(res.data) ? res.data : [])
    } catch {
      setUnits([])
    }
  }

  useEffect(() => {
    void loadUnits()
  }, [])

  const filteredUnits = useMemo(() => units.filter((unit) =>
    unit.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.endereco.toLowerCase().includes(searchTerm.toLowerCase())
  ), [units, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / ITEMS_PER_PAGE))
  const paginatedUnits = filteredUnits.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleOpenCreateModal = () => {
    setEditingUnit(undefined)
    setShowModal(true)
  }

  const handleOpenEditModal = (unit: Unit) => {
    setEditingUnit(unit)
    setShowModal(true)
  }

  const handleSubmit = async (data: Partial<Unit>, photoFile?: File | null, removePhoto = false) => {
    const payload = removePhoto ? { ...data, foto_url: '' } : data
    let savedUnit: Unit
    if (editingUnit) {
      const res = await api.patch(`/units/${editingUnit.id}`, payload)
      savedUnit = res.data as Unit
    } else {
      const res = await api.post('/units', payload)
      savedUnit = res.data as Unit
    }

    if (photoFile && savedUnit?.id) {
      const formData = new FormData()
      formData.append('foto', photoFile)
      await api.post(`/units/${savedUnit.id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }

    await loadUnits()
  }

  const handleDelete = async (unitId: number) => {
    if (!window.confirm('Tem certeza que deseja deletar esta unidade?')) return
    await api.delete(`/units/${unitId}`)
    await loadUnits()
  }

  const openUnitFiles = async (unit: Unit) => {
    const res = await api.get(`/units/${unit.id}/files`)
    setUnitFiles(Array.isArray(res.data) ? res.data : [])
    setSelectedUnitForFiles(unit)
  }

  const refreshUnitFiles = async () => {
    if (!selectedUnitForFiles) return
    const res = await api.get(`/units/${selectedUnitForFiles.id}/files`)
    setUnitFiles(Array.isArray(res.data) ? res.data : [])
  }

  const openUnitUsers = async (unit: Unit) => {
    const res = await api.get(`/units/${unit.id}/users`)
    setUnitUsers(Array.isArray(res.data) ? res.data : [])
    setSelectedUnitForUsers(unit)
  }

  const canUseUnitAction = (action: string, hideKey?: string) => {
    if (!unitPermissions) return true
    if (unitPermissions[action] !== true) return false
    if (hideKey && unitPermissions[hideKey] === true) return false
    return true
  }

  return (
    <div>
      <SectionHeader
        title="Unidades"
        action={
          <div className="header-actions">
            {canUseUnitAction('create', 'hide_create_button') ? (
              <button className="outline-soft" onClick={handleOpenCreateModal}>+ Cadastrar unidade</button>
            ) : null}
          </div>
        }
      />
      <div className="search-bar">
        <input
          placeholder="Pesquisar"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
        />
        <button type="button"><Search size={18} /></button>
      </div>
      <div className="list-stack">
        {paginatedUnits.map((unit) => (
          <div className="unit-card unit-card-rich" key={unit.id}>
            <div className="unit-photo">
              {unit.foto_url ? (
                <AuthenticatedImage
                  src={unit.foto_url}
                  alt={unit.nome}
                  className="unit-photo-image"
                  fallback={
                    <div className="unit-photo unit-photo-default-wrap">
                      <img src={DEFAULT_UNIT_IMAGE} alt="Imagem padrao da unidade" className="unit-photo-image unit-photo-default" />
                    </div>
                  }
                />
              ) : (
                <div className="unit-photo unit-photo-default-wrap">
                  <img src={DEFAULT_UNIT_IMAGE} alt="Imagem padrao da unidade" className="unit-photo-image unit-photo-default" />
                </div>
              )}
            </div>
            <div className="unit-info">
              <strong>{unit.nome}</strong>
              <p>{[unit.endereco, unit.cidade, unit.estado].filter(Boolean).join(' - ') || 'Endereço não informado'}</p>
              <span>{unit.status_texto}</span>
            </div>
            <div className="unit-actions rich">
              {canUseUnitAction('create', 'hide_upload_button') ? (
                <button onClick={() => openUnitFiles(unit)} title="Upload e PDFs" className="icon-square-btn"><FolderUp size={18} /></button>
              ) : null}
              {canUseUnitAction('view', 'hide_investors_button') ? (
                <button onClick={() => openUnitUsers(unit)} title="Investidores associados" className="icon-square-btn"><FilePenLine size={18} /></button>
              ) : null}
              {canUseUnitAction('edit', 'hide_edit_button') ? (
                <button onClick={() => handleOpenEditModal(unit)} title="Editar" className="icon-square-btn"><PencilLine size={18} /></button>
              ) : null}
              {canUseUnitAction('delete', 'hide_delete_button') ? (
                <button onClick={() => handleDelete(unit.id)} title="Deletar" className="icon-square-btn"><Trash2 size={18} /></button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {filteredUnits.length > 0 ? (
        <>
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginTop: '16px' }}>
            Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUnits.length)} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredUnits.length)} de {filteredUnits.length} unidades
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      ) : null}
      {showModal ? <UnitFormModal unit={editingUnit} onClose={() => setShowModal(false)} onSubmit={handleSubmit} /> : null}
      {selectedUnitForFiles ? <UnitFilesModal unit={selectedUnitForFiles} files={unitFiles} onClose={() => setSelectedUnitForFiles(null)} onRefresh={refreshUnitFiles} /> : null}
      {selectedUnitForUsers ? <UnitUsersModal unit={selectedUnitForUsers} users={unitUsers} onClose={() => setSelectedUnitForUsers(null)} /> : null}
    </div>
  )
}
