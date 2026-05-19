'use client'

import { useState } from 'react'

export default function ScanNowButton() {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<string | null>(null)

  async function handleScan() {
    setStatus('scanning')
    setResult(null)

    try {
      const res = await fetch('/api/scan', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setResult(
          `Scanned ${data.scanned} pages · ${data.changed} change${data.changed !== 1 ? 's' : ''} detected`
        )
        setStatus('done')
      } else {
        setResult(data.error ?? 'Scan failed')
        setStatus('error')
      }
    } catch {
      setResult('Network error')
      setStatus('error')
    }

    // Reset after 8 seconds
    setTimeout(() => {
      setStatus('idle')
      setResult(null)
    }, 8000)
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-xs font-mono ${status === 'error' ? 'text-red-400' : 'text-radar-accent'}`}
        >
          {result}
        </span>
      )}
      <button
        onClick={handleScan}
        disabled={status === 'scanning'}
        className="flex items-center gap-2 text-xs border border-radar-border text-radar-text-muted hover:border-radar-accent/40 hover:text-radar-accent px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'scanning'
              ? 'bg-radar-accent animate-pulse'
              : 'bg-radar-text-muted'
          }`}
        />
        {status === 'scanning' ? 'Scanning…' : 'Scan now'}
      </button>
    </div>
  )
}
