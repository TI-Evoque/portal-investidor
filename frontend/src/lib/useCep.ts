import { useState, useCallback } from 'react'

export interface CepData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

export function useCep(onFill: (data: CepData) => void) {
  const [loadingCep, setLoadingCep] = useState(false)
  const [cepError, setCepError] = useState('')

  const fetchCep = useCallback(async (raw: string) => {
    const cep = raw.replace(/\D/g, '')
    setCepError('')
    if (cep.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (data.erro) {
        setCepError('CEP não encontrado')
        return
      }
      onFill({
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        localidade: data.localidade || '',
        uf: data.uf || '',
      })
    } catch {
      setCepError('Erro ao buscar CEP')
    } finally {
      setLoadingCep(false)
    }
  }, [onFill])

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
  }

  return { loadingCep, cepError, fetchCep, formatCep }
}
