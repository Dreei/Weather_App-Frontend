import React, { useState, useEffect } from "react"
import axios from "axios"
import { format as dateFormat, subDays, differenceInDays, isAfter, isBefore, startOfToday, addDays, compareAsc } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Search, Loader2, List, PlusCircle, Edit, Trash2, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface LocationSuggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface WeatherRecord {
  _id?: string
  location: {
    name: string
    coordinates: {
      lat: number
      lon: number
    }
  }
  dateRange: {
    startDate: Date
    endDate: Date
  }
  temperatures: Array<{
    date: Date
    temperature: number
    description: string
    humidity?: number
    windSpeed?: number
  }>
  createdAt: Date
}

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Custom Range', days: 0 }
];

/**
 * @file WeatherRecordsCard.tsx
 * @description Manages the creation, viewing, editing, and deletion of historical weather records.
 * - Allows users to create new weather records for specific locations and date ranges
 * - Displays a list of saved weather records
 * - Provides functionality to edit and delete existing records
 * - Enables exporting of weather records as JSON or CSV
 * 
 * @requires NEXT_PUBLIC_BACKEND_URL environment variable on the backend URL
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL


export default function WeatherRecordsCard() {
  const [records, setRecords] = useState<WeatherRecord[]>([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<WeatherRecord | null>(null)
  const [locationQuery, setLocationQuery] = useState("")
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<"create" | "view">("create")
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [selectedRange, setSelectedRange] = useState(DATE_RANGE_OPTIONS[0])
  const [isCustomRange, setIsCustomRange] = useState(false)
  const today = startOfToday()

  const [formData, setFormData] = useState<Partial<WeatherRecord>>({
    location: { name: "", coordinates: { lat: 0, lon: 0 } },
    dateRange: {
      startDate: subDays(today, 7),
      endDate: today,
    },
  })


  const searchLocation = async (query: string) => {
    if (query.length < 3) return;
    
    setIsSearching(true)
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: query,
          format: "json",
          limit: 5,
        },
      })
      setLocationSuggestions(response.data)
    } catch (error) {
      console.error("Location search error", error)
      toast({
        title: "Error",
        description: "Failed to search location",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleRangeChange = (option: typeof DATE_RANGE_OPTIONS[0]) => {
    setSelectedRange(option)
    setIsCustomRange(option.days === 0)
    
    if (option.days > 0) {
      const endDate = today
      const startDate = subDays(endDate, option.days - 1)
      handleDateChange('both', startDate, endDate)
    }
  }

  const handleDateChange = async (type: 'start' | 'end' | 'both', startDate?: Date, endDate?: Date) => {
    const newStartDate = type === 'end' ? formData.dateRange?.startDate : startDate
    const newEndDate = type === 'start' ? formData.dateRange?.endDate : endDate

    if (!newStartDate || !newEndDate) return

    // Validate date range
    if (isAfter(newStartDate, today) || isAfter(newEndDate, today)) {
      toast({
        title: "Invalid Date",
        description: "Cannot select future dates",
        variant: "destructive",
      })
      return
    }

    if (differenceInDays(newEndDate, newStartDate) > 30) {
      toast({
        title: "Invalid Date Range",
        description: "Date range cannot exceed 30 days",
        variant: "destructive",
      })
      return
    }

    if (isBefore(newEndDate, newStartDate)) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    setFormData(prev => ({
      ...prev,
      dateRange: { startDate: newStartDate, endDate: newEndDate }
    }))

    // Fetch weather data if location is selected
    if (formData.location?.coordinates) {
      await fetchHistoricalWeather(
        formData.location.coordinates.lat,
        formData.location.coordinates.lon,
        newStartDate,
        newEndDate
      )
    }
  }

  const fetchHistoricalWeather = async (lat: number, lon: number, startDate: Date, endDate: Date) => {
    setIsLoadingWeather(true)
    try {
      // Calculate the cutoff date (4 days ago)
      const cutoffDate = subDays(startOfToday(), 4)
      
      // Split the date range into archive and recent periods
      const archiveEndDate = isBefore(endDate, cutoffDate) ? endDate : cutoffDate
      const needsRecentData = isAfter(endDate, cutoffDate)
      
      // Fetch historical data from archive API
      const archiveResponse = await axios.get(`https://archive-api.open-meteo.com/v1/archive`, {
        params: {
          latitude: lat,
          longitude: lon,
          start_date: dateFormat(startDate, 'yyyy-MM-dd'),
          end_date: dateFormat(archiveEndDate, 'yyyy-MM-dd'),
          daily: ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean', 'relative_humidity_2m_mean', 'wind_speed_10m_mean'],
          timezone: 'auto'
        },
      })
  
      const temperatures = []
      
      // Process archive data
      const { daily } = archiveResponse.data
      for (let i = 0; i < daily.time.length; i++) {
        temperatures.push({
          date: new Date(daily.time[i]),
          temperature: daily.temperature_2m_mean[i],
          description: `High: ${daily.temperature_2m_max[i]}°C, Low: ${daily.temperature_2m_min[i]}°C`,
          humidity: daily.relative_humidity_2m_mean[i],
          windSpeed: daily.wind_speed_10m_mean[i],
        })
      }
  
      // If we need recent data, fetch from the forecast API
      if (needsRecentData) {
        const forecastResponse = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
          params: {
            latitude: lat,
            longitude: lon,
            start_date: dateFormat(addDays(cutoffDate, 1), 'yyyy-MM-dd'),
            end_date: dateFormat(endDate, 'yyyy-MM-dd'),
            daily: ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean', 'relative_humidity_2m_mean', 'wind_speed_10m_mean'],
            timezone: 'auto'
          },
        })
  
        const recentDaily = forecastResponse.data.daily
        for (let i = 0; i < recentDaily.time.length; i++) {
          temperatures.push({
            date: new Date(recentDaily.time[i]),
            temperature: recentDaily.temperature_2m_mean[i],
            description: `High: ${recentDaily.temperature_2m_max[i]}°C, Low: ${recentDaily.temperature_2m_min[i]}°C`,
            humidity: recentDaily.relative_humidity_2m_mean[i],
            windSpeed: recentDaily.wind_speed_10m_mean[i],
          })
        }
      }
  
      // Sort temperatures by date to ensure proper ordering
      temperatures.sort((a, b) => compareAsc(new Date(a.date), new Date(b.date)))
  
      setFormData(prev => ({ ...prev, temperatures }))
    } catch (error) {
      console.error("Weather data fetch error", error)
      toast({
        title: "Error",
        description: "Failed to fetch weather data",
        variant: "destructive",
      })
    } finally {
      setIsLoadingWeather(false)
    }
  }

  const handleLocationSelect = async (suggestion: LocationSuggestion) => {
    const { startDate, endDate } = formData.dateRange || {
      startDate: subDays(today, 7),
      endDate: today,
    }

    setFormData(prev => ({
      ...prev,
      location: {
        name: suggestion.display_name,
        coordinates: {
          lat: Number.parseFloat(suggestion.lat),
          lon: Number.parseFloat(suggestion.lon),
        },
      },
    }))

    setLocationSuggestions([])
    setLocationQuery(suggestion.display_name)

    await fetchHistoricalWeather(
      Number.parseFloat(suggestion.lat),
      Number.parseFloat(suggestion.lon),
      startDate,
      endDate
    )
  }


  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/weather/`)
      setRecords(response.data)
    } catch (error) {
      console.error("Error fetching records", error)
      toast({
        title: "Error",
        description: "Failed to fetch weather records",
        variant: "destructive",
      })
    }
  }

  const saveRecord = async () => {
    if (!formData.location?.name || !formData.temperatures || formData.temperatures.length === 0) {
      toast({
        title: "Error",
        description: "Please select a valid location and ensure weather data is loaded",
        variant: "destructive",
      })
      return
    }

    try {
      if (selectedRecord?._id) {
        const response = await axios.put(`${BACKEND_URL}/api/weather/${selectedRecord._id}`, formData)
        setRecords(records.map((record) => (record._id === selectedRecord._id ? response.data : record)))
        toast({
          title: "Success",
          description: "Weather record updated successfully",
        })
      } else {
        const response = await axios.post(`${BACKEND_URL}/api/weather/`, formData)
        setRecords([...records, response.data])
        toast({
          title: "Success",
          description: "Weather record created successfully",
        })
      }

      resetForm()
    } catch (error) {
      console.error("Error saving record", error)
      toast({
        title: "Error",
        description: "Failed to save weather record",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      location: { name: "", coordinates: { lat: 0, lon: 0 } },
      dateRange: {
        startDate: new Date(),
        endDate: addDays(new Date(), 5),
      },
    })
    setSelectedRecord(null)
    setLocationQuery("")
  }

  const handleEditRecord = (record: WeatherRecord) => {
    setSelectedRecord(record)
    setFormData({
      ...record,
      dateRange: {
        startDate: new Date(record.dateRange.startDate),
        endDate: new Date(record.dateRange.endDate),
      },
    })
    setLocationQuery(record.location.name)
  }
  // Update location search to only trigger on Enter or button click
  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationQuery(e.target.value)
  }

  const handleLocationInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && locationQuery.length >= 3) {
      searchLocation(locationQuery)
    }
  }

  const escapeCSV = (field) => {
    // If the field contains commas, quotes, or newlines, wrap it in quotes
    if (field && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
      // Replace any quotes with double quotes (CSV standard)
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const convertToCSV = (record) => {
    // Add metadata at the top of the CSV
    const metadata = [
      `# Location: ${record.location.name}`,
      `# Latitude: ${record.location.coordinates.lat}`,
      `# Longitude: ${record.location.coordinates.lon}`,
      `# Date Range: ${dateFormat(new Date(record.dateRange.startDate), "yyyy-MM-dd")} to ${dateFormat(new Date(record.dateRange.endDate), "yyyy-MM-dd")}`,
      '' // Empty line to separate metadata from data
    ];

    // CSV Headers
    const headers = ['Date,Temperature (°C),Description,Humidity (%),Wind Speed (m/s)'];
    
    // Convert temperature records to CSV rows
    const rows = record.temperatures.map(temp => {
      // Ensure we're working with proper Date objects
      const date = new Date(temp.date);
      
      // Create array of fields and properly escape each one
      const fields = [
        dateFormat(date, "yyyy-MM-dd"),
        temp.temperature.toFixed(1),
        temp.description,
        temp.humidity?.toFixed(1) || '',
        temp.windSpeed?.toFixed(1) || ''
      ].map(escapeCSV);

      return fields.join(',');
    });

    // Combine metadata, headers and rows
    return [...metadata, ...headers, ...rows].join('\n');
  };

  const exportRecord = (record, exportFormat) => {
    try {
      let exportData;
      let fileName = `weather-record-${dateFormat(new Date(record.createdAt), "yyyy-MM-dd")}`;
      
      if (exportFormat === 'json') {
        // For JSON, include the full record data
        exportData = JSON.stringify({
          location: record.location,
          dateRange: {
            startDate: dateFormat(new Date(record.dateRange.startDate), "yyyy-MM-dd"),
            endDate: dateFormat(new Date(record.dateRange.endDate), "yyyy-MM-dd")
          },
          temperatures: record.temperatures.map(temp => ({
            ...temp,
            date: dateFormat(new Date(temp.date), "yyyy-MM-dd"),
            temperature: Number(temp.temperature.toFixed(1)),
            humidity: temp.humidity ? Number(temp.humidity.toFixed(1)) : null,
            windSpeed: temp.windSpeed ? Number(temp.windSpeed.toFixed(1)) : null
          })),
          createdAt: dateFormat(new Date(record.createdAt), "yyyy-MM-dd")
        }, null, 2);
        fileName += '.json';
        downloadFile(exportData, fileName, 'application/json');
      } else if (exportFormat === 'csv') {
        exportData = convertToCSV(record);
        fileName += '.csv';
        downloadFile(exportData, fileName, 'text/csv');
      }

      toast({
        title: "Success",
        description: `Record exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export record",
        variant: "destructive",
      });
    }
  };

  const downloadFile = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-3xl bg-white/95 backdrop-blur">
      <CardHeader>
        <CardTitle>Historical Weather Records</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "create" | "view")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="create">
              <PlusCircle className="mr-2 h-4 w-4" />
              {selectedRecord ? "Edit Record" : "Create Record"}
            </TabsTrigger>
            <TabsTrigger value="view">
              <List className="mr-2 h-4 w-4" />
              View Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="space-y-4">
              {/* Location Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <div className="relative">
                  <Input
                    value={locationQuery}
                    onChange={handleLocationInputChange}
                    onKeyDown={handleLocationInputKeyDown}
                    placeholder="Search for a location..."
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    disabled={isSearching || locationQuery.length < 3}
                    onClick={() => searchLocation(locationQuery)}
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {locationSuggestions.length > 0 && (
                  <Card className="absolute z-10 mt-1 w-full max-w-md">
                    <CardContent className="p-0">
                      {locationSuggestions.map((suggestion) => (
                        <Button
                          key={suggestion.place_id}
                          variant="ghost"
                          className="w-full justify-start text-left p-2 hover:bg-gray-100"
                          onClick={() => handleLocationSelect(suggestion)}
                        >
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{suggestion.display_name}</span>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Date Range Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <Button
                      key={option.days}
                      variant={selectedRange === option ? "default" : "outline"}
                      className="w-full"
                      onClick={() => handleRangeChange(option)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {isCustomRange && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Start Date</label>
                      <Input
                        type="date"
                        value={formData.dateRange?.startDate ? dateFormat(formData.dateRange.startDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => handleDateChange("start", new Date(e.target.value))}
                        max={dateFormat(today, "yyyy-MM-dd")}
                        disabled={isLoadingWeather}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End Date</label>
                      <Input
                        type="date"
                        value={formData.dateRange?.endDate ? dateFormat(formData.dateRange.endDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => handleDateChange("end", undefined, new Date(e.target.value))}
                        max={dateFormat(today, "yyyy-MM-dd")}
                        disabled={isLoadingWeather}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Temperature Display */}
              {formData.temperatures && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Historical Temperatures</h3>
                  <ScrollArea className="h-60 rounded-md border">
                    <div className="space-y-2 p-4">
                      {formData.temperatures.map((temp, index) => (
                        <div key={index} className="text-sm border-b last:border-0 pb-2">
                          <div className="flex justify-between">
                            <span>{dateFormat(new Date(temp.date), "PP")}</span>
                            <span className="font-medium">{Number(temp.temperature).toFixed(1)}°C</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{temp.description}</span>
                            <span>
                              {temp.humidity}% · {temp.windSpeed} m/s
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetForm}>
                  Clear
                </Button>
                <Button onClick={saveRecord} disabled={isLoadingWeather || !formData.location?.name}>
                  {selectedRecord ? "Update" : "Save"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="view">
            <div className="space-y-4">
              {records.map((record) => (
                <Card key={record._id} className="hover:bg-gray-50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{record.location.name}</h3>
                        <p className="text-sm text-gray-500">
                          {dateFormat(new Date(record.dateRange.startDate), "PP")} -{" "}
                          {dateFormat(new Date(record.dateRange.endDate), "PP")}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Created: {dateFormat(new Date(record.createdAt), "PPp")}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            handleEditRecord(record);
                            setActiveTab("create");
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => exportRecord(record, 'json')}>
                              Export as JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportRecord(record, 'csv')}>
                              Export as CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRecordToDelete(record._id || null);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Weather Record</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this weather record? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!recordToDelete) return

                  try {
                    await axios.delete(`${BACKEND_URL}/api/weather/${recordToDelete}`)
                    setRecords(records.filter((record) => record._id !== recordToDelete))
                    setIsDeleteModalOpen(false)
                    setRecordToDelete(null)
                    toast({
                      title: "Success",
                      description: "Weather record deleted successfully",
                    })
                  } catch (error) {
                    console.error("Error deleting record", error)
                    toast({
                      title: "Error",
                      description: "Failed to delete weather record",
                      variant: "destructive",
                    })
                  }
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}