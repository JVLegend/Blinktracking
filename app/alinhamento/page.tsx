'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// Declaração das variáveis globais do MediaPipe para evitar erros de linter
/* global drawConnectors, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYE, FACEMESH_RIGHT_IRIS, FACEMESH_LEFT_IRIS */

export default function AlinhamentoPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState('Carregando MediaPipe...');
    const [blinkCountLeft, setBlinkCountLeft] = useState(0);
    const [blinkCountRight, setBlinkCountRight] = useState(0);
    const [centerMessage, setCenterMessage] = useState(false);
    const [alignMessage, setAlignMessage] = useState('');
    const [alignMessageColor, setAlignMessageColor] = useState('#FFA500');

    useEffect(() => {
        let lastRightBlink = 0;
        let lastLeftBlink = 0;
        const blinkCooldown = 400; // ms
        let prevLeftClosed = false;
        let prevRightClosed = false;

        // Carregar scripts do MediaPipe
        const loadMediaPipeScripts = async () => {
            const scripts = [
                'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
                'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
                'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
            ];

            for (const src of scripts) {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                document.body.appendChild(script);
                await new Promise((resolve) => script.onload = resolve);
            }
        };

        const initWebcam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                setStatus(`Erro ao acessar webcam: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
        };

        const eyeAspectRatio = (landmarks: any, top: number, bottom: number, left: number, right: number) => {
            const vDist = Math.hypot(
                landmarks[top].x - landmarks[bottom].x,
                landmarks[top].y - landmarks[bottom].y
            );
            const hDist = Math.hypot(
                landmarks[left].x - landmarks[right].x,
                landmarks[left].y - landmarks[right].y
            );
            return vDist / (2 * hDist);
        };

        const LEFT = { l: 263, r: 362, t: 386, b: 374 };
        const RIGHT = { l: 133, r: 33, t: 159, b: 145 };

        const onResults = (results: any) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const landmarks = results.multiFaceLandmarks[0];

                // Desenhar apenas olhos e íris
                // drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
                drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#FF3030' });
                drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#30FF30' });
                drawConnectors(ctx, landmarks, FACEMESH_RIGHT_IRIS, { color: '#FFFF00', lineWidth: 2 });
                drawConnectors(ctx, landmarks, FACEMESH_LEFT_IRIS, { color: '#FFFF00', lineWidth: 2 });

                const earLeft = eyeAspectRatio(landmarks, LEFT.t, LEFT.b, LEFT.l, LEFT.r);
                const earRight = eyeAspectRatio(landmarks, RIGHT.t, RIGHT.b, RIGHT.l, RIGHT.r);
                const blinkThreshold = 0.13;
                const now = Date.now();

                // Olho esquerdo
                if (earLeft < blinkThreshold && !prevLeftClosed && now - lastLeftBlink > blinkCooldown) {
                    setBlinkCountLeft(prev => prev + 1);
                    lastLeftBlink = now;
                    prevLeftClosed = true;
                } else if (earLeft >= blinkThreshold) {
                    prevLeftClosed = false;
                }

                // Olho direito
                if (earRight < blinkThreshold && !prevRightClosed && now - lastRightBlink > blinkCooldown) {
                    setBlinkCountRight(prev => prev + 1);
                    lastRightBlink = now;
                    prevRightClosed = true;
                } else if (earRight >= blinkThreshold) {
                    prevRightClosed = false;
                }

                setStatus(`EAR Esq: ${earLeft.toFixed(2)} | EAR Dir: ${earRight.toFixed(2)}`);

                const centerRect = document.getElementById('center-rect');
                if (!centerRect) return;

                const rect = centerRect.getBoundingClientRect();

                const normToPixel = (landmark: any) => ({
                    x: landmark.x * window.innerWidth,
                    y: landmark.y * window.innerHeight
                });

                const leftEyeLandmark = landmarks[LEFT.l];
                const rightEyeLandmark = landmarks[RIGHT.r];

                const leftEyePx = normToPixel(leftEyeLandmark);
                const rightEyePx = normToPixel(rightEyeLandmark);

                const leftInRect = (
                    leftEyePx.x >= rect.left &&
                    leftEyePx.x <= rect.right &&
                    leftEyePx.y >= rect.top &&
                    leftEyePx.y <= rect.bottom
                );
                const rightInRect = (
                    rightEyePx.x >= rect.left &&
                    rightEyePx.x <= rect.right &&
                    rightEyePx.y >= rect.top &&
                    rightEyePx.y <= rect.bottom
                );

                if (leftInRect && rightInRect) {
                    setCenterMessage(true);

                    const eyesCenterX = (leftEyePx.x + rightEyePx.x) / 2;
                    const rectCenterX = (rect.left + rect.right) / 2;
                    const rectWidth = rect.right - rect.left;
                    const tolerance = rectWidth * 0.15;

                    if (Math.abs(eyesCenterX - rectCenterX) <= tolerance) {
                        setAlignMessage('Alinhamento horizontal perfeito!');
                        setAlignMessageColor('#00FF00');
                    } else {
                        if (eyesCenterX < rectCenterX) {
                            setAlignMessage('Mova a cabeça para a direita');
                        } else {
                            setAlignMessage('Mova a cabeça para a esquerda');
                        }
                        setAlignMessageColor('#FFA500');
                    }
                } else {
                    setCenterMessage(false);
                    setAlignMessage('');
                }
            }
        };

        const startTracking = async () => {
            await loadMediaPipeScripts();
            await initWebcam();

            const faceMesh = new (window as any).FaceMesh({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            faceMesh.onResults(onResults);

            const camera = new (window as any).Camera(videoRef.current, {
                onFrame: async () => {
                    await faceMesh.send({ image: videoRef.current });
                },
                width: 1280,
                height: 720
            });

            camera.start();
        };

        startTracking();

        return () => {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute w-full h-full object-cover scale-x-[-1]"
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full scale-x-[-1] pointer-events-none"
            />
            <div className="absolute top-5 left-5 text-white bg-black/50 p-2.5 rounded z-10">
                {status}
            </div>
            <Link
                href="/"
                className="absolute top-5 right-5 z-20 px-5 py-2.5 text-lg rounded bg-[#222] text-white cursor-pointer no-underline"
            >
                Voltar
            </Link>
            <div
                id="center-rect"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[120vh] bg-white/30 rounded-3xl z-30 shadow-[0_0_24px_4px_rgba(255,255,255,0.18)] pointer-events-none"
            />
            {centerMessage && (
                <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-40 text-3xl text-white bg-black/70 px-8 py-4 rounded-xl">
                    olhos contidos na área central
                </div>
            )}
            {alignMessage && (
                <div
                    className="absolute top-[120px] left-1/2 -translate-x-1/2 z-41 text-2xl text-white bg-black/70 px-7 py-3 rounded-lg"
                    style={{ color: alignMessageColor }}
                >
                    {alignMessage}
                </div>
            )}
            <div
                className="absolute z-50 text-3xl text-[#00FF00] [text-shadow:0_0_8px_#000]"
                style={{
                    left: 'calc(50% - 100px)',
                    top: 'calc(50% - 100px)'
                }}
            >
                👁️‍🗨️ {blinkCountLeft}
            </div>
            <div
                className="absolute z-50 text-3xl text-[#00FFFF] [text-shadow:0_0_8px_#000]"
                style={{
                    left: 'calc(50% + 100px)',
                    top: 'calc(50% - 100px)'
                }}
            >
                👁️‍🗨️ {blinkCountRight}
            </div>
        </div>
    );
} 