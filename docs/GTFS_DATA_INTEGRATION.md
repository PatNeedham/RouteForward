# NJ Transit GTFS Data Integration

## Overview

This document explains the improvements made to the RouteForward application for displaying realistic NJ Transit bus routes in Jersey City.

## Data Sources

### Current Source: Transit.land (Recommended)

- **URL**: https://www.transit.land/feeds/f-dr5-nj~transit~bus
- **Direct GTFS Feed**: https://www.njtransit.com/bus_data.zip
- **Update Frequency**: Updated 2-3 times per week
- **Data Quality**: High - official NJ Transit data
- **Last Update**: July 31, 2025 (as of August 2, 2025)

### Previous Source: TransitFeeds.com (Deprecated)

- **URL**: https://transitfeeds.com/p/nj-transit/409/latest
- **Status**: ⚠️ **DEPRECATED** - Service ending December 2025
- **Data Quality**: Outdated (last update January 2, 2024)
- **Recommendation**: Do not use

## Current Implementation

### Temporary Realistic Data

The application now uses manually curated, realistic bus route data that:

- Follows actual Jersey City streets and major routes
- Includes real NJ Transit route numbers (87, 1, 10, 119, 125, 9)
- Contains route descriptions matching actual service patterns
- Uses proper coordinate sequences that align with road networks

### Improved UX Features

1. **Hover Tooltips**: Bus routes now show information on hover instead of requiring clicks
2. **Visual Feedback**: Routes highlight when hovered with increased line weight and opacity
3. **Enhanced Styling**: Custom tooltip styling with better contrast and readability

## GTFS Data Processing Script

### Usage

```bash
npm run update-gtfs
```

### What it does:

1. Downloads the latest NJ Transit GTFS data from official source
2. Filters routes and stops within Jersey City boundaries
3. Processes shape data to create accurate route geometries
4. Generates GeoJSON files compatible with the mapping interface

### Output Files:

- `src/data/jersey-city/bus-routes.json` - Route geometries and metadata
- `src/data/jersey-city/bus-stops.json` - Stop locations and information

## Implementation Details

### Route Data Structure

```json
{
  "type": "Feature",
  "properties": {
    "name": "Route 87",
    "description": "Washington St - Newark Ave - West Side Ave",
    "color": "#FF6347"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [[-74.0455, 40.7149], ...]
  }
}
```

### Interactive Features

- **Hover Effects**: Routes respond to mouse hover with visual feedback
- **Tooltips**: Display route name and description on hover
- **Click Popups**: Detailed information available on click
- **Consistent Styling**: Color-coded routes with proper opacity and weight

## Technical Improvements

### Before

- Random, unrealistic route coordinates
- Click-only interaction
- No route descriptions
- Poor visual feedback

### After

- Realistic routes following actual streets
- Hover-based tooltips
- Rich route metadata
- Enhanced visual interactions
- Proper coordinate alignment with road networks

## Next Steps

1. **Automate GTFS Processing**: Fully implement the GTFS data processing script
2. **Real-time Updates**: Add scheduled updates of route data
3. **Stop Information**: Integrate bus stop locations and schedules
4. **Service Patterns**: Add time-based route variations
5. **Accessibility**: Ensure compliance with accessibility standards

## Troubleshooting

### Common Issues

1. **Missing Routes**: Ensure GTFS data download completed successfully
2. **Coordinate Misalignment**: Check Jersey City bounding box parameters
3. **Performance**: Limit number of routes displayed simultaneously

### Debug Commands

```bash
# Check GTFS data freshness
node scripts/update-gtfs-data.js

# Verify coordinate bounds
grep -A 10 "JERSEY_CITY_BOUNDS" scripts/update-gtfs-data.js
```

## Resources

- [NJ Transit Developer Tools](https://www.njtransit.com/developer-tools)
- [GTFS Reference](https://gtfs.org/schedule/reference/)
- [Transit.land Documentation](https://www.transit.land/documentation/)
- [Leaflet Tooltip Documentation](https://leafletjs.com/reference.html#tooltip)
