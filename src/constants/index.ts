// src/constants/index.ts
import type { AspectRatioOption, ColorOption } from '@/types';

export const aspectRatioOptions: AspectRatioOption[] = [
    { value: 1 / 1, label: '1:1' },
    { value: 2 / 3, label: '2:3' },
    { value: 3 / 4, label: '3:4' },
    { value: 4 / 3, label: '4:3' },
    { value: 5 / 7, label: '5:7' },
    { value: 7 / 9, label: '7:9' },
    { value: 9 / 7, label: '9:7' },
];

export const presetColors: ColorOption[] = [
    { name: 'White', value: '#ffffff' },
    { name: 'Red', value: '#ff0000' },
    { name: 'Blue', value: '#0000ff' },
    { name: 'Bright Blue', value: '#4285F4' },
    { name: 'Light Blue', value: '#add8e6' },
    { name: 'Sky Blue', value: '#87ceeb' },
    { name: 'Navy Blue', value: '#000080' },
    { name: 'Gray', value: '#808080' },
    { name: 'Light Gray', value: '#d3d3d3' },
];

