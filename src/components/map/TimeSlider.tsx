'use client'

import { useState, useEffect, ChangeEvent } from 'react'

interface TimeSliderProps {
  value?: string
  onChange: (_time: string) => void
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
    <div className="w-full p-3 sm:p-4 bg-gray-800/90 rounded-lg shadow-lg backdrop-blur-sm">
      <label
        htmlFor="time-slider"
        className="block text-center text-white mb-2 text-sm sm:text-base"
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
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer touch-manipulation"
      />
    </div>
  )
}

export default TimeSlider
