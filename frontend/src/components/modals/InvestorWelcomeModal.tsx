const investorFeatures = [
  'Acessar somente as unidades liberadas para o seu usuario.',
  'Consultar os documentos DRE de cada unidade.',
  'Buscar documentos por titulo e filtrar por ano e mes.',
  'Visualizar o PDF antes de baixar.',
  'Baixar os arquivos liberados com seguranca.',
]

interface InvestorWelcomeModalProps {
  onConfirm: () => void
}

export function InvestorWelcomeModal({ onConfirm }: InvestorWelcomeModalProps) {
  return (
    <div className="modal-overlay investor-welcome-overlay" onClick={(event) => event.stopPropagation()}>
      <div className="modal-card investor-welcome-modal" onClick={(event) => event.stopPropagation()}>
        <span className="investor-welcome-kicker">Portal do Investidor</span>
        <h2>O que voce pode fazer por aqui</h2>
        <p>
          Acompanhe suas unidades e acesse rapidamente os documentos disponibilizados pela Evoque Academia.
        </p>

        <ul className="investor-welcome-list">
          {investorFeatures.map((feature) => (
            <li key={feature}>
              <span aria-hidden="true">OK</span>
              {feature}
            </li>
          ))}
        </ul>

        <button type="button" className="btn-primary" onClick={onConfirm}>
          OK, entendi
        </button>
      </div>
    </div>
  )
}
