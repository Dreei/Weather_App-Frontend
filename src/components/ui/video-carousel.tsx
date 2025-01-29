"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Video {
  id: { videoId: string }
  snippet: {
    title: string
    thumbnails: {
      medium: {
        url: string
      }
    }
  }
}

interface VideoCarouselProps {
  videos: Video[]
}

export function VideoCarousel({ videos }: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)

  const nextVideo = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length)
  }

  const previousVideo = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + videos.length) % videos.length)
  }

  if (!videos.length) {
    return (
      <div className="h-40 flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">No videos available</p>
      </div>
    )
  }

  return (
    <div className="relative h-40 group">
      <div className="absolute inset-0">
        <a
          href={`https://www.youtube.com/watch?v=${videos[currentIndex].id.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full"
        >
          <img
            src={videos[currentIndex].snippet.thumbnails.medium.url || "/placeholder.svg"}
            alt={videos[currentIndex].snippet.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
            <p className="text-white text-sm line-clamp-1">{videos[currentIndex].snippet.title}</p>
          </div>
        </a>
      </div>

      {videos.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={previousVideo}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={nextVideo}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {videos.length > 1 && (
        <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1">
          {videos.map((_, index) => (
            <button
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

