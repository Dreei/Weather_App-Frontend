"use client"

import { useState } from "react"
import { Search, MapPin, Loader2 } from "lucide-react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface WeatherFormProps {
  onSubmit: (lat: number, lon: number, displayName: string) => void
  onError: (message: string) => void
}

interface LocationSuggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function WeatherForm({ onSubmit, onError }: WeatherFormProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)

  {/* Search for location based on user input, to make the place as valid as possible */}
  const searchLocation = async (searchQuery: string) => {
    setIsSearching(true)
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: searchQuery,
          format: "json",
          limit: 5,
        },
      })

      if (response.data && response.data.length > 0) {
        setSuggestions(response.data)
      } else {
        onError("No locations found. Please try a different search term.")
      }
    } catch (error) {
      console.error("Error searching location:", error)
      onError("An error occurred while searching for the location")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      searchLocation(query)
    }
  }

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    onSubmit(Number.parseFloat(suggestion.lat), Number.parseFloat(suggestion.lon), suggestion.display_name)
    setQuery("")
    setSuggestions([])
  }

  {/* Get the current location of the user */}
  const handleCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setIsSearching(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
              params: {
                lat: latitude,
                lon: longitude,
                format: "json",
              },

            })

            if (response.data && response.data.display_name) {
              onSubmit(latitude, longitude, response.data.display_name)
            } else {
              onError("Unable to find location based on coordinates")
            }
          } catch (error) {
            console.error("Geolocation error:", error)
            onError("Error fetching weather for your location")
          } finally {
            setIsSearching(false)
          }
        },
        (error) => {
          setIsSearching(false)
          onError(`Geolocation error: ${error.message}`)
        },
      )
    } else {
      onError("Geolocation is not supported by this browser.")
    }
  }

  return (
    <div className="fixed top-4 left-1-translate-x-1/2 z-50 w-full max-w-md px-4">
      <Card className="bg-white/95 backdrop-blur shadow-lg">
        <CardContent className="p-2">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a location..."
                className="pr-10 pl-4 py-2 w-full bg-transparent border-none text-gray-800 placeholder-gray-500"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                disabled={isSearching}
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={handleCurrentLocation} disabled={isSearching}>
              <MapPin className="h-4 w-4" />
            </Button>
          </form>

          {suggestions.length > 0 && (
            <Card className="mt-1 max-h-60 overflow-y-auto">
              <CardContent className="p-0">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.place_id}
                    variant="ghost"
                    className="w-full justify-start text-left p-2 hover:bg-gray-100"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{suggestion.display_name}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

