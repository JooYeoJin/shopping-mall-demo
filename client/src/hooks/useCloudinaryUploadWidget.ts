import { useCallback, useEffect, useRef, useState } from 'react'
import { getCloudinaryConfig } from '@/config/cloudinary'
import type { CloudinaryWidget } from '@/types/cloudinary-widget'

const WIDGET_SCRIPT =
  'https://upload-widget.cloudinary.com/global/all.js'

let scriptLoading: Promise<void> | null = null

function loadCloudinaryScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.cloudinary?.createUploadWidget) return Promise.resolve()
  if (scriptLoading) return scriptLoading

  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SCRIPT}"]`
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('Cloudinary 스크립트 로드 실패'))
      )
      if (window.cloudinary?.createUploadWidget) resolve()
      return
    }

    const script = document.createElement('script')
    script.src = WIDGET_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Cloudinary 스크립트 로드 실패'))
    document.body.appendChild(script)
  })

  return scriptLoading
}

type UploadSuccess = {
  publicId: string
  url: string
}

export function useCloudinaryUploadWidget(
  onSuccess: (payload: UploadSuccess) => void
) {
  const { cloudName, uploadPreset, isConfigured } = getCloudinaryConfig()
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const widgetRef = useRef<CloudinaryWidget | null>(null)
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    if (!isConfigured) return

    let cancelled = false
    ;(async () => {
      try {
        await loadCloudinaryScript()
        if (cancelled || !window.cloudinary?.createUploadWidget) return

        widgetRef.current = window.cloudinary.createUploadWidget(
          {
            cloudName,
            uploadPreset,
            sources: ['local', 'url', 'camera'],
            multiple: false,
            folder: 'withblooming/products',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            maxImageFileSize: 8_000_000,
            cropping: false,
          },
          (error, result) => {
            if (error) return
            if (result.event === 'success' && result.info) {
              onSuccessRef.current({
                publicId: result.info.public_id,
                url: result.info.secure_url,
              })
            }
          }
        )
        if (!cancelled) setReady(true)
      } catch (err) {
        if (!cancelled) {
          setInitError(
            err instanceof Error
              ? err.message
              : 'Cloudinary 위젯을 초기화하지 못했습니다.'
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [cloudName, uploadPreset, isConfigured])

  const openWidget = useCallback(() => {
    if (!widgetRef.current) return
    widgetRef.current.open()
  }, [])

  return {
    isConfigured,
    ready,
    initError,
    openWidget,
  }
}