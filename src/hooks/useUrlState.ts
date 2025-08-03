import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MapState, DEFAULT_MAP_STATE } from '@/types/mapState'
import {
  decodeUrlToMapState,
  generateShareableUrl,
  validateUrlCompatibility,
} from '@/utils/urlState'

export interface UseUrlStateOptions {
  enableHistory?: boolean
  debounceMs?: number
}

export interface UseUrlStateReturn {
  mapState: MapState
  updateMapState: (partial: Partial<MapState>) => void
  shareableUrl: string
  isValidUrl: boolean
  resetToDefault: () => void
}

/**
 * Custom hook for managing map state in URL with browser history support
 */
export const useUrlState = (
  options: UseUrlStateOptions = {},
): UseUrlStateReturn => {
  const { enableHistory = true, debounceMs = 500 } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mapState, setMapState] = useState<MapState>(DEFAULT_MAP_STATE)
  const [shareableUrl, setShareableUrl] = useState('')
  const [isValidUrl, setIsValidUrl] = useState(true)
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isInitialLoadRef = useRef(true)

  // Load state from URL on mount and when search params change
  useEffect(() => {
    try {
      const decodedState = decodeUrlToMapState(searchParams)
      setMapState((prevState) => {
        // Only update if the decoded state is actually different
        if (JSON.stringify(prevState) !== JSON.stringify(decodedState)) {
          return decodedState
        }
        return prevState
      })
      isInitialLoadRef.current = false
    } catch (error) {
      console.error('Failed to load state from URL:', error)
      setMapState(DEFAULT_MAP_STATE)
      setIsValidUrl(false)
    }
  }, [searchParams])

  // Generate shareable URL whenever map state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fullUrl = generateShareableUrl(
        mapState,
        window.location.origin + pathname,
      )
      setShareableUrl(fullUrl)
      setIsValidUrl(validateUrlCompatibility(fullUrl))
    }
  }, [mapState, pathname])

  // Debounced URL update function
  const updateUrl = useCallback(
    (state: MapState, replace = true) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      updateTimeoutRef.current = setTimeout(() => {
        try {
          const fullUrl = generateShareableUrl(
            state,
            window.location.origin + pathname,
          )
          const url = new URL(fullUrl)
          const newPath = `${pathname}${url.search}`

          if (replace || isInitialLoadRef.current) {
            router.replace(newPath)
          } else if (enableHistory) {
            router.push(newPath)
          } else {
            router.replace(newPath)
          }
        } catch (error) {
          console.error('Failed to update URL:', error)
        }
      }, debounceMs)
    },
    [router, pathname, enableHistory, debounceMs],
  )

  // Update map state and sync to URL
  const updateMapState = useCallback(
    (partial: Partial<MapState>) => {
      setMapState((current) => {
        const newState: MapState = {
          viewport: { ...current.viewport, ...partial.viewport },
          routes: partial.routes || current.routes,
          simulation: { ...current.simulation, ...partial.simulation },
          layers: { ...current.layers, ...partial.layers },
        }

        // Don't create history entry for initial load
        const shouldReplace = isInitialLoadRef.current || !enableHistory
        updateUrl(newState, shouldReplace)

        return newState
      })
    },
    [updateUrl, enableHistory],
  )

  // Reset to default state
  const resetToDefault = useCallback(() => {
    setMapState(DEFAULT_MAP_STATE)
    updateUrl(DEFAULT_MAP_STATE, true)
    setIsValidUrl(true)
  }, [updateUrl])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // The URL has already changed, so re-decode from current URL
      const currentParams = new URLSearchParams(window.location.search)
      try {
        const decodedState = decodeUrlToMapState(currentParams)
        setMapState(decodedState)
        setIsValidUrl(true)
      } catch (error) {
        console.error('Failed to handle browser navigation:', error)
        setIsValidUrl(false)
      }
    }

    if (enableHistory && typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [enableHistory])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  return {
    mapState,
    updateMapState,
    shareableUrl,
    isValidUrl,
    resetToDefault,
  }
}
