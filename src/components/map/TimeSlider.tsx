'use client'

import { useState, useEffect, ChangeEvent } from 'react'

interface TimeSliderProps {
  value?: string
  onChange: (time: string) => void
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0')
  const mins = (minutes % 60).toString().padStart(2, '0')
  return `${hours}:${mins}`
}

const parseTime = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

const TimeSlider: React.FC<TimeSliderProps> = ({
  value = '08:00',
  onChange,
}) => {
  const [time, setTime] = useState(() => parseTime(value))

  // Update local state when value prop changes
  useEffect(() => {
    setTime(parseTime(value))
  }, [value])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value, 10)
    setTime(newTime)
    onChange(formatTime(newTime))
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-11/12 md:w-1/2 p-4 bg-gray-800/80 rounded-lg shadow-lg z-[1000] backdrop-blur-sm">
      <label
        htmlFor="time-slider"
        className="block text-center text-white mb-2"
      >
        Simulation Time: {formatTime(time)}
      </label>
      <input
        id="time-slider"
        type="range"
        min="0"
        max="1439" // 23 * 60 + 59
        step="15"
        value={time}
        onChange={handleChange}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )
}

export default TimeSlider
