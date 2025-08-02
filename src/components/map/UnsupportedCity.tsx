'use client'

import { FormEvent } from 'react'

interface UnsupportedCityProps {
  city: string
}

const UnsupportedCity: React.FC<UnsupportedCityProps> = ({ city }) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = e.currentTarget.email.value
    alert(
      `Thank you for your interest in ${city}! We'll notify you at ${email} when it's supported.`,
    )
    // In the future, this would trigger a server action or API call.
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h2 className="text-3xl font-bold mb-4">
        Sorry,{' '}
        <span className="capitalize text-sky-400">
          {city.replace('-', ' ')}
        </span>{' '}
        is not yet supported.
      </h2>
      <p className="text-lg mb-8 max-w-md">
        We&apos;re working hard to expand our coverage. Enter your email below,
        and we&apos;ll notify you when this city becomes available in the
        simulator.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="your.email@example.com"
          className="px-4 py-2 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          className="px-6 py-2 rounded-md bg-sky-600 hover:bg-sky-700 font-medium"
        >
          Notify Me
        </button>
      </form>
    </div>
  )
}

export default UnsupportedCity
