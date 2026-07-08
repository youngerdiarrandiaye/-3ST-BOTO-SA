'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'

interface Props {
  onResult: (text: string) => void
}

export default function QRScanner({ onResult }: Props) {
  const [ready, setReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const scannerRef   = useRef<any>(null)
  const hasScannedRef = useRef(false)
  const mountedRef   = useRef(true)
  const isRunningRef = useRef(false)          // true uniquement après .start() résolu
  const onResultRef  = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult })

  useEffect(() => {
    mountedRef.current  = true
    hasScannedRef.current = false
    isRunningRef.current  = false
    const ELEMENT_ID = 'qr-video-container'

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mountedRef.current) return

      const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false } as any)
      scannerRef.current = scanner

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText: string) => {
            if (hasScannedRef.current || !mountedRef.current) return
            hasScannedRef.current = true
            isRunningRef.current  = false
            try { await scanner.stop() } catch {}
            if (mountedRef.current) onResultRef.current(decodedText)
          },
          () => {} // per-frame errors — ignore
        )
        .then(() => {
          if (!mountedRef.current) {
            // Composant démonté pendant le démarrage — arrêt immédiat
            try { scanner.stop().catch(() => {}) } catch {}
            return
          }
          isRunningRef.current = true
          setReady(true)
        })
        .catch((err: any) => {
          if (mountedRef.current) setCameraError(err?.message ?? 'Caméra inaccessible')
        })
    })

    return () => {
      mountedRef.current = false
      // N'appelle stop() que si le scanner est réellement en train de scanner
      if (isRunningRef.current) {
        isRunningRef.current = false
        try { scannerRef.current?.stop().catch(() => {}) } catch {}
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
        <Camera size={36} className="text-red-400" />
        <p className="text-sm font-semibold text-red-400">Caméra inaccessible</p>
        <p className="text-xs text-[#8B949E]">{cameraError}</p>
        <p className="text-xs text-[#8B949E]">
          Autorisez l&apos;accès à la caméra dans votre navigateur puis rechargez.
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[280px]">
      <div id="qr-video-container" className="w-full overflow-hidden rounded-xl" />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D1117] rounded-xl gap-3">
          <Camera size={36} className="text-[#F59E0B] animate-pulse" />
          <p className="text-sm text-[#8B949E]">Démarrage caméra…</p>
          <p className="text-xs text-[#8B949E]">Autorisez l&apos;accès si demandé</p>
        </div>
      )}
    </div>
  )
}
