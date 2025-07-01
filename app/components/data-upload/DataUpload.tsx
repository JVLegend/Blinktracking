"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { PlotParams } from "react-plotly.js";
import PlotlyComponent from "@/components/plotly/PlotlyComponent";

const Plot = dynamic(() => import("react-plotly.js").then((mod) => mod.default), {
  ssr: false,
  loading: () => <p>Carregando gráfico...</p>
}) as React.ComponentType<PlotParams>;

interface DataPoint {
  frame: number;
  [key: string]: number;
}

export function DataUpload() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const availablePoints = ["37", "38", "40", "41"];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = text.split("\n").filter(row => row.trim());
    const headers = rows[0].split(",");
    
    const parsedData: DataPoint[] = rows.slice(1).map((row, index) => {
      const values = row.split(",");
      const point: DataPoint = { frame: index + 1 };
      headers.forEach((header, i) => {
        point[header] = Number(values[i]);
      });
      return point;
    });

    setData(parsedData);
    setSelectedPoints(["37"]);
  };

  const getTraces = (type: string) => {
    const traces = [];
    
    for (const point of selectedPoints) {
      if (type === "time") {
        traces.push(
          {
            x: data.map(d => d.frame),
            y: data.map(d => d[`${point}_x`]),
            name: `Ponto ${point} (X)`,
            type: "scatter",
            mode: "lines+markers",
            line: { shape: "spline" },
            marker: { size: 4 }
          },
          {
            x: data.map(d => d.frame),
            y: data.map(d => d[`${point}_y`]),
            name: `Ponto ${point} (Y)`,
            type: "scatter",
            mode: "lines+markers",
            line: { shape: "spline" },
            marker: { size: 4 }
          }
        );
      } else if (type === "scatter") {
        traces.push({
          x: data.map(d => d[`${point}_x`]),
          y: data.map(d => d[`${point}_y`]),
          name: `Ponto ${point}`,
          type: "scatter",
          mode: "markers",
          marker: { 
            size: 6,
            colorscale: "Viridis",
            showscale: true,
            colorbar: {
              title: "Frame"
            }
          }
        });
      } else if (type === "velocity") {
        const velocities = data.slice(1).map((d, i) => {
          const prev = data[i];
          const dx = d[`${point}_x`] - prev[`${point}_x`];
          const dy = d[`${point}_y`] - prev[`${point}_y`];
          return Math.sqrt(dx * dx + dy * dy);
        });

        traces.push({
          x: data.slice(1).map(d => d.frame),
          y: velocities,
          name: `Velocidade Ponto ${point}`,
          type: "scatter",
          mode: "lines",
          line: { shape: "spline" }
        });
      }
    }
    
    return traces;
  };

  const getLayout = (type: string) => {
    const baseLayout = {
      title: "Gráfico",
      height: 500,
      plot_bgcolor: "#fafafa",
      paper_bgcolor: "#ffffff",
      font: { size: 12 },
      showlegend: true,
      legend: { x: 0, y: 1 },
      xaxis: { 
        title: "Eixo X",
        showgrid: true,
        gridcolor: "#e5e5e5"
      },
      yaxis: { 
        title: "Eixo Y",
        showgrid: true,
        gridcolor: "#e5e5e5"
      },
      margin: { l: 40, r: 20, t: 40, b: 40 },
      hovermode: "closest"
    };

    if (type === "time") {
      return {
        ...baseLayout,
        title: "Coordenadas X e Y ao Longo do Tempo",
        xaxis: { ...baseLayout.xaxis, title: "Frame" },
        yaxis: { ...baseLayout.yaxis, title: "Coordenada" }
      };
    } else if (type === "scatter") {
      return {
        ...baseLayout,
        title: "Dispersão das Coordenadas",
        xaxis: { ...baseLayout.xaxis, title: "Coordenada X" },
        yaxis: { ...baseLayout.yaxis, title: "Coordenada Y" }
      };
    } else if (type === "velocity") {
      return {
        ...baseLayout,
        title: "Velocidade do Movimento",
        xaxis: { ...baseLayout.xaxis, title: "Frame" },
        yaxis: { ...baseLayout.yaxis, title: "Velocidade" }
      };
    }

    return baseLayout;
  };

  const getStats = () => {
    if (!data.length || !selectedPoints.length) return null;

    const stats = selectedPoints.map(point => {
      const xValues = data.map(d => d[`${point}_x`]);
      const yValues = data.map(d => d[`${point}_y`]);

      const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const std = (arr: number[], m: number) => 
        Math.sqrt(arr.map(x => Math.pow(x - m, 2)).reduce((a, b) => a + b, 0) / arr.length);

      const xMean = mean(xValues);
      const yMean = mean(yValues);

      return {
        point,
        x: {
          mean: xMean.toFixed(2),
          std: std(xValues, xMean).toFixed(2),
          min: Math.min(...xValues).toFixed(2),
          max: Math.max(...xValues).toFixed(2)
        },
        y: {
          mean: yMean.toFixed(2),
          std: std(yValues, yMean).toFixed(2),
          min: Math.min(...yValues).toFixed(2),
          max: Math.max(...yValues).toFixed(2)
        }
      };
    });

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {stats.map(stat => (
          <Card key={stat.point} className="p-4">
            <h3 className="font-semibold mb-2">Ponto {stat.point}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Coordenada X:</p>
                <p className="text-sm">Média: {stat.x.mean}</p>
                <p className="text-sm">Desvio: {stat.x.std}</p>
                <p className="text-sm">Min: {stat.x.min}</p>
                <p className="text-sm">Max: {stat.x.max}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Coordenada Y:</p>
                <p className="text-sm">Média: {stat.y.mean}</p>
                <p className="text-sm">Desvio: {stat.y.std}</p>
                <p className="text-sm">Min: {stat.y.min}</p>
                <p className="text-sm">Max: {stat.y.max}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Selecione um arquivo CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
            <div className="flex flex-wrap gap-2">
              {availablePoints.map(point => (
                <Button
                  key={point}
                  variant={selectedPoints.includes(point) ? "secondary" : "outline"}
                  onClick={() => {
                    setSelectedPoints(prev =>
                      prev.includes(point)
                        ? prev.filter(p => p !== point)
                        : [...prev, point]
                    );
                  }}
                >
                  Ponto {point}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <div className="space-y-4">
          <Tabs defaultValue="time" className="space-y-4">
            <TabsList>
              <TabsTrigger value="time">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      Série Temporal
                      <HelpCircle className="ml-1 h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Visualização das coordenadas X e Y ao longo do tempo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TabsTrigger>
              <TabsTrigger value="scatter">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      Dispersão
                      <HelpCircle className="ml-1 h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Gráfico de dispersão das coordenadas X e Y</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TabsTrigger>
              <TabsTrigger value="velocity">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      Velocidade
                      <HelpCircle className="ml-1 h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Velocidade do movimento ao longo do tempo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TabsTrigger>
              <TabsTrigger value="stats">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      Estatísticas
                      <HelpCircle className="ml-1 h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Estatísticas descritivas dos pontos selecionados</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="time">
              <Card>
                <CardContent className="pt-6">
                  <PlotlyComponent
                    data={getTraces("time")}
                    layout={getLayout("time")}
                    config={{ responsive: true, displayModeBar: true }}
                    style={{ width: "100%", height: "500px" }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scatter">
              <Card>
                <CardContent className="pt-6">
                  <PlotlyComponent
                    data={getTraces("scatter")}
                    layout={getLayout("scatter")}
                    config={{ responsive: true, displayModeBar: true }}
                    style={{ width: "100%", height: "500px" }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="velocity">
              <Card>
                <CardContent className="pt-6">
                  <PlotlyComponent
                    data={getTraces("velocity")}
                    layout={getLayout("velocity")}
                    config={{ responsive: true, displayModeBar: true }}
                    style={{ width: "100%", height: "500px" }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats">
              <Card>
                <CardContent className="pt-6">
                  {getStats()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 