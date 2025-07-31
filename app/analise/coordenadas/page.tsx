"use client";

import { useState } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, LineChart, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import PlotlyComponent from "@/components/plotly/PlotlyComponent"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { CSVSelector } from "../../components/CSVSelector"

interface DataPoint {
  // Campos comuns
  method: string;
  velocity?: number;
  
  // Campos do dlib
  "37_x"?: number;
  "37_y"?: number;
  "38_x"?: number;
  "38_y"?: number;
  "40_x"?: number;
  "40_y"?: number;
  "41_x"?: number;
  "41_y"?: number;

  // Campos do MediaPipe
  [key: `right_upper_${number}_x`]: number;
  [key: `right_upper_${number}_y`]: number;
  [key: `right_lower_${number}_x`]: number;
  [key: `right_lower_${number}_y`]: number;
  [key: `left_upper_${number}_x`]: number;
  [key: `left_upper_${number}_y`]: number;
  [key: `left_lower_${number}_x`]: number;
  [key: `left_lower_${number}_y`]: number;
}

export default function CoordenadasPage() {
  const [data, setData] = useState<any[]>([]);
  const [method, setMethod] = useState<string>('');
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [maxPoints, setMaxPoints] = useState(1000);
  const [selectedCSVUrl, setSelectedCSVUrl] = useState<string | null>(null);
  const [selectedCSVFilename, setSelectedCSVFilename] = useState<string | null>(null);

  const handleCSVLoad = async () => {
    if (!selectedCSVUrl) {
      toast.error("Por favor, selecione uma planilha primeiro");
      return;
    }

    try {
      setLoading(true);
      
      // Buscar o arquivo do blob storage
      const response = await fetch(selectedCSVUrl);
      if (!response.ok) {
        throw new Error('Erro ao carregar arquivo');
      }
      
      const text = await response.text();
      const rows = text.split("\n").filter(row => row.trim());
      const headers = rows[0].split(",");
      const parsedData = rows.slice(1).map(row => {
        const values = row.split(",");
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i];
        });
        return obj;
      });

      setData(parsedData);
      setMethod(parsedData[0]?.method || '');
      // Começa com todos os pontos desmarcados
      setSelectedPoints([]);
      toast.success("Planilha carregada com sucesso!");
      setLoading(false);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar o arquivo");
      setLoading(false);
    }
  };

  // Função de downsampling
  function downsample(arr: any[], max: number) {
    if (arr.length <= max) return arr;
    const step = Math.ceil(arr.length / max);
    return arr.filter((_, i) => i % step === 0);
  }

  const getPlotData = () => {
    if (!data.length) return [];

    if (method === 'dlib') {
      // Permitir seleção de pontos dlib
      const points = selectedPoints.length ? selectedPoints : [37, 38, 40, 41];
      return points.map((pt) => ({
        type: "scatter",
        mode: "lines+markers",
        name: `Ponto ${pt}`,
        x: downsample(data.map(d => parseFloat(d[`${pt}_x`])), maxPoints),
        y: downsample(data.map(d => parseFloat(d[`${pt}_y`])), maxPoints),
      }));
    } else {
      // MediaPipe - Todos os pontos
      // Permitir seleção de pontos MediaPipe
      const plotData: any[] = [];
      selectedPoints.forEach((i) => {
        // Olho direito - superiores
        if (i <= 7) {
          plotData.push({
            type: "scatter",
            mode: "lines+markers",
            name: `Direito Superior ${i}`,
            x: downsample(data.map(d => parseFloat(d[`right_upper_${i}_x`])), maxPoints),
            y: downsample(data.map(d => parseFloat(d[`right_upper_${i}_y`])), maxPoints),
          });
          plotData.push({
            type: "scatter",
            mode: "lines+markers",
            name: `Esquerdo Superior ${i}`,
            x: downsample(data.map(d => parseFloat(d[`left_upper_${i}_x`])), maxPoints),
            y: downsample(data.map(d => parseFloat(d[`left_upper_${i}_y`])), maxPoints),
          });
        }
        // Olho direito/esquerdo - inferiores
        if (i <= 9) {
          plotData.push({
            type: "scatter",
            mode: "lines+markers",
            name: `Direito Inferior ${i}`,
            x: downsample(data.map(d => parseFloat(d[`right_lower_${i}_x`])), maxPoints),
            y: downsample(data.map(d => parseFloat(d[`right_lower_${i}_y`])), maxPoints),
          });
          plotData.push({
            type: "scatter",
            mode: "lines+markers",
            name: `Esquerdo Inferior ${i}`,
            x: downsample(data.map(d => parseFloat(d[`left_lower_${i}_x`])), maxPoints),
            y: downsample(data.map(d => parseFloat(d[`left_lower_${i}_y`])), maxPoints),
          });
        }
      });
      return plotData;
    }
  };

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Análise de Coordenadas</h1>
          <p className="text-muted-foreground">
            Visualize as coordenadas dos pontos faciais ao longo do tempo
          </p>
        </div>

        <div className="grid gap-6">
          <CSVSelector 
            selectedCSV={selectedCSVUrl}
            onCSVSelect={(url, filename) => {
              setSelectedCSVUrl(url)
              setSelectedCSVFilename(filename)
            }}
          />

          {selectedCSVUrl && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                  <CardTitle>Processar Planilha Selecionada</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">Planilha Selecionada:</p>
                  <p className="text-sm text-muted-foreground">{selectedCSVFilename}</p>
                </div>
                
                <Button 
                  onClick={handleCSVLoad}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    "Carregar e Analisar Planilha"
                  )}
                </Button>
                
                {/* Seleção de pontos */}
                {method === 'dlib' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[37, 38, 40, 41].map(pt => (
                      <Button
                        key={pt}
                        variant={selectedPoints.includes(pt) ? "secondary" : "outline"}
                        onClick={() => setSelectedPoints(prev => prev.includes(pt) ? prev.filter(p => p !== pt) : [...prev, pt])}
                      >
                        Ponto {pt}
                      </Button>
                    ))}
                  </div>
                )}
                {method !== 'dlib' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[1,2,3,4,5,6,7,8,9].map(pt => (
                      <Button
                        key={pt}
                        variant={selectedPoints.includes(pt) ? "secondary" : "outline"}
                        onClick={() => setSelectedPoints(prev => prev.includes(pt) ? prev.filter(p => p !== pt) : [...prev, pt])}
                      >
                        Ponto {pt}
                      </Button>
                    ))}
                  </div>
                )}
                {/* Controle de quantidade de pontos */}
                <div className="flex items-center gap-2 mt-4">
                  <Label htmlFor="maxPoints">Máx. pontos por série:</Label>
                  <span className="font-mono px-2">{maxPoints}</span>
                  <Button size="sm" variant="outline" onClick={() => setMaxPoints(1000)} disabled={maxPoints === 1000}>Padrão (1000)</Button>
                  <Button size="sm" variant="outline" onClick={() => setMaxPoints(5000)} disabled={maxPoints === 5000}>5.000</Button>
                  <Button size="sm" variant="outline" onClick={() => setMaxPoints(10000)} disabled={maxPoints === 10000}>10.000</Button>
                  <Button size="sm" variant="outline" onClick={() => setMaxPoints(50000)} disabled={maxPoints === 50000}>50.000</Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Loading Spinner */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin h-12 w-12 text-primary" />
              <span className="ml-4">Carregando dados...</span>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LineChart className="h-6 w-6 text-primary" />
                  <CardTitle>Gráfico de Coordenadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <PlotlyComponent
                  data={getPlotData()}
                  layout={{
                    title: "Coordenadas dos Pontos Faciais",
                    xaxis: { 
                      title: "Coordenada X",
                      gridcolor: "#eee",
                      zerolinecolor: "#999" 
                    },
                    yaxis: { 
                      title: "Coordenada Y",
                      gridcolor: "#eee",
                      zerolinecolor: "#999"
                    },
                    height: 600,
                    showlegend: true,
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    legend: {
                      x: 1,
                      xanchor: 'right',
                      y: 1
                    }
                  }}
                  config={{ 
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SidebarInset>
  );
} 