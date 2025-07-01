import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const filePath = path.join(process.cwd(), 'tmp', ...params.path);
        const file = await readFile(filePath);
        
        return new NextResponse(file, {
            headers: {
                'Content-Type': 'video/mp4',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Arquivo não encontrado" },
            { status: 404 }
        );
    }
} 