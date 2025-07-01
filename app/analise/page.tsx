import { SidebarInset } from "@/components/ui/sidebar";
import { DataUpload } from "../components/data-upload/DataUpload";

export default function AnalysisPage() {
  return (
    <SidebarInset>
      <div className="flex-1 space-y-4 p-8">
        <h1 className="text-2xl font-bold">Análise de Coordenadas</h1>
        <DataUpload />
      </div>
    </SidebarInset>
  );
} 