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
