// src/utils/intelligentCrop.ts
import type { CropData } from '@/types';

export const intelligentCrop = (
    img: HTMLImageElement,
    selectedAspectRatio: number,
    scaleX: number,
    scaleY: number,
    canvasRef: HTMLCanvasElement | null,
    isDevelopmentMode: boolean
): CropData => {
    if (isDevelopmentMode) {
        console.log('intelligentCrop input:', {
            imgWidth: img.width,
            imgHeight: img.height,
            selectedAspectRatio,
            scaleX,
            scaleY,
        });
    }
    const canvas = canvasRef;
    if (!canvas) {
        if (isDevelopmentMode) console.warn('Canvas element is not available for intelligent crop.');
        return { left: 0, top: 0, width: 0, height: 0 };
    }
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        if (isDevelopmentMode) console.warn('2D rendering context is not available for intelligent crop.');
        return { left: 0, top: 0, width: 0, height: 0 };
    }
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let topY = canvas.height,
        bottomY = 0,
        leftX = canvas.width,
        rightX = 0;

    const rowCenters: number[] = [];
    const rowWidths: number[] = [];
    
    const minPixelThreshold = 20;

    for (let y = 0; y < canvas.height; y++) {
        let rowLeftX = canvas.width;
        let rowRightX = 0;
        let rowPixelCount = 0;
        let rowCenterX = 0;
        let rowHasValidPixels = false;

        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];

            if (alpha > 10) {
                rowHasValidPixels = true;
                topY = Math.min(topY, y);
                bottomY = Math.max(bottomY, y);
                leftX = Math.min(leftX, x);
                rightX = Math.max(rightX, x);

                rowLeftX = Math.min(rowLeftX, x);
                rowRightX = Math.max(rowRightX, x);
                rowCenterX += x;
                rowPixelCount++;
            }
        }

        if (rowPixelCount >= minPixelThreshold && rowHasValidPixels) {
            rowWidths.push(rowRightX - rowLeftX);
            rowCenters.push(rowCenterX / rowPixelCount);
        }
    }

    const widthChanges: number[] = [];
    for (let i = 1; i < rowWidths.length; i++) {
        if (rowWidths[i - 1] > 0) {
            const changeRate = (rowWidths[i] - rowWidths[i - 1]) / rowWidths[i - 1];
            widthChanges.push(changeRate);
        }
    }

    let headEndY = topY;
    let shoulderEndY = bottomY;
    let maxWidthChangeIndex = -1;
    let maxWidthChange = 0;

    widthChanges.forEach((change, index) => {
        if (change > maxWidthChange) {
            maxWidthChange = change;
            maxWidthChangeIndex = index;
        }
    });

    if (maxWidthChangeIndex !== -1) {
        headEndY = topY + maxWidthChangeIndex;
        shoulderEndY = Math.min(bottomY, headEndY + (bottomY - topY) * 0.3);
    }

    const personCenterX = rowCenters.reduce((sum, center) => sum + center, 0) / rowCenters.length;
    const personWidth = rightX - leftX;
    const personHeight = bottomY - topY;

    const headTopBuffer = personHeight * 0.15;
    const shoulderBottomBuffer = personHeight * 0.2;
    const recommendedHeight = (shoulderEndY - headEndY) + headTopBuffer + shoulderBottomBuffer;
    let recommendedWidth = recommendedHeight * selectedAspectRatio;


    if (rowCenters.length === 0 || rowWidths.length === 0) {
        if (isDevelopmentMode) {
            console.warn('No valid pixels detected in the image');
        }
        // 返回一个基于图像中心的默认裁剪
        return {
            left: img.width * 0.25,
            top: img.height * 0.2,
            width: img.width * 0.5,
            height: img.height * 0.6
        };
    }


    const cropData: CropData = {
        left: personCenterX - (recommendedWidth / 2),
        top: Math.max(topY, headEndY - headTopBuffer),
        width: recommendedWidth,
        height: recommendedHeight
    };

    cropData.left = Math.max(0, Math.min(cropData.left, img.width - cropData.width));
    cropData.top = Math.max(0, Math.min(cropData.top, img.height - cropData.height));




    if (isDevelopmentMode) {
        console.log('Intelligent Crop Details:', {
            imageSize: `${img.width}x${img.height}`,
            personArea: {
                top: topY,
                bottom: bottomY,
                left: leftX,
                right: rightX,
                width: personWidth,
                height: bottomY - topY,
                centerX: personCenterX
            },
            cropDetails: {
                headTopBuffer,
                recommendedHeadHeight: recommendedHeight,
                cropHeight: cropData.height,
                cropWidth: cropData.width,
                cropTop: cropData.top,
                cropLeft: cropData.left
            },
            widthChanges: {
                maxChange: maxWidthChange,
                maxChangeIndex: maxWidthChangeIndex
            }
        });
    }

    return cropData;
};
