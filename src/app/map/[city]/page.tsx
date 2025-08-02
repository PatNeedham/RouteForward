"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import UnsupportedCity from "@/components/map/UnsupportedCity";

// Define a list of supported cities
const SUPPORTED_CITIES = ["jersey-city"];

// Dynamically import the map component to ensure it's client-side only
const ComparisonMap = dynamic(() => import("@/components/map/ComparisonMap"), {
  ssr: false,
  loading: () => <p className="text-center">Loading maps...</p>,
});

export default function MapPage({ params }: { params: { city: string } }) {
  const { city } = params;
  const isSupported = SUPPORTED_CITIES.includes(city);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-800 text-white">
      <header className="flex items-center p-4 bg-gray-900 shadow-md z-10">
        <Link href="/" className="flex items-center text-sky-400 hover:text-sky-300">
          <ChevronLeft className="h-6 w-6" />
          Back to Home
        </Link>
        <h1 className="text-2xl font-bold text-center flex-grow capitalize">
          {city.replace("-", " ")} Transit Simulator
        </h1>
      </header>
      <main className="flex-grow relative">
        {isSupported ? (
          <ComparisonMap city={city} />
        ) : (
          <UnsupportedCity city={city} />
        )}
      </main>
    </div>
  );
}
