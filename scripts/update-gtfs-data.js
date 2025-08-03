#!/usr/bin/env node

/**
 * Script to fetch and process NJ Transit GTFS data for Jersey City routes
 * Uses the current data from NJ Transit's official GTFS feed via Transit.land
 */

const https = require('https')
const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream')
const { promisify } = require('util')
const streamPipeline = promisify(pipeline)

// NJ Transit GTFS feed URL from Transit.land
const GTFS_URL = 'https://www.njtransit.com/bus_data.zip'
const DATA_DIR = path.join(__dirname, '../src/data/jersey-city')
const TEMP_DIR = path.join(__dirname, '../temp')

// Jersey City bounding box (approximate)
const JERSEY_CITY_BOUNDS = {
  north: 40.76,
  south: 40.695,
  east: -74.025,
  west: -74.085,
}

// Route colors for visualization
const ROUTE_COLORS = [
  '#FF6347',
  '#4682B4',
  '#32CD32',
  '#FFD700',
  '#FF69B4',
  '#8A2BE2',
  '#00CED1',
  '#FF7F50',
  '#98FB98',
  '#F0E68C',
  '#DDA0DD',
  '#87CEEB',
  '#FA8072',
  '#FAFAD2',
  '#D3D3D3',
]

async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath)
    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          return downloadFile(response.headers.location, outputPath)
            .then(resolve)
            .catch(reject)
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`),
          )
          return
        }

        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
        file.on('error', reject)
      })
      .on('error', reject)
  })
}

async function extractZip(zipPath, extractPath) {
  const { createReadStream } = require('fs')
  const yauzl = require('yauzl')

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err)

      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          zipfile.readEntry()
        } else {
          // File entry
          const outputPath = path.join(extractPath, entry.fileName)
          const outputDir = path.dirname(outputPath)

          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err)

            const writeStream = fs.createWriteStream(outputPath)
            readStream.pipe(writeStream)
            writeStream.on('close', () => {
              zipfile.readEntry()
            })
          })
        }
      })

      zipfile.on('end', resolve)
      zipfile.on('error', reject)
    })
  })
}

function parseCSV(content) {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/"/g, ''))
    const obj = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    return obj
  })
}

function isInJerseyCity(lat, lng) {
  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)

  return (
    latNum >= JERSEY_CITY_BOUNDS.south &&
    latNum <= JERSEY_CITY_BOUNDS.north &&
    lngNum >= JERSEY_CITY_BOUNDS.west &&
    lngNum <= JERSEY_CITY_BOUNDS.east
  )
}

async function processGTFSData() {
  try {
    console.log('Creating directories...')
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true })
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    const zipPath = path.join(TEMP_DIR, 'nj_transit_bus.zip')
    const extractPath = path.join(TEMP_DIR, 'gtfs')

    console.log('Downloading NJ Transit GTFS data...')
    await downloadFile(GTFS_URL, zipPath)

    console.log('Extracting GTFS data...')
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true })
    }

    // For now, let's use a simpler approach - manual extraction
    console.log(
      'Please manually extract the downloaded ZIP file to:',
      extractPath,
    )
    console.log('ZIP file location:', zipPath)
    console.log('Then run this script again.')

    // Check if files already exist
    const routesPath = path.join(extractPath, 'routes.txt')
    const gtfsStopsPath = path.join(extractPath, 'stops.txt')
    const shapesPath = path.join(extractPath, 'shapes.txt')

    if (!fs.existsSync(routesPath)) {
      console.log(
        'GTFS files not found. Please extract manually and run again.',
      )
      return
    }

    console.log('Processing GTFS files...')

    // Parse routes
    const routesContent = fs.readFileSync(routesPath, 'utf8')
    const routes = parseCSV(routesContent)

    // Parse stops
    const stopsContent = fs.readFileSync(gtfsStopsPath, 'utf8')
    const stops = parseCSV(stopsContent)

    // Filter stops in Jersey City
    const jerseyCityStops = stops.filter((stop) =>
      isInJerseyCity(stop.stop_lat, stop.stop_lon),
    )

    console.log(`Found ${jerseyCityStops.length} stops in Jersey City`)

    // Parse shapes (route geometries)
    const shapesContent = fs.readFileSync(shapesPath, 'utf8')
    const shapes = parseCSV(shapesContent)

    // Group shapes by shape_id
    const shapeGroups = {}
    shapes.forEach((shape) => {
      if (!shapeGroups[shape.shape_id]) {
        shapeGroups[shape.shape_id] = []
      }
      shapeGroups[shape.shape_id].push({
        lat: parseFloat(shape.shape_pt_lat),
        lng: parseFloat(shape.shape_pt_lon),
        sequence: parseInt(shape.shape_pt_sequence),
      })
    })

    // Sort points by sequence
    Object.keys(shapeGroups).forEach((shapeId) => {
      shapeGroups[shapeId].sort((a, b) => a.sequence - b.sequence)
    })

    // Filter shapes that pass through Jersey City
    const jerseyCityShapes = {}
    Object.keys(shapeGroups).forEach((shapeId) => {
      const shape = shapeGroups[shapeId]
      const hasJerseyCityPoints = shape.some((point) =>
        isInJerseyCity(point.lat, point.lng),
      )
      if (hasJerseyCityPoints) {
        jerseyCityShapes[shapeId] = shape
      }
    })

    console.log(
      `Found ${Object.keys(jerseyCityShapes).length} route shapes in Jersey City`,
    )

    // Create GeoJSON for bus routes
    const busRoutesGeoJSON = {
      type: 'FeatureCollection',
      features: [],
    }

    let colorIndex = 0
    Object.keys(jerseyCityShapes)
      .slice(0, 15)
      .forEach((shapeId) => {
        // Limit to first 15 for performance
        const shape = jerseyCityShapes[shapeId]
        const coordinates = shape.map((point) => [point.lng, point.lat])

        // Find route info for this shape
        const routeInfo = routes.find(
          (route) =>
            route.route_short_name && route.route_short_name.length > 0,
        ) || { route_short_name: shapeId, route_long_name: `Route ${shapeId}` }

        const feature = {
          type: 'Feature',
          properties: {
            name: `Route ${routeInfo.route_short_name}`,
            description: routeInfo.route_long_name || '',
            color: ROUTE_COLORS[colorIndex % ROUTE_COLORS.length],
            shape_id: shapeId,
          },
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        }

        busRoutesGeoJSON.features.push(feature)
        colorIndex++
      })

    // Save the bus routes GeoJSON
    const busRoutesPath = path.join(DATA_DIR, 'bus-routes.json')
    fs.writeFileSync(busRoutesPath, JSON.stringify(busRoutesGeoJSON, null, 2))

    console.log(
      `Saved ${busRoutesGeoJSON.features.length} bus routes to ${busRoutesPath}`,
    )

    // Create simplified stops data
    const stopsGeoJSON = {
      type: 'FeatureCollection',
      features: jerseyCityStops.slice(0, 100).map((stop) => ({
        // Limit for performance
        type: 'Feature',
        properties: {
          name: stop.stop_name,
          stop_id: stop.stop_id,
          stop_code: stop.stop_code || '',
        },
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(stop.stop_lon), parseFloat(stop.stop_lat)],
        },
      })),
    }

    const outputStopsPath = path.join(DATA_DIR, 'bus-stops.json')
    fs.writeFileSync(outputStopsPath, JSON.stringify(stopsGeoJSON, null, 2))

    console.log(
      `Saved ${stopsGeoJSON.features.length} bus stops to ${outputStopsPath}`,
    )
    console.log('GTFS data processing complete!')
  } catch (error) {
    console.error('Error processing GTFS data:', error)
  }
}

if (require.main === module) {
  processGTFSData()
}

module.exports = { processGTFSData }
