// import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['video/quicktime', 'text/csv', 'application/vnd.ms-excel'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Tipo de arquivo não suportado. Use .MOV ou .CSV'
      }, { status: 400 });
    }

    // Validar tamanho (500MB máximo)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'Arquivo muito grande. Máximo 500MB'
      }, { status: 400 });
    }

    // TODO: Implementar upload para Vercel Blob
    // const blob = await put(file.name, file, {
    //   access: 'public',
    // });

    // Por enquanto, retorna sucesso sem fazer upload
    return NextResponse.json({
      success: true,
      url: '#', // URL temporária
      filename: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({
      error: 'Erro interno no servidor'
    }, { status: 500 });
  }
} 