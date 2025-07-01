interface DataPoint {
    frame: number;
    method: string;
    // Pontos do dlib
    "37_x"?: number;
    "37_y"?: number;
    "38_x"?: number;
    "38_y"?: number;
    "40_x"?: number;
    "40_y"?: number;
    "41_x"?: number;
    "41_y"?: number;
    // Pontos do MediaPipe
    "right_upper_4_x"?: number;
    "right_upper_4_y"?: number;
    "right_lower_4_x"?: number;
    "right_lower_4_y"?: number;
    "left_upper_4_x"?: number;
    "left_upper_4_y"?: number;
    "left_lower_4_x"?: number;
    "left_lower_4_y"?: number;
    [key: string]: number | string | undefined;
}

export interface FacialPoint {
    x: number;
    y: number;
}

export type FaceLandmarks = FacialPoint[];

export type FrameFacialPoints = FaceLandmarks[]; // Array de FaceLandmarks para cada face detectada em um frame

export type AllFramesFacialPoints = FrameFacialPoints[]; // Array de FrameFacialPoints para todos os frames 

export interface VideoData {
  id: string;
  url: string;
  points?: number[][];
  status: 'processing' | 'complete' | 'error';
}

export interface ExtractPointsResponse {
  success: boolean;
  points?: number[][];
  error?: string;
} 