import { useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'

interface AuthenticatedImageProps {
  src?: string
  alt: string
  className?: string
  style?: React.CSSProperties
  fallback?: React.ReactNode
}

export function AuthenticatedImage({ src, alt, className, style, fallback = null }: AuthenticatedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>('')
  const [failed, setFailed] = useState(false)

  const shouldFetchWithAuth = useMemo(() => {
    if (!src) return false
    if (src.startsWith('data:') || src.startsWith('blob:')) return false
    return src.includes('/units/') && src.includes('/photo')
  }, [src])

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    async function load() {
      setFailed(false)

      if (!src) {
        setResolvedSrc('')
        return
      }

      if (!shouldFetchWithAuth) {
        setResolvedSrc(src)
        return
      }

      try {
        const response = await api.get(src, { responseType: 'blob' })
        objectUrl = URL.createObjectURL(response.data)
        if (!cancelled) {
          setResolvedSrc(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setResolvedSrc('')
          setFailed(true)
        }
      }
    }

    load()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [src, shouldFetchWithAuth])

  if (!resolvedSrc || failed) {
    return <>{fallback}</>
  }

  return <img src={resolvedSrc} alt={alt} className={className} style={style} />
}
