'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useUrlState } from '@/hooks/useUrlState'
import ShareButton from './ShareButton'
import ComparisonMap from './ComparisonMap'
import { semanticColors } from '@/config/colors'

interface MapWithHeaderProps {
  city: string
}

export default function MapWithHeader({ city }: MapWithHeaderProps) {
  const { mapState, updateMapState, shareableUrl, isValidUrl, resetToDefault } =
    useUrlState({
      enableHistory: true,
      debounceMs: 300,
    })

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-gray-900 shadow-md z-10">
        <Link
          href="/"
          className={`flex items-center ${semanticColors.link.primary.color} ${semanticColors.link.primary.hover}`}
        >
          <ChevronLeft className="h-6 w-6" />
          Back to Home
        </Link>
        <h1 className="text-2xl font-bold text-center flex-grow capitalize">
          {city.replace('-', ' ')} Transit Simulator
        </h1>
        <ShareButton shareableUrl={shareableUrl} />
      </header>
      <main className="flex-grow relative">
        <ComparisonMap
          mapState={mapState}
          updateMapState={updateMapState}
          shareableUrl={shareableUrl}
          isValidUrl={isValidUrl}
          resetToDefault={resetToDefault}
        />
      </main>
    </>
  )
}
