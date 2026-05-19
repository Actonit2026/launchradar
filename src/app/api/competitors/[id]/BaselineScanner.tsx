'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const MESSAGES = [
  'Discovering pages…',
  'Crawling homepage links…',
  'Scanning pricing page…',
  'Extracting positioning…',
  'Analyzing features…',
  'Generating intelligence snapshot…',
]

export default function BaselineScanner({ competitorId }: { competitorId: string }) {
  const router = useRouter()
  const [msgIndex, setMsgIndex] = useState(0)
  const [status, setStatus] = useState<'scanning' | 'error'>('scanning')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const hasRun = useRef(false)

  const runScan = async () => {
    setStatus('scanning')
    setErrorMsg(null)
    setMsgIndex(0)
    try {
      const res = await fetch(`/api/competitors/${competitorId}/baseline`, { method: 'POST' })
      const data = await res.json()
      if (res.ok || data.alreadyDone) {
        router.refresh()
      } else {
        setStatus('error')
        setErrorMsg(data.error ?? 'Scan failed. Please retry.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please retry.')
    }
  }

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    runScan()
  }, [competitorId])

  useEffect(() => {
    if (status !== 'scanning') return
    const interval = setInterval(() => {
      setMsgIndex(i => Math.min(i + 1, MESSAGES.length - 1))
    }, 2800)
    return () => clearInterval(interval)
  }, [status])

  if (status === 'error') {
    return (
      <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-8 text-center mb-8">
        <div className="text-3xl mb-3 text-red-400">⊗</div>
        <p className="font-semibold text-red-400 mb-1">Scan failed</p>
        <p className="text-radar-text-muted text-sm mb-5">{errorMsg}</p>
        <button onClick={runScan} className="text-sm bg-radar-surface border border-radar-border text-radar-text px-5 py-2 rounded-lg hover:border-radar-accent/40 hover:text-radar-accent transition-colors">
          Retry scan
        </button>
      </div>
    )
  }

  return (
    <div className="border border-radar-accent/20 bg-radar-surface rounded-xl p-10 text-center mb-8">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-radar-accent/15" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-radar-accent animate-spin" style={{ animationDuration: '1.2s' }} />
        <div className="absolute inset-3 rounded-full border border-radar-accent/10" />
        <div className="absolute inset-0 flex items-center justify-center text-radar-accent text-lg">◎</div>
      </div>
      <p className="font-semibold text-radar-text mb-2">Building intelligence snapshot</p>
      <p className="text-radar-accent text-sm font-mono min-h-[1.25rem]">{MESSAGES[msgIndex]}</p>
      <p className="text-radar-text-muted text-xs mt-4">Discovering pages, extracting data, generating insight — takes 15–40s</p>
    </div>
  )
}
