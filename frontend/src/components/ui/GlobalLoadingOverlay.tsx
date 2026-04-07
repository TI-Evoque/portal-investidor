import { useSyncExternalStore } from 'react'
import { getApiLoadingSnapshot, subscribeToApiLoading } from '../../lib/apiLoading'

export function GlobalLoadingOverlay() {
  const isLoading = useSyncExternalStore(subscribeToApiLoading, getApiLoadingSnapshot, getApiLoadingSnapshot)

  if (!isLoading) return null

  return (
    <div className="global-loading-overlay" aria-live="polite" aria-busy="true">
      <div className="global-loading-card">
        <div className="spinner" aria-hidden="true"></div>
        <p>Carregando dados...</p>
      </div>
    </div>
  )
}
