import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function parseCSV(csvText: string) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        const row: { [key: string]: string } = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
        });
        return row;
    });
    return rows;
}

export async function POST(request: Request): Promise<Response> {
    console.log("Recebendo requisição POST em /api/process-frames");
    
    try {
        const formData = await request.formData();
        const csvFile = formData.get('csv') as File;
        const method = formData.get('method') as string;
        const framesStr = formData.get('frames') as string;
        
        console.log("Dados recebidos:", { method, frames: framesStr });

        if (!csvFile || !method || !framesStr) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
        }

        const frames = JSON.parse(framesStr);
        const csvBuffer = Buffer.from(await csvFile.arrayBuffer());
        const csvContent = csvBuffer.toString();
        
        // Usar nossa própria função parseCSV em vez do csv-parse
        const records = parseCSV(csvContent);

        console.log("Total de registros no CSV:", records.length);

        // Filtrar apenas os frames solicitados
        const processedFrames = records.filter((record: any) => 
            frames.includes(record.frame.toString())
        );

        console.log("Frames processados:", processedFrames);

        return NextResponse.json({ 
            processedFrames,
            success: true 
        });

    } catch (error) {
        console.error("Erro na API:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Erro desconhecido' 
        }, { 
            status: 500 
        });
    }
} 