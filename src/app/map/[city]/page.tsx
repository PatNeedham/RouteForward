import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import UnsupportedCity from '@/components/map/UnsupportedCity'
import ClientMap from '@/components/map/ClientMap'

// Define a list of supported cities
const SUPPORTED_CITIES = ['jersey-city']

export default async function MapPage({
  params: paramsPromise,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = await paramsPromise
  const isSupported = SUPPORTED_CITIES.includes(city)

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-800 text-white">
      <header className="flex items-center p-4 bg-gray-900 shadow-md z-10">
        <Link
          href="/"
          className="flex items-center text-sky-400 hover:text-sky-300"
        >
          <ChevronLeft className="h-6 w-6" />
          Back to Home
        </Link>
        <h1 className="text-2xl font-bold text-center flex-grow capitalize">
          {city.replace('-', ' ')} Transit Simulator
        </h1>
      </header>
      <main className="flex-grow relative">
        {isSupported ? <ClientMap /> : <UnsupportedCity city={city} />}
      </main>
    </div>
  )
}
