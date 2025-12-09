// import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Implementar listagem de arquivos do blob storage
    // const { blobs } = await list();

    // Por enquanto, retorna lista vazia
    const blobs: any[] = [];

    // Separar por tipo de arquivo
    const videoFiles = blobs.filter(blob =>
      blob.pathname.toLowerCase().endsWith('.mov')
    );

    const csvFiles = blobs.filter(blob =>
      blob.pathname.toLowerCase().endsWith('.csv')
    );

    return NextResponse.json({
      success: true,
      files: {
        videos: videoFiles.map(blob => ({
          url: blob.url,
          filename: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt
        })),
        csvs: csvFiles.map(blob => ({
          url: blob.url,
          filename: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt
        }))
      },
      total: blobs.length
    });

  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    return NextResponse.json({
      error: 'Erro ao buscar arquivos'
    }, { status: 500 });
  }
} 