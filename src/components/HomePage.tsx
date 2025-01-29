"use client"

import { useState } from "react"
import { AlertCircle, InfoIcon } from "lucide-react"
import Layout from "@/components/Layout"
import GoogleMapComponent from "@/components/GoogleMapComponent"
import WeatherForm from "@/components/WeatherForm"
import WeatherCard from "@/components/WeatherCard"
import WeatherRecordsCard from "@/components/WeatherRecordsCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {Button} from "@/components/ui/button"
import axios from "axios"


/**
 * @file HomePage.tsx
 * @description The main page component that integrates weather information, maps, and user interface elements.
 *  - Manages state for weather data, forecast, air pollution, and map center
 *  - Handles weather data fetching and error states
 *  - Renders the main layout including GoogleMapComponent, WeatherForm, WeatherCard, and WeatherRecordsCard
 * @requires NEXT_PUBLIC_OPENWEATHERMAP_API_KEY environment variable to access OpenWeatherMap API
 */


const OPENWEATHERMAP_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY


export default function Home() {
  const [weatherData, setWeatherData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [airPollutionData, setAirPollutionData] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  {/* Fetch weather data from OpenWeatherMap API - This will be passed to multiple components as the data sounce */}
  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      const [currentWeatherResponse, forecastResponse, airPollutionResponse] = await Promise.all([
        axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
          params: {
            lat,
            lon,
            appid: OPENWEATHERMAP_API_KEY,
            units: "metric",
          },
        }),
        axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
          params: {
            lat,
            lon,
            appid: OPENWEATHERMAP_API_KEY,
            units: "metric",
          },
        }),
        axios.get(`https://api.openweathermap.org/data/2.5/air_pollution`, {
          params: {
            lat,
            lon,
            appid: OPENWEATHERMAP_API_KEY,
          },
        }),
      ])
  
      const currentWeather = currentWeatherResponse.data
      const forecastData = forecastResponse.data
      const airPollutionData = airPollutionResponse.data
  
      return {
        currentWeather: {
          name: currentWeather.name,
          coord: currentWeather.coord,
          main: currentWeather.main,
          weather: currentWeather.weather,
          wind: currentWeather.wind,
          visibility: currentWeather.visibility,
          clouds: currentWeather.clouds,
        },
        forecastData: {
          city: { name: forecastData.city.name },
          list: forecastData.list.filter((_: any, index: number) => index % 8 === 0),
        },
        airPollution: airPollutionData.list[0],
      }
    } catch (error) {
      console.error("Data fetch error:", error)
      throw error
    }
  }

  const handleWeatherSubmit = async (lat: number, lon: number, displayName: string) => {
    setError(null)
    setIsLoading(true)

    try {
      const { currentWeather, forecastData, airPollution } = await fetchWeatherData(lat, lon)
      setWeatherData({ ...currentWeather, name: displayName })
      setForecastData(forecastData)
      setAirPollutionData(airPollution)
  
      setMapCenter({ lat, lng: lon })
    } catch (error) {
      console.error("Weather fetch error:", error)
      setError("Failed to fetch weather data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleError = (message: string) => {
    setError(message)
  }

  return (
    <Layout>
      <div className="flex h-screen">
        <div className="flex-grow relative">

          {/* GoogleMapComponent: Main Map Component */}
          <GoogleMapComponent center={mapCenter} zoom={10} />

          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Weather App</h1>
            <h2 className="text-l font-bold">By Andrei Villanueva</h2>
            <Button variant="outline" size="icon" onClick={() => setShowInfo(true)}>
              <InfoIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* 
          WeatherForm: Let users enter a location (any of the following:  Zip Code/Postal Code, GPS Coordinates, Landmarks, Town, City, etc..)  and get the current weather.
          */}
          <WeatherForm onSubmit={handleWeatherSubmit} onError={handleError} />

          {weatherData && (
            <div className="fixed left-4 top-20 z-30 space-y-4">
              <WeatherCard
                weatherData={weatherData}
                forecastData={forecastData}
                airPollution={airPollutionData}

                isLoading={isLoading}
              />
            </div>
          )}
          
          {/* WeatherRecordsCard: User can create, look, delete and export record data for weather in certain locations */}
          <div className="fixed right-4 top-20 z-30 space-y-4">
            <WeatherRecordsCard />
          </div>

          {error && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
                <AlertCircle className="mr-2" />
                <span>{error}</span>
              </div>
            </div>
          )}

        {showInfo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md">
                <h2 className="text-xl font-bold mb-4">About PM Accelerator</h2>
                <p>
                The Product Manager Accelerator Program is designed to support PM professionals through every stage of their careers. From students looking for entry-level jobs to Directors looking to take on a leadership role, our program has helped over hundreds of students fulfill their career aspirations.
                <br />
                The Product Manager Accelerator community are ambitious and committed. Through our program they have learnt, honed and developed new PM and leadership skills, giving them a strong foundation for their future endeavors.
                <br />
                Here are the examples of services they offer. Check out our website https://www.pmaccelerator.io/ to learn more about their services.
                </p>
                <Button className="mt-4" onClick={() => setShowInfo(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}