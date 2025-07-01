import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import fs from 'node:fs/promises';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

// Função para determinar o comando Python correto
const getPythonCommand = () => {
    return os.platform() === 'win32' ? 'python' : 'python3';
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Configuração específica para o tamanho do corpo da requisição
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export const route = {
    api: {
        bodyParser: false,
    },
}

// Função auxiliar para criar nome de arquivo único
function getUniqueFilename(prefix: string, extension: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`;
}

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    try {
        // Criar diretório temporário se não existir
        const tmpDir = path.join(process.cwd(), 'tmp');
        await mkdir(tmpDir, { recursive: true });

        // Processar o FormData
        const formData = await req.formData();
        const video = formData.get('video') as File;
        const method = formData.get('method') as string;

        if (!video || !method) {
            return new Response(
                encoder.encode('data: ' + JSON.stringify({ error: "Vídeo ou método não fornecido" }) + '\n\n'),
                { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
            );
        }

        // Gerar nomes únicos para os arquivos temporários
        const videoPath = path.join(tmpDir, getUniqueFilename('input', '.mp4'));

        try {
            // Salvar vídeo temporariamente
            const videoBuffer = Buffer.from(await video.arrayBuffer());
            await writeFile(videoPath, videoBuffer);

            // Criar stream de resposta
            const stream = new TransformStream();
            const writer = stream.writable.getWriter();

            // Executar script Python
            const pythonCommand = getPythonCommand();
            const scriptPath = path.join(process.cwd(), "scripts", 
                method === "dlib" ? "process_video_dlib.py" : "process_video_mediapipe.py"
            );

            // Preparar argumentos
            const pythonArgs = [
                scriptPath,
                videoPath,
                tmpDir,
                path.join(process.cwd(), "models", "shape_predictor_68_face_landmarks.dat")
            ];

            console.log("Executando comando:", pythonCommand, pythonArgs);
            const pythonProcess = spawn(pythonCommand, pythonArgs);

            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', async (data) => {
                const str = data.toString();
                console.log("Python stdout:", str);
                outputData += str;

                // Verificar se há informação de progresso
                if (str.includes("Progresso:")) {
                    const progressMatch = str.match(/Progresso: (\d+)/);
                    if (progressMatch) {
                        const progress = parseInt(progressMatch[1]);
                        await writer.write(encoder.encode('data: ' + JSON.stringify({ progress }) + '\n\n'));
                    }
                }
            });

            pythonProcess.stderr.on('data', async (data) => {
                const str = data.toString();
                console.error("Python stderr:", str);
                if (!str.includes("INFO:") && !str.includes("TensorFlow") && !str.includes("UserWarning")) {
                    errorData += str;
                }
                // Verificar se há informação de progresso no stderr também
                if (str.includes("Progresso:")) {
                    const progressMatch = str.match(/Progresso: (\d+)/);
                    if (progressMatch) {
                        const progress = parseInt(progressMatch[1]);
                        await writer.write(encoder.encode('data: ' + JSON.stringify({ progress }) + '\n\n'));
                    }
                }
            });

            pythonProcess.on("close", async (code) => {
                try {
                    if (code !== 0) {
                        console.error("Erro no script Python:", errorData);
                        await writer.write(encoder.encode('data: ' + JSON.stringify({ error: "Erro ao processar o vídeo: " + errorData }) + '\n\n'));
                        await writer.close();
                    } else {
                        try {
                            console.log("Tentando parsear saída:", outputData);
                            const result = JSON.parse(outputData);
                            
                            if (!result.success) {
                                await writer.write(encoder.encode('data: ' + JSON.stringify({ error: result.error || "Erro ao processar o vídeo" }) + '\n\n'));
                                await writer.close();
                                return;
                            }
                            
                            // Ler o arquivo de vídeo processado
                            const videoOutputPath = path.join(tmpDir, result.outputFile);
                            
                            console.log("Lendo arquivo de vídeo:", videoOutputPath);
                            const videoData = await readFile(videoOutputPath);
                            
                            // Enviar o vídeo processado
                            await writer.write(encoder.encode('data: ' + JSON.stringify({ 
                                status: 'complete',
                                videoData: videoData.toString('base64')
                            }) + '\n\n'));
                            await writer.close();

                            // Limpar arquivo de vídeo processado
                            await fs.unlink(videoOutputPath).catch(() => {});
                        } catch (error) {
                            console.error("Erro ao processar resultado:", error, "Output:", outputData);
                            await writer.write(encoder.encode('data: ' + JSON.stringify({ error: "Erro ao processar resultado do vídeo" }) + '\n\n'));
                            await writer.close();
                        }
                    }
                } finally {
                    // Limpar arquivo de vídeo temporário
                    await fs.unlink(videoPath).catch(() => {});
                }
            });

            return new Response(stream.readable, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            });

        } catch (error) {
            console.error("Erro ao processar vídeo:", error);
            return new Response(
                encoder.encode('data: ' + JSON.stringify({ error: "Erro interno ao processar o vídeo" }) + '\n\n'),
                { status: 500, headers: { 'Content-Type': 'text/event-stream' } }
            );
        }

    } catch (error) {
        console.error("Erro na rota:", error);
        return new Response(
            encoder.encode('data: ' + JSON.stringify({ error: "Erro interno do servidor" }) + '\n\n'),
            { status: 500, headers: { 'Content-Type': 'text/event-stream' } }
        );
    }
} 