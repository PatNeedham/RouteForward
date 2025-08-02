'use client'

import { useState } from 'react'
import { Share2, Copy, Check, ExternalLink } from 'lucide-react'
import { createShortUrl } from '@/utils/urlState'

interface ShareButtonProps {
  shareableUrl: string
  className?: string
}

const ShareButton: React.FC<ShareButtonProps> = ({
  shareableUrl,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shortUrl, setShortUrl] = useState<string | null>(null)
  const [isCreatingShortUrl, setIsCreatingShortUrl] = useState(false)

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const generateShortUrl = async () => {
    if (shortUrl) return shortUrl

    setIsCreatingShortUrl(true)
    try {
      const generated = await createShortUrl(shareableUrl)
      setShortUrl(generated)
      return generated
    } catch (error) {
      console.error('Failed to create short URL:', error)
      return shareableUrl
    } finally {
      setIsCreatingShortUrl(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Transit Scenario',
          text: 'Check out this transit scenario simulation',
          url: shareableUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleShare}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        title="Share this scenario"
      >
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 w-80 z-50">
          <h3 className="text-white font-semibold mb-3">Share This Scenario</h3>

          {/* Full URL */}
          <div className="mb-3">
            <label className="block text-gray-300 text-sm mb-1">
              Full URL:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareableUrl}
                readOnly
                className="flex-1 px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600"
              />
              <button
                onClick={() => copyToClipboard(shareableUrl)}
                className="p-1 bg-gray-600 hover:bg-gray-500 rounded"
                title="Copy full URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Short URL */}
          <div className="mb-3">
            <label className="block text-gray-300 text-sm mb-1">
              Short URL:
            </label>
            <div className="flex items-center space-x-2">
              {shortUrl ? (
                <>
                  <input
                    type="text"
                    value={shortUrl}
                    readOnly
                    className="flex-1 px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600"
                  />
                  <button
                    onClick={() => copyToClipboard(shortUrl)}
                    className="p-1 bg-gray-600 hover:bg-gray-500 rounded"
                    title="Copy short URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-gray-400 text-xs">
                    Click to generate
                  </span>
                  <button
                    onClick={generateShortUrl}
                    disabled={isCreatingShortUrl}
                    className="p-1 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-50"
                    title="Generate short URL"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Social Media Links */}
          <div className="space-y-2">
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareableUrl)}&text=${encodeURIComponent('Check out this transit scenario simulation')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-left px-2 py-1 text-blue-400 hover:bg-gray-700 rounded text-sm"
            >
              Share on Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareableUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-left px-2 py-1 text-blue-400 hover:bg-gray-700 rounded text-sm"
            >
              Share on Facebook
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent('Transit Scenario Simulation')}&body=${encodeURIComponent(`Check out this transit scenario: ${shareableUrl}`)}`}
              className="block w-full text-left px-2 py-1 text-blue-400 hover:bg-gray-700 rounded text-sm"
            >
              Share via Email
            </a>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
          >
            Close
          </button>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  )
}

export default ShareButton
