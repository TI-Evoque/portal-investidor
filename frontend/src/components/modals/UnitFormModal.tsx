import { useRef, useState } from 'react'
import { Unit } from '../../types'
import { useCep } from '../../lib/useCep'
import { DEFAULT_UNIT_IMAGE } from '../../lib/unitPhoto'
import { AuthenticatedImage } from '../ui/AuthenticatedImage'

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

interface UnitFormModalProps {
  unit?: Unit
  onClose: () => void
  onSubmit: (data: Partial<Unit>, photoFile?: File | null, removePhoto?: boolean) => Promise<void>
}

export function UnitFormModal({ unit, onClose, onSubmit }: UnitFormModalProps) {
  const [formData, setFormData] = useState<Partial<Unit> & { cep?: string; bairro?: string }>({
    nome: unit?.nome || '',
    cep: '',
    endereco: unit?.endereco || '',
    bairro: '',
    cidade: unit?.cidade || '',
    estado: unit?.estado || '',
    status_texto: unit?.status_texto || 'Unidade inaugurada',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string>(unit?.foto_url || '')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem valida (PNG, JPG, etc).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem nao pode ultrapassar 5MB.')
      return
    }

    setSelectedPhoto(file)
    setRemovePhoto(false)
    setError('')

    const reader = new FileReader()
    reader.onload = () => {
      setPreview(String(reader.result || ''))
    }
    reader.readAsDataURL(file)
  }

  const clearSelectedPhoto = () => {
    setSelectedPhoto(null)
    setPreview('')
    setRemovePhoto(!!unit?.foto_url)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.nome?.trim()) {
      setError('Nome da unidade e obrigatorio.')
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData, selectedPhoto, removePhoto)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar unidade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-unit-compact modal-card-scrollable" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{unit ? 'Editar unidade' : 'Cadastrar unidade'}</h2>
          <button onClick={onClose} className="modal-close-btn">x</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form modal-form-spacious">
          <div className="unit-form-compact-header">
            <div
              className="photo-preview-compact photo-upload-surface"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
            >
              {preview ? (
                preview.startsWith('data:') || preview.startsWith('blob:') ? (
                  <img src={preview} alt="Foto da unidade" className="photo-upload-preview" />
                ) : (
                  <AuthenticatedImage
                    src={preview}
                    alt="Foto da unidade"
                    className="photo-upload-preview"
                    fallback={<img src={DEFAULT_UNIT_IMAGE} alt="Imagem padrao da unidade" className="photo-upload-preview" />}
                  />
                )
              ) : (
                <img src={DEFAULT_UNIT_IMAGE} alt="Imagem padrao da unidade" className="photo-upload-preview" />
              )}
            </div>

            <div className="unit-form-compact-side">
              <div className="unit-photo-actions">
                <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                  Selecionar foto
                </button>
                {(preview || selectedPhoto || unit?.foto_url) ? (
                  <button type="button" className="btn-secondary unit-photo-remove-btn" onClick={clearSelectedPhoto}>
                    Remover foto
                  </button>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <p className="unit-photo-help">
                {selectedPhoto ? `Arquivo selecionado: ${selectedPhoto.name}` : 'Envie uma imagem JPG, PNG ou WebP com ate 5MB.'}
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Nome da unidade *</label>
            <input value={formData.nome || ''} onChange={(event) => handleChange('nome', event.target.value)} required />
          </div>

          <div className="form-group">
            <label>CEP {loadingCep ? <span style={{ fontSize: 12, color: '#888' }}>Buscando...</span> : null}</label>
            <input
              value={formData.cep || ''}
              onChange={(event) => handleCepChange(event.target.value)}
              placeholder="00000-000"
              maxLength={9}
            />
            {cepError ? <span style={{ fontSize: 12, color: '#e53e3e' }}>{cepError}</span> : null}
          </div>

          <div className="form-grid two-columns">
            <div className="form-group">
              <label>Endereco</label>
              <input value={formData.endereco || ''} onChange={(event) => handleChange('endereco', event.target.value)} placeholder="Rua, numero" />
            </div>
            <div className="form-group">
              <label>Bairro</label>
              <input value={formData.bairro || ''} onChange={(event) => handleChange('bairro', event.target.value)} />
            </div>
          </div>

          <div className="form-grid two-columns">
            <div className="form-group">
              <label>Estado (UF)</label>
              <select value={formData.estado || ''} onChange={(event) => handleChange('estado', event.target.value)}>
                <option value="">Selecione</option>
                {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <input value={formData.cidade || ''} onChange={(event) => handleChange('cidade', event.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select value={formData.status_texto || 'Unidade inaugurada'} onChange={(event) => handleChange('status_texto', event.target.value)}>
              <option value="Unidade inaugurada">Unidade inaugurada</option>
              <option value="Em implantacao">Em implantacao</option>
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
