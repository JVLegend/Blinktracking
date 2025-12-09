"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "../components/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [videoList, setVideoList] = useState<string[]>([])

  const fetchVideos = async () => {
    const res = await fetch("/api/upload-video/list")
    const data = await res.json()
    setVideoList(data.videos || [])
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setMessage("")
    const formData = new FormData()
    formData.append("video", selectedFile)
    try {
      const res = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        setMessage("Upload realizado com sucesso!")
        setSelectedFile(null)
        await fetchVideos()
      } else {
        setMessage("Erro ao fazer upload.")
      }
    } catch (err) {
      setMessage("Erro ao fazer upload.")
    }
    setUploading(false)
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center bg-muted">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Upload de Vídeo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video">Selecione um vídeo</Label>
                <input id="video" type="file" accept="video/*" onChange={handleFileChange} className="block w-full" />
              </div>
              <Button type="submit" disabled={uploading || !selectedFile}>
                {uploading ? "Enviando..." : "Fazer Upload"}
              </Button>
            </form>
            {message && <p className="text-center text-sm text-muted-foreground">{message}</p>}
            <hr />
            <div>
              <h2 className="text-lg font-semibold mb-2">Vídeos enviados</h2>
              {videoList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum vídeo enviado ainda.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm text-gray-600">
                  {videoList.map((video) => (
                    <li key={video}>{video}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 