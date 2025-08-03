import pako from 'pako'
import { MapState, EncodedMapState, DEFAULT_MAP_STATE } from '@/types/mapState'

/**
 * Safely encode data to base64 with optional compression
 */
export const encodeMapData = (
  data: any,
  useCompression = false,
): string | null => {
  try {
    const jsonString = JSON.stringify(data)

    if (useCompression) {
      const compressed = pako.deflate(jsonString)
      const binaryString = String.fromCharCode.apply(
        null,
        Array.from(compressed),
      )
      return btoa(binaryString)
    } else {
      return btoa(jsonString)
    }
  } catch (error) {
    console.error('Failed to encode map data:', error)
    return null
  }
}

/**
 * Safely decode base64 data with optional decompression
 */
export const decodeMapData = (
  encoded: string,
  useCompression = false,
): any | null => {
  try {
    if (useCompression) {
      const decoded = atob(encoded)
      const charData = decoded.split('').map((x) => x.charCodeAt(0))
      const binData = new Uint8Array(charData)
      const decompressed = pako.inflate(binData, { to: 'string' })
      return JSON.parse(decompressed)
    } else {
      const decoded = atob(encoded)
      return JSON.parse(decoded)
    }
  } catch (error) {
    console.error('Failed to decode map data:', error)
    return null
  }
}

/**
 * Encode complete map state to URL parameters
 */
export const encodeMapStateToUrl = (state: MapState): EncodedMapState => {
  const encoded: EncodedMapState = {}

  // Encode viewport
  const viewportEncoded = encodeMapData(state.viewport)
  if (viewportEncoded) {
    encoded.v = viewportEncoded
  }

  // Encode routes with compression (they can be large)
  if (state.routes.features.length > 0) {
    const routesEncoded = encodeMapData(state.routes, true)
    if (routesEncoded) {
      encoded.r = routesEncoded
    }
  }

  // Encode simulation time (simple string, no need for base64)
  if (state.simulation.time) {
    encoded.t = state.simulation.time
  }

  // Encode other simulation settings if they exist
  if (state.simulation.speed) {
    encoded.s = state.simulation.speed.toString()
  }

  if (state.simulation.mode) {
    encoded.m = state.simulation.mode
  }

  // Encode layer visibility if different from default
  if (state.layers) {
    const layerStates = []
    if (state.layers.streetNetwork === false) layerStates.push('sn:0')
    if (state.layers.hblr === false) layerStates.push('hblr:0')
    if (layerStates.length > 0) {
      encoded.l = layerStates.join(',')
    }
  }

  return encoded
}

/**
 * Decode URL parameters to map state with fallbacks
 */
export const decodeUrlToMapState = (params: URLSearchParams): MapState => {
  const state: MapState = {
    ...DEFAULT_MAP_STATE,
    routes: {
      type: 'FeatureCollection',
      features: [],
    },
    layers: { ...DEFAULT_MAP_STATE.layers },
  }

  // Decode viewport
  const viewportParam = params.get('v')
  if (viewportParam) {
    const viewport = decodeMapData(viewportParam)
    if (viewport && viewport.center && viewport.zoom) {
      state.viewport = viewport
    }
  }

  // Decode routes
  const routesParam = params.get('r')
  if (routesParam) {
    const routes = decodeMapData(routesParam, true)
    if (routes && routes.type === 'FeatureCollection' && routes.features) {
      state.routes = routes
    }
  }

  // Decode simulation time
  const timeParam = params.get('t')
  if (timeParam && /^\d{2}:\d{2}$/.test(timeParam)) {
    state.simulation.time = timeParam
  }

  // Decode simulation speed
  const speedParam = params.get('s')
  if (speedParam) {
    const speed = parseFloat(speedParam)
    if (!isNaN(speed) && speed > 0) {
      state.simulation.speed = speed
    }
  }

  // Decode simulation mode
  const modeParam = params.get('m')
  if (modeParam) {
    state.simulation.mode = modeParam
  }

  // Decode layer visibility
  const layersParam = params.get('l')
  if (layersParam && state.layers) {
    const layerSettings = layersParam.split(',')
    layerSettings.forEach((setting) => {
      const [key, value] = setting.split(':')
      if (key === 'sn' && value === '0') {
        state.layers!.streetNetwork = false
      } else if (key === 'hblr' && value === '0') {
        state.layers!.hblr = false
      }
    })
  }

  return state
}

/**
 * Generate a shareable URL for the current map state
 */
export const generateShareableUrl = (
  state: MapState,
  baseUrl: string,
): string => {
  const encoded = encodeMapStateToUrl(state)
  const params = new URLSearchParams()

  Object.entries(encoded).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value)
    }
  })

  const paramString = params.toString()
  return paramString ? `${baseUrl}?${paramString}` : baseUrl
}

/**
 * Create a shortened URL using a simple hash-based approach
 * In production, this would integrate with a URL shortening service
 */
export const createShortUrl = async (
  fullUrl: string,
): Promise<string | null> => {
  try {
    // Extract just the query parameters for hashing
    const url = new URL(fullUrl)
    const params = url.searchParams.toString()

    if (!params) return fullUrl

    // Create a simple hash of the parameters
    const encoder = new TextEncoder()
    const data = encoder.encode(params)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Use first 8 characters of hash
    const shortCode = hashHex.substring(0, 8)

    // In a real implementation, you would:
    // 1. Store the mapping in a database/service
    // 2. Return a short URL like https://rf.ly/abc123
    // 3. Have a redirect service that expands the short URL

    // For now, return a mock short URL format
    return `${url.origin}/s/${shortCode}`
  } catch (error) {
    console.error('Failed to create short URL:', error)
    return null
  }
}

/**
 * Validate that a URL state is compatible across devices/platforms
 */
export const validateUrlCompatibility = (url: string): boolean => {
  try {
    // Check URL length (some platforms have limits)
    if (url.length > 2048) {
      console.warn('URL may be too long for some platforms')
      return false
    }

    // Check for problematic characters
    const problematicChars = /[<>"{}|\\^`\[\]]/
    if (problematicChars.test(url)) {
      console.warn('URL contains characters that may cause issues')
      return false
    }

    // Validate URL structure
    new URL(url)

    return true
  } catch (error) {
    console.error('Invalid URL structure:', error)
    return false
  }
}
