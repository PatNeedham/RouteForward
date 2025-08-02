"use client";

import dynamic from "next/dynamic";

// Dynamically import the map component to ensure it's client-side only
const ComparisonMap = dynamic(() => import("@/components/map/ComparisonMap"), {
  ssr: false,
  loading: () => <p className="text-center">Loading maps...</p>,
});

export default function ClientMap() {
  return <ComparisonMap />;
}
