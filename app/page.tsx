"use client"

import { SidebarInset } from "@/components/ui/sidebar";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Scan, Video, Image, BarChart3, PieChart, Clock, Eye, Upload, FileVideo, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFileUpload } from "./hooks/useFileUpload";
import { useStoredFiles } from "./hooks/useStoredFiles";
import { StoredFiles } from "./components/StoredFiles";
import { useRef } from "react";

const videoFeatures = [
  {
    Icon: Scan,
    name: "Extração de Pontos",
    description: "Extraia coordenadas faciais de vídeos usando dlib ou MediaPipe para análise detalhada de piscadas.",
    href: "/funcionalidades/extrair-pontos",
    cta: "Extrair pontos",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
  {
    Icon: Video,
    name: "Geração de Vídeos",
    description: "Gere vídeos com marcações dos pontos faciais detectados para visualização do processamento.",
    href: "/funcionalidades/gerar-video",
    cta: "Gerar vídeo",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
  {
    Icon: Image,
    name: "Visualização de Frames",
    description: "Visualize os frames do vídeo com as marcações dos pontos faciais detectados.",
    href: "/funcionalidades/visualizar-frames",
    cta: "Visualizar frames",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
];

const csvFeatures = [
  {
    Icon: BarChart3,
    name: "Análise de Coordenadas",
    description: "Analise as coordenadas extraídas através de gráficos interativos e métricas detalhadas.",
    href: "/analise/coordenadas",
    cta: "Analisar coordenadas",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
  {
    Icon: PieChart,
    name: "Estatísticas das Piscadas",
    description: "Visualize estatísticas detalhadas sobre as piscadas detectadas, incluindo duração, velocidade e distribuição.",
    href: "/analise/estatisticas",
    cta: "Ver estatísticas",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
  {
    Icon: Clock,
    name: "Análise de Piscadas",
    description: "Analise detalhadamente os frames e timestamps de cada piscada detectada no vídeo.",
    href: "/analise/piscadas",
    cta: "Analisar piscadas",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
];

export default function HomePage() {
  const videoUpload = useFileUpload();
  const csvUpload = useFileUpload();
  const { refresh: refreshStoredFiles } = useStoredFiles();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = () => {
    videoInputRef.current?.click();
  };

  const handleCsvUpload = () => {
    csvInputRef.current?.click();
  };

  const handleVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await videoUpload.uploadFile(file);
        // Atualizar lista de arquivos após upload bem-sucedido
        refreshStoredFiles();
      } catch (error) {
        console.error('Erro no upload do vídeo:', error);
      }
    }
  };

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await csvUpload.uploadFile(file);
        // Atualizar lista de arquivos após upload bem-sucedido
        refreshStoredFiles();
      } catch (error) {
        console.error('Erro no upload do CSV:', error);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <SidebarInset>
      <div className="flex-1 space-y-8 p-8">
        {/* Hidden file inputs */}
        <input
          ref={videoInputRef}
          type="file"
          accept=".mov,video/quicktime"
          onChange={handleVideoFileChange}
          className="hidden"
        />
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvFileChange}
          className="hidden"
        />

        {/* Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-2xl -m-4" />
          
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Eye className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent mb-1">
                  SmartBlink
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Sistema Ativo</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Análise de Piscadas</span>
                </div>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground/80 max-w-2xl leading-relaxed">
              Para começar a utilizar a plataforma, faça o upload de um <span className="font-semibold text-foreground">vídeo (.MOV)</span> ou 
              de uma <span className="font-semibold text-foreground">planilha (.CSV)</span> com dados de coordenadas.
            </p>
            
            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Video Upload Card */}
          <Card className="relative overflow-hidden border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <FileVideo className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Upload de Vídeo</CardTitle>
              <CardDescription>
                Envie um arquivo de vídeo (.MOV) para análise facial e detecção de piscadas
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {videoUpload.uploadedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Upload concluído!</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">{videoUpload.uploadedFile.filename}</p>
                    <p>{formatFileSize(videoUpload.uploadedFile.size)}</p>
                  </div>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => videoUpload.reset()}
                  >
                    Enviar outro vídeo
                  </Button>
                </div>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleVideoUpload}
                    disabled={videoUpload.isUploading}
                  >
                    {videoUpload.isUploading ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Vídeo (.MOV)
                      </>
                    )}
                  </Button>
                  
                  {videoUpload.isUploading && (
                    <div className="space-y-2">
                      <Progress value={videoUpload.progress} className="w-full" />
                      <p className="text-sm text-muted-foreground">
                        {videoUpload.progress}% enviado
                      </p>
                    </div>
                  )}
                  
                  {videoUpload.error && (
                    <div className="flex items-center justify-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{videoUpload.error}</span>
                    </div>
                  )}
                </>
              )}
              
              <p className="text-sm text-muted-foreground">
                Formatos suportados: .MOV (máx. 500MB)
              </p>
            </CardContent>
          </Card>

          {/* CSV Upload Card */}
          <Card className="relative overflow-hidden border-2 border-dashed border-green-600/20 hover:border-green-600/40 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Upload de Planilha</CardTitle>
              <CardDescription>
                Envie uma planilha (.CSV) com coordenadas já extraídas para análise
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {csvUpload.uploadedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Upload concluído!</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">{csvUpload.uploadedFile.filename}</p>
                    <p>{formatFileSize(csvUpload.uploadedFile.size)}</p>
                  </div>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => csvUpload.reset()}
                  >
                    Enviar outra planilha
                  </Button>
                </div>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleCsvUpload}
                    disabled={csvUpload.isUploading}
                  >
                    {csvUpload.isUploading ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Planilha (.CSV)
                      </>
                    )}
                  </Button>
                  
                  {csvUpload.isUploading && (
                    <div className="space-y-2">
                      <Progress value={csvUpload.progress} className="w-full" />
                      <p className="text-sm text-muted-foreground">
                        {csvUpload.progress}% enviado
                      </p>
                    </div>
                  )}
                  
                  {csvUpload.error && (
                    <div className="flex items-center justify-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{csvUpload.error}</span>
                    </div>
                  )}
                </>
              )}
              
              <p className="text-sm text-muted-foreground">
                Formatos suportados: .CSV (máx. 500MB)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stored Files Section */}
        <StoredFiles onRefresh={refreshStoredFiles} />

        {/* Video Features Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileVideo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Funcionalidades para Vídeo</h2>
              <p className="text-muted-foreground">
                {videoUpload.uploadedFile 
                  ? "✅ Vídeo enviado - funcionalidades disponíveis" 
                  : "Disponíveis após upload de arquivo .MOV"
                }
              </p>
            </div>
          </div>
          
          <BentoGrid>
            {videoFeatures.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>

        {/* CSV Features Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Funcionalidades para Planilha</h2>
              <p className="text-muted-foreground">
                {csvUpload.uploadedFile 
                  ? "✅ Planilha enviada - funcionalidades disponíveis" 
                  : "Disponíveis após upload de arquivo .CSV"
                }
              </p>
            </div>
          </div>
          
          <BentoGrid>
            {csvFeatures.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </div>
    </SidebarInset>
  );
}
