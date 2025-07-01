"use client"

import { useState } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Clock, Upload, Eye, Download, BarChart3 } from "lucide-react"
import { toast } from "sonner"

export default function AnalysePiscadasPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analysisData, setAnalysisData] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [statistics, setStatistics] = useState({
    totalBlinks: 0,
    averageDuration: 0,
    blinkRate: 0,
    longestBlink: 0,
    shortestBlink: 0
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setUploadedFile(file)
      toast.success("Arquivo CSV carregado com sucesso!")
    } else {
      toast.error("Por favor, selecione um arquivo CSV válido")
    }
  }

  const analyzeBlinkData = async () => {
    if (!uploadedFile) {
      toast.error("Por favor, carregue um arquivo CSV primeiro")
      return
    }

    setIsAnalyzing(true)
    
    try {
      // Simular análise de dados (aqui você implementaria a lógica real)
      const formData = new FormData()
      formData.append('file', uploadedFile)
      
      // Dados simulados para demonstração
      const mockData = [
        { frame: 150, timestamp: '00:00:05.0', duration: 0.15, type: 'normal' },
        { frame: 420, timestamp: '00:00:14.0', duration: 0.12, type: 'normal' },
        { frame: 750, timestamp: '00:00:25.0', duration: 0.18, type: 'slow' },
        { frame: 1080, timestamp: '00:00:36.0', duration: 0.10, type: 'fast' },
        { frame: 1350, timestamp: '00:00:45.0', duration: 0.16, type: 'normal' },
      ]
      
      const mockStats = {
        totalBlinks: mockData.length,
        averageDuration: 0.142,
        blinkRate: 12.5, // piscadas por minuto
        longestBlink: 0.18,
        shortestBlink: 0.10
      }
      
      setAnalysisData(mockData)
      setStatistics(mockStats)
      toast.success("Análise de piscadas concluída!")
      
    } catch (error) {
      toast.error("Erro ao analisar dados de piscadas")
      console.error(error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const exportResults = () => {
    if (!analysisData.length) {
      toast.error("Nenhum dado para exportar")
      return
    }

    const csvContent = "data:text/csv;charset=utf-8," +
      "Frame,Timestamp,Duration (s),Type\n" +
      analysisData.map(row => 
        `${row.frame},${row.timestamp},${row.duration},${row.type}`
      ).join("\n")

    const link = document.createElement("a")
    link.setAttribute("href", csvContent)
    link.setAttribute("download", `analise_piscadas_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Resultados exportados!")
  }

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Análise de Piscadas
          </h1>
          <p className="text-muted-foreground">
            Analise detalhadamente os frames e timestamps de cada piscada detectada no vídeo.
          </p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Carregar Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-file">Arquivo CSV com coordenadas</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-1"
              />
            </div>
            
            {uploadedFile && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Arquivo:</strong> {uploadedFile.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tamanho: {(uploadedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <Button 
              onClick={analyzeBlinkData}
              disabled={!uploadedFile || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>Analisando Piscadas...</>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Analisar Piscadas
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {analysisData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{statistics.totalBlinks}</div>
                <p className="text-sm text-muted-foreground">Total de Piscadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{statistics.averageDuration}s</div>
                <p className="text-sm text-muted-foreground">Duração Média</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{statistics.blinkRate}</div>
                <p className="text-sm text-muted-foreground">Piscadas/min</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{statistics.longestBlink}s</div>
                <p className="text-sm text-muted-foreground">Mais Longa</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{statistics.shortestBlink}s</div>
                <p className="text-sm text-muted-foreground">Mais Curta</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Table */}
        {analysisData.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resultados da Análise
              </CardTitle>
              <Button onClick={exportResults} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Frame</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Duração (s)</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisData.map((blink, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{blink.frame}</TableCell>
                      <TableCell className="font-mono">{blink.timestamp}</TableCell>
                      <TableCell className="font-mono">{blink.duration}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          blink.type === 'normal' ? 'bg-green-100 text-green-800' :
                          blink.type === 'slow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {blink.type}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Como usar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Carregue um arquivo CSV com coordenadas dos pontos faciais</li>
              <li>Clique em "Analisar Piscadas" para processar os dados</li>
              <li>Visualize as estatísticas e resultados detalhados</li>
              <li>Exporte os resultados em formato CSV se necessário</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
} 