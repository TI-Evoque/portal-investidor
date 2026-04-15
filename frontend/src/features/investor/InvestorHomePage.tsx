import { useEffect, useState } from 'react'
import { ArrowRight, Building2, FolderOpen, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { PortalFile, Unit } from '../../types'

export function InvestorHomePage() {
  const navigate = useNavigate()
  const [units, setUnits] = useState<Unit[]>([])
  const [filesByUnit, setFilesByUnit] = useState<Record<number, PortalFile[]>>({})

  useEffect(() => {
    api.get('/investor/units').then(async (res) => {
      const nextUnits = Array.isArray(res.data) ? res.data : []
      setUnits(nextUnits)

      const loadedEntries = await Promise.all(nextUnits.map(async (unit) => {
        try {
          const filesRes = await api.get(`/units/${unit.id}/files`)
          return [unit.id, Array.isArray(filesRes.data) ? filesRes.data : []] as const
        } catch {
          return [unit.id, []] as const
        }
      }))

      setFilesByUnit(Object.fromEntries(loadedEntries))
    }).catch(() => {
      setUnits([])
      setFilesByUnit({})
    })
  }, [])

  const totalFiles = Object.values(filesByUnit).reduce((acc, current) => acc + current.length, 0)

  return (
    <div>
      <div className="hero-banner compact investor-hero">
        <img
          src="https://images.totalpass.com/public/1280x720/czM6Ly90cC1pbWFnZS1hZG1pbi1wcm9kL2d5bXMvNHVrOWtkOGd3M2xlMXg4OGNzdzViN2NhdmUzY2hhNWV3Y2lyd2pyNmI4djl6aXdiNTV2YXg3bjJ2aDI2"
          alt="Evoque Academia"
          className="investor-hero-logo"
        />
        <div>
          <h2>Portal do Investidor</h2>
          <p>Abra cada unidade para visualizar seus respectivos documentos.</p>
        </div>
      </div>

      <div className="stats-grid investor-detail-stats">
        <div className="stat-card orange">
          <div className="stat-icon"><Building2 size={22} /></div>
          <div>
            <div className="stat-title">Minhas unidades</div>
            <div className="stat-value">{units.length}</div>
          </div>
        </div>
        <div className="stat-card dark">
          <div className="stat-icon"><FolderOpen size={22} /></div>
          <div>
            <div className="stat-title">Arquivos liberados</div>
            <div className="stat-value">{totalFiles}</div>
          </div>
        </div>
      </div>

      <div className="investor-unit-grid">
        {units.map((unit) => {
          const unitFiles = filesByUnit[unit.id] || []
          const years = new Set(unitFiles.map((file) => file.ano_referencia))
          return (
            <div className="table-card investor-unit-panel" key={unit.id}>
              <div className="investor-unit-panel-top">
                <div>
                  <h3>{unit.nome}</h3>
                  <div className="user-mail investor-unit-address"><MapPin size={14} /> {[unit.endereco, unit.cidade, unit.estado].filter(Boolean).join(' • ')}</div>
                </div>
                <div className="pill-status ok">{unitFiles.length} arquivo(s)</div>
              </div>

              <div className="investor-unit-metadata">
                <span>{years.size} ano(s) com documentos</span>
                <span>{unitFiles[0]?.tipo_arquivo ? `Último tipo: ${unitFiles[0].tipo_arquivo}` : 'Sem documentos ainda'}</span>
              </div>

              <button type="button" className="action-chip primary investor-open-button" onClick={() => navigate(`/investidor/unidades/${unit.id}`)}>
                Abrir detalhes da unidade
                <ArrowRight size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
