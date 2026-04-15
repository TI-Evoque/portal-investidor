import { useState } from 'react'

const investorOnboardingPages = [
  {
    eyebrow: 'O portal mudou',
    title: 'Mesmo visual, novas funcoes',
    description:
      'O aplicativo continua com a mesma identidade, mas agora ficou mais direto para consultar unidades, documentos e arquivos liberados.',
    items: [
      'Acesso organizado por unidade.',
      'Documentos separados para facilitar a consulta.',
      'Navegacao ajustada para celular e computador.',
    ],
  },
  {
    eyebrow: 'Minhas unidades',
    title: 'Comece escolhendo uma unidade',
    description:
      'Na area do investidor voce visualiza somente as unidades liberadas para o seu usuario.',
    items: [
      'Entre em Minhas unidades.',
      'Escolha a unidade desejada.',
      'Veja a quantidade de documentos disponiveis.',
    ],
  },
  {
    eyebrow: 'Documentos DRE',
    title: 'Encontre os arquivos com filtros simples',
    description:
      'A listagem foi simplificada para documentos DRE. Use a busca e os filtros de periodo para chegar mais rapido ao arquivo certo.',
    items: [
      'Busque pelo titulo do documento.',
      'Filtre por ano e mes quando precisar.',
      'Abra a unidade para ver os documentos liberados.',
    ],
  },
  {
    eyebrow: 'PDF liberado',
    title: 'Visualize ou baixe o arquivo',
    description:
      'Depois de encontrar o documento, voce pode abrir o PDF para conferir ou baixar uma copia para guardar.',
    items: [
      'Clique em Visualizar PDF para abrir no navegador.',
      'Clique em Baixar PDF para salvar o arquivo.',
      'Quando terminar, esta mensagem nao aparece novamente.',
    ],
  },
]

interface InvestorWelcomeModalProps {
  onConfirm: () => void
}

export function InvestorWelcomeModal({ onConfirm }: InvestorWelcomeModalProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const page = investorOnboardingPages[currentPage]
  const isFirstPage = currentPage === 0
  const isLastPage = currentPage === investorOnboardingPages.length - 1

  const goBack = () => {
    setCurrentPage((pageIndex) => Math.max(pageIndex - 1, 0))
  }

  const goNext = () => {
    if (isLastPage) {
      onConfirm()
      return
    }

    setCurrentPage((pageIndex) => Math.min(pageIndex + 1, investorOnboardingPages.length - 1))
  }

  return (
    <div className="modal-overlay investor-welcome-overlay" onClick={(event) => event.stopPropagation()}>
      <div className="modal-card investor-welcome-modal" onClick={(event) => event.stopPropagation()}>
        <span className="investor-welcome-kicker">Portal do Investidor</span>
        <div className="investor-welcome-progress" aria-label={`Passo ${currentPage + 1} de ${investorOnboardingPages.length}`}>
          {investorOnboardingPages.map((onboardingPage, pageIndex) => (
            <span
              key={onboardingPage.title}
              className={pageIndex === currentPage ? 'active' : ''}
              aria-hidden="true"
            />
          ))}
        </div>

        <span className="investor-welcome-eyebrow">{page.eyebrow}</span>
        <h2>{page.title}</h2>
        <p>{page.description}</p>

        <ul className="investor-welcome-list">
          {page.items.map((feature) => (
            <li key={feature}>
              <span aria-hidden="true">OK</span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="investor-welcome-actions">
          <button type="button" className="btn-secondary" onClick={goBack} disabled={isFirstPage}>
            Voltar
          </button>
          <button type="button" className="btn-primary" onClick={goNext}>
            {isLastPage ? 'OK, entendi' : 'Avancar'}
          </button>
        </div>
      </div>
    </div>
  )
}
