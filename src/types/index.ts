// src/types/index.ts

export interface AspectRatioOption {
    value: number;
    label: string;
}

export interface ColorOption {
    name: string;
    value: string;
}

export interface ImageInfo {
    dataURL: string;
    width: number;
    height: number;
    aspectRatio: number;
    backgroundColor?: string;
}

export interface CropData {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface ScaleFactors {
    scaleX: number;
    scaleY: number;
}

// Cropper 相关类型
export interface CropperImageData {
    naturalWidth: number;
    naturalHeight: number;
    width: number;
    height: number;
    left: number;
    top: number;
}

export interface CropBoxData {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface CanvasData {
     naturalWidth: number;
     naturalHeight: number;
     width: number;
     height: number;
     left: number;
     top: number;
}

export interface CropperInstance {
   getCroppedCanvas(options?: {
         width?: number;
         height?: number;
     }): HTMLCanvasElement;

    getImageData(): CropperImageData;

    getCanvasData(): CanvasData;

    setCropBoxData(data: CropBoxData): void;

    getCropBoxData(): CropBoxData;

    
}

export interface CropperRef {
    cropper: CropperInstance | null;
}
