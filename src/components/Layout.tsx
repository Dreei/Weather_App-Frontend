import type React from "react"

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <div className="min-h-screen bg-gray-100">
      <main>{children}</main>
    </div>
  )
}

