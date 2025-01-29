import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {VideoCarousel} from "@/components/ui/video-carousel" 
import { Cloud, FileText, Wind } from "lucide-react"



interface WeatherCardProps {
  weatherData: any
  forecastData: any
  airPollution: any
  isLoading: boolean
}

interface WeatherTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}


/**
 * @file WeatherCard.tsx
 * @description A component that displays detailed weather information in a card format with multiple tabs.
 * - Shows current temperature, weather description, and relevant videos
 * - Provides a 5-day forecast
 * - Displays detailed air quality information
 * - Includes a tab interface to switch between different types of weather data
 * 
 * @component
 * @param {Object} props
 *  >  @param {Object} props.weatherData - Current weather data
 *  >  @param {Object} props.forecastData - Weather forecast data
 *  >  @param {Object} props.airPollution - Air pollution data
 *  >  @param {boolean} props.isLoading - Loading state indicator
 * 
* @requires NEXT_PUBLIC_GOOGLE_API_KEY environment variable a google key that allows for the use of the Youtube API
*/
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY


export default function WeatherCard({ weatherData, forecastData, airPollution, isLoading }: WeatherCardProps) {
  const [activeTab, setActiveTab] = useState("current")
  const [videos, setVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(false)


  {/* Youtube Videos Fetcher based on location name */}
  useEffect(() => {
    const fetchVideos = async () => {
      if (!weatherData?.name) return
      console.log(weatherData.name)
      setVideosLoading(true)
      try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(weatherData.name)}%20tourism&type=video&maxResults=3&key=${apiKey}`)
        if (!response.ok) throw new Error("Failed to fetch videos")
        const data = await response.json()
        setVideos(data.items)
        console.log(data.items)
      } catch (error) {
        console.error("Error fetching videos:", error)
      } finally {
        setVideosLoading(false)
      }
    }

    fetchVideos()
  }, [weatherData?.name])

  if (isLoading) {
    return <Skeleton className="w-full h-[400px] rounded-lg" />
  }

  {/* Renders the durrent weather data when the tab is selected */}

  const renderCurrentWeather = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-4xl font-bold">{Math.round(weatherData.main.temp)}°C</div>
          <div className="text-sm text-muted-foreground capitalize">{weatherData.weather[0].description}</div>
        </div>
        <img
          src={`http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`}
          alt={weatherData.weather[0].description}
          className="w-16 h-16"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <WeatherDetail label="Feels Like" value={`${Math.round(weatherData.main.feels_like)}°C`} />
        <WeatherDetail label="Humidity" value={`${weatherData.main.humidity}%`} />
        <WeatherDetail label="Wind Speed" value={`${weatherData.wind.speed} m/s`} />
        <WeatherDetail label="Wind Direction" value={`${weatherData.wind.deg}°`} />
        <WeatherDetail label="Pressure" value={`${weatherData.main.pressure} hPa`} />
        {weatherData.visibility && <WeatherDetail label="Visibility" value={`${weatherData.visibility / 1000} km`} />}
      </div>
    </div>
  )

  {/* Renders the forcast data for the next 5 days when the tab is selected */}


  const renderForecast = () => (
    <div className="space-y-4">
      {forecastData.list.slice(0, 5).map((day, index) => (
        <div key={index} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <img
              src={`http://openweathermap.org/img/wn/${day.weather[0].icon}.png`}
              alt={day.weather[0].description}
              className="w-10 h-10"
            />
            <div>
              <div className="font-medium">
                {new Date(day.dt * 1000).toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className="text-sm text-muted-foreground capitalize">{day.weather[0].description}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">{Math.round(day.main.temp)}°C</div>
            <div className="text-sm text-muted-foreground">
              {Math.round(day.main.temp_min)}° / {Math.round(day.main.temp_max)}°
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  {/* Renders the air quality data when the tab is selected */}


  const renderAirQuality = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-3xl font-bold mb-2">{getAirQualityDescription(airPollution.main.aqi)}</div>
        <div className="text-sm text-muted-foreground">Air Quality Index: {airPollution.main.aqi}</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <WeatherDetail label="CO" value={`${airPollution.components.co.toFixed(2)} μg/m³`} />
        <WeatherDetail label="NO" value={`${airPollution.components.no.toFixed(2)} μg/m³`} />
        <WeatherDetail label="NO2" value={`${airPollution.components.no2.toFixed(2)} μg/m³`} />
        <WeatherDetail label="O3" value={`${airPollution.components.o3.toFixed(2)} μg/m³`} />
        <WeatherDetail label="SO2" value={`${airPollution.components.so2.toFixed(2)} μg/m³`} />
        <WeatherDetail label="PM2.5" value={`${airPollution.components.pm2_5.toFixed(2)} μg/m³`} />
        <WeatherDetail label="PM10" value={`${airPollution.components.pm10.toFixed(2)} μg/m³`} />
        <WeatherDetail label="NH3" value={`${airPollution.components.nh3.toFixed(2)} μg/m³`} />
      </div>
    </div>
  )

  {/* Switches Render Content */}

  const renderContent = () => {
    switch (activeTab) {
      case "current":
        return renderCurrentWeather()
      case "forecast":
        return renderForecast()
      case "air":
        return renderAirQuality()
      default:
        return renderCurrentWeather()
    }
  }

  return (
    <Card className="bg-white/95 backdrop-blur w-80">
      {videosLoading ? <Skeleton className="h-40" /> : <VideoCarousel videos={videos} />}
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">{weatherData.name}</h2>
        {weatherData.sys && weatherData.sys.country && (
          <p className="text-sm text-muted-foreground">{weatherData.sys.country}</p>
        )}
      </div>

      <WeatherTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <CardContent className="p-4">{renderContent()}</CardContent>
    </Card>
  )
}

function WeatherDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function WeatherTabs({ activeTab, onTabChange }: WeatherTabsProps) {
  const tabs = [
    { id: "current", label: "Current", icon: Cloud },
    { id: "forecast", label: "Forecast", icon: FileText },
    { id: "air", label: "Air Quality", icon: Wind },
  ]

  return (
    <div className="flex gap-1 px-2 border-b">
      {tabs.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant="ghost"
          size="sm"
          className={`h-9 px-2.5 ${activeTab === id ? "border-b-2 border-primary rounded-none" : ""}`}
          onClick={() => onTabChange(id)}
        >
          <Icon className="h-4 w-4 mr-1" />
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  )
}

const getAirQualityDescription = (aqi: number) => {
  switch (aqi) {
    case 1:
      return "Good"
    case 2:
      return "Fair"
    case 3:
      return "Moderate"
    case 4:
      return "Poor"
    case 5:
      return "Very Poor"
    default:
      return "Unknown"
  }
}