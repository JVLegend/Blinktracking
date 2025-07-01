"use client"

import { useState } from "react"
import { Upload, Table, FileSpreadsheet } from "lucide-react"
import { SidebarInset } from "@/components/ui/sidebar"
import * as XLSX from "xlsx"

interface PatientData {
  DIA: string
  NOME: string
  RGHC: string
  CASO: string
  "FENDA OD": number
  "FENDA OE": number
  "DMR1 OD": number
  "DMR1 OE": number
  "HOR OD": number
  "HOR OE": number
  TAPAZOL: string
  TIROIDECTOMIA: string
  IODO: string
  CONTROLADO: string
  ATIVO: string
  DIPLOPIA: string
  "CIRURGIA OFT PREVIA": string
  "QUAL?": string
  COLÍRIO: string
  HERTEL: string
  "RETRAÇAO SUP": string
  "RETRAÇAO INF": string
  FENDA: string
  "PISCADAS 1MIN": string
  "PISCADAS 2MIN": string
  [key: string]: string | number // Para outras colunas dinâmicas
}

export default function DadosPacientePage() {
  const [data, setData] = useState<PatientData[]>([])
  const [columns, setColumns] = useState<string[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      if (!data) return

      const workbook = XLSX.read(data, { type: "binary" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as PatientData[]

      setData(jsonData)
      if (jsonData.length > 0) {
        setColumns(Object.keys(jsonData[0]))
      }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <SidebarInset>
      <div className="flex-1 space-y-8 p-8 max-w-[95vw] mx-auto">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Dados dos Pacientes</h1>
          <p className="opacity-70">
            Visualize e gerencie os dados dos pacientes importados de planilhas
          </p>
        </div>

        {/* Upload */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              <h2 className="card-title">Importar Dados</h2>
            </div>
            <p className="opacity-70 mb-4">
              Faça upload de uma planilha XLSX com os dados dos pacientes
            </p>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="file-input file-input-bordered w-full max-w-xs"
              />
              <div className="badge badge-outline">XLSX</div>
            </div>
          </div>
        </div>

        {/* Tabela de Dados */}
        {data.length > 0 && (
          <div className="card bg-base-100 shadow-xl overflow-x-auto">
            <div className="card-body p-0"> {/* Removido padding para melhor visualização */}
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column} className="text-sm whitespace-nowrap px-4 py-3 bg-base-200">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index}>
                        {columns.map((column) => (
                          <td key={column} className="text-sm whitespace-nowrap px-4 py-2">
                            {row[column]?.toString() || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Mensagem quando não há dados */}
        {data.length === 0 && (
          <div className="alert">
            <Table className="h-6 w-6" />
            <span>Faça upload de uma planilha para visualizar os dados</span>
          </div>
        )}
      </div>
    </SidebarInset>
  )
} 