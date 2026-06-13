import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const tmpDir = path.resolve(process.cwd(), 'tmp');
        const filePath = path.resolve(tmpDir, ...params.path);

        if (!filePath.startsWith(`${tmpDir}${path.sep}`)) {
            return NextResponse.json(
                { error: "Caminho inválido" },
                { status: 400 }
            );
        }

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
