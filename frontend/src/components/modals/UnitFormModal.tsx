import { useState, useRef } from 'react'
import { Unit } from '../../types'
import { AuthenticatedImage } from '../ui/AuthenticatedImage'
import { useCep } from '../../lib/useCep'

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

interface UnitFormModalProps {
  unit?: Unit
  onClose: () => void
  onSubmit: (data: Partial<Unit>, photoFile?: File | null) => Promise<void>
}

export function UnitFormModal({ unit, onClose, onSubmit }: UnitFormModalProps) {
  const [formData, setFormData] = useState<Partial<Unit> & { foto_url?: string; cep?: string; bairro?: string }>({
    nome: unit?.nome || '',
    cep: '',
    endereco: unit?.endereco || '',
    bairro: '',
    cidade: unit?.cidade || '',
    estado: unit?.estado || '',
    status_texto: unit?.status_texto || 'Unidade inaugurada',
    foto_url: unit?.foto_url || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string>(unit?.foto_url || '')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { loadingCep, cepError, fetchCep, formatCep } = useCep((data) => {
    setFormData((prev) => ({
      ...prev,
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    }))
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value)
    setFormData((prev) => ({ ...prev, cep: formatted }))
    if (formatted.replace(/\D/g, '').length === 8) fetchCep(formatted)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem válida (PNG, JPG, etc)'); return }
    if (file.size > 5 * 1024 * 1024) { setError('A imagem não pode ultrapassar 5MB'); return }
    setSelectedPhoto(file)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setPreview(base64)
      setFormData((prev) => ({ ...prev, foto_url: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const clearSelectedPhoto = () => {
    setSelectedPhoto(null)
    setPreview('')
    setFormData((prev) => ({ ...prev, foto_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome?.trim()) { setError('Nome da unidade é obrigatório'); return }
    setLoading(true)
    try {
      await onSubmit(formData, selectedPhoto)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar unidade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-unit-compact modal-card-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{unit ? 'Editar unidade' : 'Cadastrar unidade'}</h2>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form modal-form-spacious">

          {/* Foto */}
          <div className="unit-form-compact-header">
            <div className="photo-preview-compact photo-upload-surface" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}>
              {preview ? (
                preview.startsWith('data:') || preview.startsWith('blob:') ? (
                  <img src={preview} alt="Foto da unidade" className="photo-upload-preview" />
                ) : (
                  <AuthenticatedImage src={preview} alt="Foto da unidade" className="photo-upload-preview"
                    fallback={<div className="photo-placeholder-empty-compact"><span>📷</span><p>Foto da unidade</p></div>} />
                )
              ) : (
                <div className="photo-placeholder-empty-compact"><span>📷</span><p>Foto da unidade</p></div>
              )}
            </div>
            <div className="unit-form-compact-side">
              <div className="unit-photo-actions">
                <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Selecionar foto</button>
                {(preview || selectedPhoto) ? (
                  <button type="button" className="btn-secondary unit-photo-remove-btn" onClick={clearSelectedPhoto}>Remover foto</button>
                ) : null}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <p className="unit-photo-help">
                {selectedPhoto ? `Arquivo selecionado: ${selectedPhoto.name}` : 'Envie uma imagem JPG, PNG ou WebP com até 5MB.'}
              </p>
            </div>
          </div>

          {/* Nome */}
          <div className="form-group">
            <label>Nome da unidade *</label>
            <input value={formData.nome || ''} onChange={(e) => handleChange('nome', e.target.value)} required />
          </div>

          {/* CEP */}
          <div className="form-group">
            <label>CEP {loadingCep ? <span style={{ fontSize: 12, color: '#888' }}>Buscando...</span> : null}</label>
            <input
              value={formData.cep || ''}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
            />
            {cepError ? <span style={{ fontSize: 12, color: '#e53e3e' }}>{cepError}</span> : null}
          </div>

          {/* Endereço + Bairro */}
          <div className="form-grid two-columns">
            <div className="form-group">
              <label>Endereço</label>
              <input value={formData.endereco || ''} onChange={(e) => handleChange('endereco', e.target.value)} placeholder="Rua, número" />
            </div>
            <div className="form-group">
              <label>Bairro</label>
              <input value={formData.bairro || ''} onChange={(e) => handleChange('bairro', e.target.value)} />
            </div>
          </div>

          {/* Estado + Cidade */}
          <div className="form-grid two-columns">
            <div className="form-group">
              <label>Estado (UF)</label>
              <select value={formData.estado || ''} onChange={(e) => handleChange('estado', e.target.value)}>
                <option value="">Selecione</option>
                {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <input value={formData.cidade || ''} onChange={(e) => handleChange('cidade', e.target.value)} />
            </div>
          </div>

          {/* Status */}
          <div className="form-group">
            <label>Status</label>
            <select value={formData.status_texto || 'Unidade inaugurada'} onChange={(e) => handleChange('status_texto', e.target.value)}>
              <option value="Unidade inaugurada">Unidade inaugurada</option>
              <option value="Em implantação">Em implantação</option>
              <option value="Em reforma">Em reforma</option>
              <option value="Fechada temporariamente">Fechada temporariamente</option>
            </select>
          </div>

          {error ? <div className="form-error">{error}</div> : null}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
