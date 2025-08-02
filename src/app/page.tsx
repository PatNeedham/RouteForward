'use client'

import TrafficVisualization from '@/components/landing/TrafficVisualization'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full bg-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <TrafficVisualization width={1200} height={800} />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center p-4">
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
          RouteForward
        </h1>
        <p className="mt-4 text-lg md:text-xl text-neutral-300 max-w-2xl">
          Visualize, simulate, and compare public transit scenarios to build
          more equitable and efficient cities.
        </p>
        <Link
          href="/map/jersey-city"
          className="mt-8 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700"
        >
          Launch Simulation
          <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
        </Link>
      </div>
    </main>
  )
}
