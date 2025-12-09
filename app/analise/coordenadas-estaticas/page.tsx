"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/ui/sidebar";
import { toast } from "sonner";

export default function CoordenadasEstaticasPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [frameImg, setFrameImg] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDims, setImgDims] = useState<{w: number, h: number} | null>(null);

  // Extrai o primeiro frame do vídeo e converte para imagem base64
  const extractFirstFrame = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.src = URL.createObjectURL(file);
      video.currentTime = 0;
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        video.currentTime = 0;
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        } else {
          reject("Erro ao obter contexto do canvas");
        }
        URL.revokeObjectURL(video.src);
      };
      video.onerror = (e) => reject("Erro ao carregar vídeo");
    });
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setVideoUrl(URL.createObjectURL(file));
    try {
      const img = await extractFirstFrame(file);
      setFrameImg(img);
    } catch (err) {
      toast.error("Erro ao extrair frame do vídeo");
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setCsvData(parsedData);
      setSelectedPoints([]); // Começa desmarcado
    } catch (error) {
      toast.error("Erro ao processar o CSV");
    }
  };

  // Renderiza os pontos selecionados sobre o frame
  const renderPoints = (imgRef: React.RefObject<HTMLImageElement>, imgDims: {w: number, h: number} | null) => {
    if (!frameImg || !csvData.length || selectedPoints.length === 0) return null;
    const first = csvData[0];
    const points: { x: number; y: number; label: string }[] = [];
    selectedPoints.forEach((i) => {
      if (i <= 7) {
        points.push({
          x: parseFloat(first[`right_upper_${i}_x`]),
          y: parseFloat(first[`right_upper_${i}_y`]),
          label: `Direito Superior ${i}`
        });
        points.push({
          x: parseFloat(first[`left_upper_${i}_x`]),
          y: parseFloat(first[`left_upper_${i}_y`]),
          label: `Esquerdo Superior ${i}`
        });
      }
      if (i <= 9) {
        points.push({
          x: parseFloat(first[`right_lower_${i}_x`]),
          y: parseFloat(first[`right_lower_${i}_y`]),
          label: `Direito Inferior ${i}`
        });
        points.push({
          x: parseFloat(first[`left_lower_${i}_x`]),
          y: parseFloat(first[`left_lower_${i}_y`]),
          label: `Esquerdo Inferior ${i}`
        });
      }
    });
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <img
          ref={imgRef}
          src={frameImg}
          alt="Frame do vídeo"
          style={{ maxWidth: 600, borderRadius: 8, width: "100%", height: "auto" }}
          onLoad={(e) => setImgDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
        {imgDims && points.map((pt, idx) => {
          const imgEl = imgRef.current;
          let scaleX = 1, scaleY = 1;
          if (imgEl) {
            scaleX = imgEl.width / imgDims.w;
            scaleY = imgEl.height / imgDims.h;
          }
          // Se coordenada <= 1, assume normalizada e multiplica pela dimensão
          const xVal = pt.x <= 1 ? pt.x * imgDims.w : pt.x;
          const yVal = pt.y <= 1 ? pt.y * imgDims.h : pt.y;
          const left = xVal * scaleX;
          const top = yVal * scaleY;
          return (
            <div
              key={pt.label + idx}
              style={{
                position: "absolute",
                left: left - 12,
                top: top - 12,
                width: 24,
                height: 24,
                background: "#e11d48",
                borderRadius: "50%",
                border: "3px solid #fff",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                pointerEvents: "none",
                zIndex: 2,
                boxShadow: "0 0 8px #0008"
              }}
              title={pt.label}
            >
              {idx + 1}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Coordenadas Estáticas</h1>
          <p className="text-muted-foreground">
            Visualize os pontos selecionados sobre o primeiro frame do vídeo.
          </p>
        </div>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload do Vídeo e CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div>
                  <Label htmlFor="video">Vídeo</Label>
                  <Input id="video" type="file" accept="video/*" onChange={handleVideoUpload} />
                </div>
                <div>
                  <Label htmlFor="csv">CSV</Label>
                  <Input id="csv" type="file" accept=".csv" onChange={handleCsvUpload} />
                </div>
              </div>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Visualização Estática</CardTitle>
            </CardHeader>
            <CardContent>
              {frameImg && csvData.length > 0 && selectedPoints.length > 0 ? (
                <div className="flex flex-col items-center">
                  {renderPoints(imgRef, imgDims)}
                  <p className="mt-2 text-xs text-muted-foreground">Os pontos são plotados sobre o primeiro frame do vídeo, de acordo com as coordenadas do CSV.</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">Faça upload do vídeo, do CSV e selecione ao menos um ponto para visualizar.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
} 