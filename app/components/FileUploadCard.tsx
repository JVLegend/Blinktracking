"use client"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

interface FileUploadCardProps {
    uploadedFile: File | null
    onFileSelect: (file: File) => void
    onProcessFile: () => void
    isLoading: boolean
}

export function FileUploadCard({
    uploadedFile,
    onFileSelect,
    onProcessFile,
    isLoading
}: FileUploadCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast.error("Por favor, selecione um arquivo CSV")
            return
        }

        onFileSelect(file)
        toast.success(`Arquivo ${file.name} selecionado`)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Upload className="h-6 w-6 text-primary" />
                    <CardTitle>Upload de Arquivo CSV</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="flex-1"
                    />
                </div>

                {uploadedFile && (
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold">Arquivo Selecionado:</p>
                                <p className="text-sm text-muted-foreground">{uploadedFile.name}</p>
                            </div>
                        </div>

                        <Button
                            onClick={onProcessFile}
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? "Processando..." : "Carregar e Processar Arquivo"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
