"use client"

import { useEffect, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"

interface GoogleMapComponentProps {
  center: { lat: number; lng: number }
  zoom: number
}

/**
 * @file GoogleMapComponent.tsx
 * @description A React component that renders a Google Map with a marker at a specified location.
 * - Initializes and manages the Google Map instance
 * - Updates map center and zoom level based on props
 * 
 * @component
 * @param {Object} props
 *  >  @param {Object} props.center - The coordinates for the map center
 *       >  @param {number} props.center.lat - Latitude
 *       >  @param {number} props.center.lng - Longitude
 *  >  @param {number} props.zoom - The zoom level for the map
 * 
 * @requires NEXT_PUBLIC_GOOGLE_API_KEY environment variable a google key that allows for the use of the Google Maps API
 */

export default function GoogleMapComponent({ center, zoom }: GoogleMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY as string,
        version: "weekly",
      })

      const { Map } = await loader.importLibrary("maps")

      if (mapRef.current) {
        const newMap = new Map(mapRef.current, {
          center,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
        })

        const marker = new google.maps.Marker({
          position: center,
          map: newMap,
        })

        setMap(newMap)
      }
    }

    initMap()
  }, [center, zoom]) // Added center to dependencies

  useEffect(() => {
    if (map) {
      map.setCenter(center)
      map.setZoom(zoom)
    }
  }, [center, zoom, map])

  return <div ref={mapRef} className="w-full h-full" />
}

