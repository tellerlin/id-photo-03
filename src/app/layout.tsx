import type { Metadata } from "next"
import "./globals.css"
import "cropperjs/dist/cropper.css"
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: "IDPhotoGraphic - Professional ID Photo Maker",
  description: "Create professional ID photos with automatic background removal and precise cropping",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  )
}
