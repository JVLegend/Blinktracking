"use client";

import { useState } from "react"
import { SidebarInset } from "@/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Upload, LineChart } from "lucide-react"
import { toast } from "sonner"
import PlotlyComponent from "@/components/plotly/PlotlyComponent"

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
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
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar o arquivo");
    }
  };

  const getPlotData = () => {
    if (!data.length) return [];

    if (method === 'dlib') {
      return [
        {
          type: "scatter",
          mode: "lines+markers",
          name: "Olho Esquerdo",
          x: data.map(d => parseFloat(d["37_x"])),
          y: data.map(d => parseFloat(d["37_y"])),
        },
        {
          type: "scatter",
          mode: "lines+markers",
          name: "Olho Direito",
          x: data.map(d => parseFloat(d["41_x"])),
          y: data.map(d => parseFloat(d["41_y"])),
        }
      ];
    } else {
      // MediaPipe - Todos os pontos
      const plotData = [];
      
      // Olho direito - pontos superiores
      for (let i = 1; i <= 7; i++) {
        plotData.push({
          type: "scatter",
          mode: "lines+markers",
          name: `Direito Superior ${i}`,
          x: data.map(d => parseFloat(d[`right_upper_${i}_x`])),
          y: data.map(d => parseFloat(d[`right_upper_${i}_y`])),
        });
      }

      // Olho direito - pontos inferiores
      for (let i = 1; i <= 9; i++) {
        plotData.push({
          type: "scatter",
          mode: "lines+markers",
          name: `Direito Inferior ${i}`,
          x: data.map(d => parseFloat(d[`right_lower_${i}_x`])),
          y: data.map(d => parseFloat(d[`right_lower_${i}_y`])),
        });
      }

      // Olho esquerdo - pontos superiores
      for (let i = 1; i <= 7; i++) {
        plotData.push({
          type: "scatter",
          mode: "lines+markers",
          name: `Esquerdo Superior ${i}`,
          x: data.map(d => parseFloat(d[`left_upper_${i}_x`])),
          y: data.map(d => parseFloat(d[`left_upper_${i}_y`])),
        });
      }

      // Olho esquerdo - pontos inferiores
      for (let i = 1; i <= 9; i++) {
        plotData.push({
          type: "scatter",
          mode: "lines+markers",
          name: `Esquerdo Inferior ${i}`,
          x: data.map(d => parseFloat(d[`left_lower_${i}_x`])),
          y: data.map(d => parseFloat(d[`left_lower_${i}_y`])),
        });
      }

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
              </div>
            </CardContent>
          </Card>

          {data.length > 0 && (
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