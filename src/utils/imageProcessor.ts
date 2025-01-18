// src/utils/imageProcessor.ts
import { removeBackground, Config } from '@imgly/background-removal';
import type { CropperRef, ImageInfo, CropData, ScaleFactors, CanvasData, CropperImageData } from '@/types';

interface ImageProcessorProps {
    file: File;
    setImage: React.Dispatch<React.SetStateAction<string | null>>;
    setProcessedImage: React.Dispatch<React.SetStateAction<string | null>>;
    setCroppedImage: React.Dispatch<React.SetStateAction<string | null>>;
    setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
    setProcessingMessage: React.Dispatch<React.SetStateAction<string>>;
    setShowSuccessMessage: React.Dispatch<React.SetStateAction<boolean>>;
    setImageKey: React.Dispatch<React.SetStateAction<number>>;
    setCorrectionImage: React.Dispatch<React.SetStateAction<string | null>>;
    imageRef: React.RefObject<HTMLImageElement>;
    cropperRef: React.RefObject<CropperRef | null>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    scaleRef: React.MutableRefObject<ScaleFactors>;
    selectedAspectRatio: number;
    isDevelopmentMode: boolean;
    setIsScaleInitialized: React.Dispatch<React.SetStateAction<boolean>>;
    setIsCropperReady: React.Dispatch<React.SetStateAction<boolean>>;
    intelligentCrop: (
        img: HTMLImageElement,
        selectedAspectRatio: number,
        scaleX: number,
        scaleY: number,
        canvasRef: HTMLCanvasElement | null,
        isDevelopmentMode: boolean
    ) => CropData;
}

export const imageProcessor = async ({
    file,
    setImage,
    setProcessedImage,
    setCroppedImage,
    setIsProcessing,
    setProcessingMessage,
    setShowSuccessMessage,
    setImageKey,
    setCorrectionImage,
    imageRef,
    cropperRef,
    canvasRef,
    scaleRef,
    selectedAspectRatio,
    isDevelopmentMode,
    setIsScaleInitialized,
    setIsCropperReady,
    intelligentCrop
}: ImageProcessorProps) => {
    try {
        setImage(null);
        setProcessedImage(null);
        setCroppedImage(null);
        setIsProcessing(true);
        setProcessingMessage('Processing image');
        setShowSuccessMessage(false);
        setImageKey((prevKey) => prevKey + 1);
        setCorrectionImage(null);

        if (isDevelopmentMode) {
            console.group('Image Upload and Processing');
            console.time('TotalProcessingTime');
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            setProcessingMessage(`Unsupported file type. Supported formats: ${validTypes.join(', ')}`);
            throw new Error(`Unsupported file type. Supported formats: ${validTypes.join(', ')}`);
        }

        const config: Config = {
            model: 'medium',
        };

        const blob = await removeBackground(file, config);

        if (!blob) {
            setProcessingMessage('Background removal failed.');
            throw new Error('Background removal failed.');
        }

        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result !== 'string') {
                    reject(new Error('File reader result is not a string'));
                    return;
                }
                const safeDataURL = reader.result.startsWith('data:image')
                    ? reader.result
                    : `data:image/png;base64,${reader.result}`;
                const img = imageRef.current;
                if (!img) {
                    reject(new Error('Image element not initialized'));
                    return;
                }
                img.onload = () => {
                    if (isDevelopmentMode) {
                        console.log('Image Loaded Details:', {
                            width: img.width,
                            height: img.height,
                            aspectRatio: img.width / img.height
                        });
                    }
                    const canvas = canvasRef.current;
                    if (!canvas) {
                        reject(new Error('Canvas element not found'));
                        return;
                    }
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('2D rendering context not found'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0);

                    const finalDataURL = canvas.toDataURL('image/png');
                    setImage(finalDataURL);
                    setProcessedImage(finalDataURL);
                    setCroppedImage(finalDataURL);

                    const lastProcessedImageData: ImageInfo = {
                        dataURL: finalDataURL,
                        width: img.width,
                        height: img.height,
                        aspectRatio: img.width / img.height
                    };

                    const imageData: CropperImageData = {
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        width: img.width,
                        height: img.height
                    };
                    const canvasData: CanvasData = {
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        width: img.width,
                        height: img.height,
                        left: 0,
                        top: 0
                    };

                    scaleRef.current = {
                        scaleX: canvasData.width / imageData.naturalWidth,
                        scaleY: canvasData.height / imageData.naturalHeight
                    };
                    if (isDevelopmentMode) {
                        console.log('Scale Factors after image loaded:', scaleRef.current);
                    }
                    setIsScaleInitialized(true);

                    setTimeout(() => {
                        if (cropperRef.current?.cropper) {
                            const cropper = cropperRef.current.cropper;
                            const autoCropData = intelligentCrop(
                                img,
                                selectedAspectRatio,
                                scaleRef.current.scaleX,
                                scaleRef.current.scaleY,
                                canvasRef.current,
                                isDevelopmentMode
                            );
                            if (isDevelopmentMode) {
                                console.log('Auto crop data in memoizedHandleImageUpload:', autoCropData);
                            }
                            const scaledCropData = {
                                left: autoCropData.left * scaleRef.current.scaleX,
                                top: autoCropData.top * scaleRef.current.scaleY,
                                width: autoCropData.width * scaleRef.current.scaleX,
                                height: autoCropData.height * scaleRef.current.scaleY
                            };
                            if (isDevelopmentMode) {
                                console.log('Scaled Crop Data in memoizedHandleImageUpload:', scaledCropData);
                            }
                            cropper.setCropBoxData(scaledCropData);
                            if (isDevelopmentMode) {
                                console.log('Cropper Box Data after setCropBoxData in memoizedHandleImageUpload:', cropper.getCropBoxData());
                            }
                        }
                        setIsCropperReady(true);
                    }, 100);

                    setProcessingMessage('Processing complete');
                    setShowSuccessMessage(true);
                    setTimeout(() => {
                        setShowSuccessMessage(false);
                    }, 3000);
                    if (isDevelopmentMode) {
                        console.timeEnd('TotalProcessingTime');
                        console.groupEnd();
                    }
                    resolve();
                };

                img.onerror = (error) => {
                    console.error('Image Loading Failed', error);
                    setIsProcessing(false);
                    setProcessingMessage('Image loading failed.');
                    reject(new Error('Image loading failed'));
                    setIsCropperReady(false);
                };
                img.src = safeDataURL;
            };
            reader.onerror = () => {
                console.error('File Reading Failed');
                setIsProcessing(false);
                setProcessingMessage('File reading failed.');
                reject(new Error('File reading failed'));
                setIsCropperReady(false);
            };
            reader.readAsDataURL(blob);
        });
    } catch (error: any) {
        console.error('Image Processing Error:', error);
        setProcessingMessage(error.message || 'Processing failed');
        setImage(null);
        setProcessedImage(null);
        setCroppedImage(null);
        setCorrectionImage(null);
        setIsCropperReady(false);
    } finally {
        setIsProcessing(false);
    }
};
