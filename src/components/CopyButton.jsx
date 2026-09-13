import { useState } from 'react'

export default function CopyButton({ value, label = 'Copy Order Number' }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Fallback for browsers/contexts without Clipboard API access.
      const textarea = document.createElement('textarea')
      textarea.value = value
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button type="button" className="btn btn--outline" onClick={handleCopy}>
      {copied ? 'Copied!' : label}
    </button>
  )
}
