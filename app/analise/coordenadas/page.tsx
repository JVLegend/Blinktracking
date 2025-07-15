"use client";

import { useState } from "react"
import { SidebarInset } from "@/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Upload, LineChart } from "lucide-react"
import { toast } from "sonner"
import PlotlyComponent from "@/components/plotly/PlotlyComponent"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
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
      // Seleciona todos os pontos por padrão
      if (parsedData[0]?.method === 'dlib') {
        setSelectedPoints([37, 38, 40, 41]);
      } else {
        setSelectedPoints([1,2,3,4,5,6,7,8,9]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar o arquivo");
      setLoading(false);
    }
  };

  // Função de downsampling
  function downsample(arr: any[], maxPoints: number) {
    if (arr.length <= maxPoints) return arr;
    const step = Math.ceil(arr.length / maxPoints);
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
        x: downsample(data.map(d => parseFloat(d[`${pt}_x`])), 1000),
        y: downsample(data.map(d => parseFloat(d[`${pt}_y`])), 1000),
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
            x: downsample(data.map(d => parseFloat(d[`right_upper_${i}_x`])), 1000),
            y: downsample(data.map(d => parseFloat(d[`right_upper_${i}_y`])), 1000),
          });
          plotData.push({
            type: "scatter",
            mode: "lines+markers",
            name: `Esquerdo Superior ${i}`,
            x: downsample(data.map(d => parseFloat(d[`left_upper_${i}_x`])), 1000),
            y: downsample(data.map(d => parseFloat(d[`left_upper_${i}_y`])), 1000),
          });
        }
        // Olho direito/esquerdo - inferiores
        if (i <= 9) {
          plotData.push({
            type: "scatter",
            mode: "lines+markers",
            name: `Direito Inferior ${i}`,
            x: downsample(data.map(d => parseFloat(d[`right_lower_${i}_x`])), 1000),
            y: downsample(data.map(d => parseFloat(d[`right_lower_${i}_y`])), 1000),
          });
          plotData.push({
            type: "scatter",
            mode: "lines+markers",
            name: `Esquerdo Inferior ${i}`,
            x: downsample(data.map(d => parseFloat(d[`left_lower_${i}_x`])), 1000),
            y: downsample(data.map(d => parseFloat(d[`left_lower_${i}_y`])), 1000),
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-6 w-6 text-primary" />
                <CardTitle>Upload do CSV</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="csv">Arquivo CSV</Label>
                  <Input 
                    id="csv" 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                </div>
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
              </div>
            </CardContent>
          </Card>

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