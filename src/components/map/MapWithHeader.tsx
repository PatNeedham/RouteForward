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
      <header className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-900 shadow-md z-10 gap-2">
        <Link
          href="/"
          className={`flex items-center ${semanticColors.link.primary.color} ${semanticColors.link.primary.hover} text-sm sm:text-base`}
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Link>
        <h1 className="text-lg sm:text-2xl font-bold text-center capitalize order-first sm:order-none flex-grow">
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
