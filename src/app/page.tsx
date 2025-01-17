'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import 'cropperjs/dist/cropper.css';
import './globals.css';
import { removeBackground, Config } from '@imgly/background-removal';
import Image from 'next/legacy/image';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';
import outline from '../../public/outline.png';
import type { CropperRef, AspectRatioOption, ColorOption, ImageInfo, CropData, ScaleFactors } from '@/types';

const CropperComponent = dynamic(() => import('react-cropper'), {
    ssr: false,
    loading: () => <div>Loading Cropper...</div>
});

function ErrorFallback({ error }: { error: Error }) {
    return (
        <div role="alert">
            <p>Something went wrong:</p>
            <pre>{error.message}</pre>
        </div>
    );
}

export default function App() {
    const [image, setImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [correctionImage, setCorrectionImage] = useState<string | null>(null);
    const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [processingMessage, setProcessingMessage] = useState<string>('');
    const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
    const [imageKey, setImageKey] = useState<number>(0);
    const [cropperKey, setCropperKey] = useState<number>(0);
    const cropperRef = useRef<CropperRef | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const lastProcessedImageData = useRef<ImageInfo | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const scaleRef = useRef<ScaleFactors>({ scaleX: 1, scaleY: 1 });

    useEffect(() => {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas') as HTMLCanvasElement;
        }
    }, []);

    useEffect(() => {
      const createImageElement = () => {
        if (typeof window !== 'undefined') {
           const img = new window.Image();
           imageRef.current = img;
         }
      };

       createImageElement();
    }, []);


    const aspectRatioOptions = useMemo<AspectRatioOption[]>(() => [
        { value: 1 / 1, label: '1:1' },
        { value: 2 / 3, label: '2:3' },
        { value: 3 / 4, label: '3:4' },
        { value: 4 / 3, label: '4:3' },
        { value: 5 / 7, label: '5:7' },
        { value: 7 / 9, label: '7:9' },
        { value: 9 / 7, label: '9:7' },
    ], []);

    const [selectedAspectRatio, setSelectedAspectRatio] = useState<number>(3 / 4);

    const presetColors = useMemo<ColorOption[]>(() => [
        { name: 'White', value: '#ffffff' },
        { name: 'Red', value: '#ff0000' },
        { name: 'Blue', value: '#0000ff' },
        { name: 'Bright Blue', value: '#4285F4' },
        { name: 'Light Blue', value: '#add8e6' },
        { name: 'Sky Blue', value: '#87ceeb' },
        { name: 'Navy Blue', value: '#000080' },
        { name: 'Gray', value: '#808080' },
        { name: 'Light Gray', value: '#d3d3d3' },
    ], []);

    const intelligentCrop = useMemo(() => (img: HTMLImageElement, selectedAspectRatio: number, scaleX: number, scaleY: number): CropData => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return { left: 0, top: 0, width: 0, height: 0 };
        }
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
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

        const cropData: CropData = {
            left: personCenterX - (recommendedWidth / 2),
            top: Math.max(topY, headEndY - headTopBuffer),
            width: recommendedWidth,
            height: recommendedHeight
        };

        cropData.left = Math.max(0, Math.min(cropData.left, img.width - cropData.width));
        cropData.top = Math.max(0, Math.min(cropData.top, img.height - cropData.height));
        
           if (process.env.NODE_ENV !== 'production') {
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
    }, []);

    const handleAspectRatioChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        console.log('handleAspectRatioChange called', {
            imageRefSrc: imageRef.current?.src,
            imageRefExists: !!imageRef.current
        });
    
    
        const newAspectRatio = parseFloat(event.target.value);
        setSelectedAspectRatio(newAspectRatio);
        setCropperKey(prevKey => prevKey + 1);

         if (imageRef.current?.src) {
             // Use setTimeout to ensure Cropper is initialized after aspect ratio changes
            setTimeout(() => {
                if (cropperRef.current?.cropper) {
                     const img = imageRef.current;
                      const autoCropData = intelligentCrop(img, newAspectRatio, scaleRef.current.scaleX, scaleRef.current.scaleY);
                       if (process.env.NODE_ENV !== 'production') {
                           console.log('Auto crop data in handleAspectRatioChange:', autoCropData);
                       }
                      const scaledCropData = {
                         left: autoCropData.left * scaleRef.current.scaleX,
                          top: autoCropData.top * scaleRef.current.scaleY,
                          width: autoCropData.width * scaleRef.current.scaleX,
                         height: autoCropData.height * scaleRef.current.scaleY
                      };
                    if (process.env.NODE_ENV !== 'production') {
                         console.log('Scaled Crop Data in handleAspectRatioChange:', scaledCropData);
                    }
                    cropperRef.current.cropper.setCropBoxData(scaledCropData);
                     if (process.env.NODE_ENV !== 'production') {
                        console.log('Cropper Box Data after setCropBoxData in handleAspectRatioChange:', cropperRef.current.cropper.getCropBoxData());
                    }
                }
            }, 100);
        }
    }, [image, intelligentCrop]);

    const memoizedHandleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setImage(null);
            setProcessedImage(null);
            setCroppedImage(null);
            setIsProcessing(true);
            setProcessingMessage('Processing image');
            setShowSuccessMessage(false);
            setImageKey((prevKey) => prevKey + 1);
            setCorrectionImage(null);

             if (process.env.NODE_ENV !== 'production') {
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
                        if (process.env.NODE_ENV !== 'production') {
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
                         
                         lastProcessedImageData.current = {
                             dataURL: finalDataURL,
                             width: img.width,
                             height: img.height,
                             aspectRatio: img.width / img.height
                        };

                        setTimeout(() => {
                            if (cropperRef.current?.cropper) {
                                const cropper = cropperRef.current.cropper;
                                const autoCropData = intelligentCrop(img, selectedAspectRatio, scaleRef.current.scaleX, scaleRef.current.scaleY);
                                if (process.env.NODE_ENV !== 'production') {
                                    console.log('Auto crop data in memoizedHandleImageUpload:', autoCropData);
                                }
                                const imageData = cropper.getImageData();
                                const canvasData = cropper.getCanvasData();
                                 if (process.env.NODE_ENV !== 'production') {
                                      console.log('Image Data:', {
                                          naturalWidth: imageData.naturalWidth,
                                         naturalHeight: imageData.naturalHeight,
                                          width: imageData.width,
                                          height: imageData.height
                                      });
                                      console.log('Canvas Data:', {
                                           naturalWidth: canvasData.naturalWidth,
                                           naturalHeight: canvasData.naturalHeight,
                                           width: canvasData.width,
                                          height: canvasData.height,
                                        left: canvasData.left,
                                          top: canvasData.top
                                      });
                                 }
                                scaleRef.current = {
                                     scaleX: canvasData.width / imageData.naturalWidth,
                                     scaleY: canvasData.height / imageData.naturalHeight
                                 };
                                 if (process.env.NODE_ENV !== 'production') {
                                    console.log('Scale Factors:', scaleRef.current);
                                }
                                const scaledCropData = {
                                    left: autoCropData.left * scaleRef.current.scaleX,
                                    top: autoCropData.top * scaleRef.current.scaleY,
                                    width: autoCropData.width * scaleRef.current.scaleX,
                                    height: autoCropData.height * scaleRef.current.scaleY
                                };
                                if (process.env.NODE_ENV !== 'production') {
                                    console.log('Scaled Crop Data in memoizedHandleImageUpload:', scaledCropData);
                                }
                                 cropper.setCropBoxData(scaledCropData);
                                  if (process.env.NODE_ENV !== 'production') {
                                      console.log('Cropper Box Data after setCropBoxData in memoizedHandleImageUpload:', cropper.getCropBoxData());
                                  }
                            }
                        }, 100);

                        setProcessingMessage('Processing complete');
                        setShowSuccessMessage(true);
                        setTimeout(() => {
                            setShowSuccessMessage(false);
                        }, 3000);
                          if (process.env.NODE_ENV !== 'production') {
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
                     };

                    img.src = safeDataURL;
                };
                reader.onerror = () => {
                    console.error('File Reading Failed');
                    setIsProcessing(false);
                   setProcessingMessage('File reading failed.');
                    reject(new Error('File reading failed'));
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
        } finally {
            setIsProcessing(false);
        }
    }, [intelligentCrop, selectedAspectRatio]);

     const handleCropChange = useCallback(() => {
        if (!cropperRef.current?.cropper || !image) {
            console.warn('Cropper or image not ready');
            return;
        }
        try {
            const cropper = cropperRef.current.cropper;
            const croppedCanvas = cropper.getCroppedCanvas();
            const croppedImageDataURL = croppedCanvas.toDataURL('image/png');
            setCorrectionImage(croppedImageDataURL);

             const img = typeof window !== 'undefined' ? new window.Image() : null;
              if (!img) {
                 console.error('Cannot create Image object');
                  return;
              }
             img.onload = () => {
                const canvas = canvasRef.current;
                 if (!canvas) {
                     console.error('Canvas element not found');
                     return;
                 }
                canvas.width = img.width;
                 canvas.height = img.height;
                 const ctx = canvas.getContext('2d');
                if (!ctx) {
                     console.error('2D rendering context not found');
                     return;
                }

                ctx.fillStyle = lastProcessedImageData.current?.backgroundColor || backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const finalImageDataURL = canvas.toDataURL('image/png');
                 setCroppedImage(finalImageDataURL);
            };
            img.onerror = (error) => {
                 console.error('Error loading cropped image', error);
                setProcessingMessage('Error loading cropped image');
            };
            img.src = croppedImageDataURL;
        } catch (error: any) {
           console.error('Error updating preview:', error);
            setProcessingMessage('Error updating preview.');
        }
    }, [image, backgroundColor]);

    const handleDownload = useCallback(async () => {
        if (!croppedImage) return;

        try {
            const response = await fetch(croppedImage);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'id-photo.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading image:', error);
            setProcessingMessage('Download failed, please try again');
            setTimeout(() => {
                setProcessingMessage('');
            }, 3000);
        }
    }, [croppedImage]);

    const handleBackgroundChange = useCallback(async (color: string) => {
        if (!image || !cropperRef.current?.cropper) return;
        try {
            setIsProcessing(true);
            setProcessingMessage('Changing background color');
            setBackgroundColor(color);

            const cropper = cropperRef.current.cropper;
             const croppedCanvas = cropper.getCroppedCanvas({
                 width: cropper.getImageData().naturalWidth,
                height: cropper.getImageData().naturalHeight,
            });
            const canvas = canvasRef.current;
              if (!canvas) {
                 console.error('Canvas element not found');
                  return;
              }
            canvas.width = croppedCanvas.width;
             canvas.height = croppedCanvas.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('2D rendering context not found');
                return;
            }

            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
           ctx.drawImage(croppedCanvas, 0, 0);
            const newImageDataURL = canvas.toDataURL('image/png');
            setProcessedImage(newImageDataURL);
            setCroppedImage(newImageDataURL);
            
            lastProcessedImageData.current = {
                 dataURL: newImageDataURL,
                width: canvas.width,
                 height: canvas.height,
                aspectRatio: canvas.width / canvas.height,
                 backgroundColor: color
            };
            setProcessingMessage('Processing complete');
             setShowSuccessMessage(true);
           setTimeout(() => {
                setShowSuccessMessage(false);
            }, 3000);
         } catch (error: any) {
            console.error('Background change error:', error);
            setProcessingMessage('Background change error.');
        } finally {
            setIsProcessing(false);
         }
    }, [image]);

   const memoizedIntelligentCrop = useMemo(() => intelligentCrop, [intelligentCrop]);
    useEffect(() => {
         console.log('Image state changed:', {
             image,
             imageRefCurrent: imageRef.current,
             imageRefSrc: imageRef.current?.src
         });

        if (image) {
            try {
                 const img = imageRef.current;
                if (!img) {
                     console.warn('Image element not initialized');
                     return;
                }
                img.src = image;
                img.onload = () => {
                    if (cropperRef.current?.cropper) {
                         const autoCropData = memoizedIntelligentCrop(img, selectedAspectRatio, scaleRef.current.scaleX, scaleRef.current.scaleY);
                          if (process.env.NODE_ENV !== 'production') {
                              console.log('Auto crop data in useEffect:', autoCropData);
                          }
                        const scaledCropData = {
                           left: autoCropData.left * scaleRef.current.scaleX,
                            top: autoCropData.top * scaleRef.current.scaleY,
                            width: autoCropData.width * scaleRef.current.scaleX,
                            height: autoCropData.height * scaleRef.current.scaleY
                         };
                        if (process.env.NODE_ENV !== 'production') {
                            console.log('Scaled Crop Data in useEffect:', scaledCropData);
                        }
                        cropperRef.current.cropper.setCropBoxData(scaledCropData);
                       if (process.env.NODE_ENV !== 'production') {
                           console.log('Cropper Box Data after setCropBoxData in useEffect:', cropperRef.current.cropper.getCropBoxData());
                       }
                    }
                };

                img.onerror = (error) => {
                   console.error('Image load error:', error);
                    setProcessingMessage('Failed to load image.');
                   setTimeout(() => {
                        setProcessingMessage('');
                    }, 3000);
                   setImage(null);
                    setProcessedImage(null);
                   setCroppedImage(null);
                   setCorrectionImage(null);
                };
           } catch (error) {
                console.error('Image processing error:', error);
                setProcessingMessage('Failed to process image.');
                 setTimeout(() => {
                   setProcessingMessage('');
                }, 3000);
                setImage(null);
                setProcessedImage(null);
                 setCroppedImage(null);
                setCorrectionImage(null);
            }
        }
    }, [image, memoizedIntelligentCrop, selectedAspectRatio]);


    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="app">
                <header className="header">
                    <h1>ID Photo Generator</h1>
                    <p>Create professional ID photos with automatic background removal</p>
                </header>
               <div className="process-steps">
                    <div className={`process-step ${image ? 'completed' : 'active'}`}>
                        <div className="process-step-icon">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div className="process-step-label">Upload</div>
                    </div>
                    <div className={`process-step ${croppedImage ? 'completed' : (image ? 'active' : '')}`}>
                        <div className="process-step-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                           </svg>
                        </div>
                        <div className="process-step-label">Crop</div>
                    </div>
                   <div className={`process-step ${backgroundColor !== '#ffffff' ? 'completed' : (croppedImage ? 'active' : '')}`}>
                        <div className="process-step-icon">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                 <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                       </div>
                       <div className="process-step-label">Background</div>
                   </div>
                    <div className={`process-step ${croppedImage && backgroundColor !== '#ffffff' ? 'completed' : ''}`}>
                        <div className="process-step-icon">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                           </svg>
                        </div>
                        <div className="process-step-label">Download</div>
                    </div>
                </div>
                <div className="upload-section">
                    <div className="file-input-wrapper">
                        <input
                           type="file"
                            accept="image/*"
                           onChange={memoizedHandleImageUpload}
                            className="file-input"
                           disabled={isProcessing}
                        />
                       <button className={`upload-button ${isProcessing ? 'disabled' : ''} ${isProcessing ? 'loading-button' : ''}`}>
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                           </svg>
                           {isProcessing ? 'Processing' : 'Upload photo'}
                        </button>
                    </div>
                    {showSuccessMessage && (
                        <div className="success-message">
                            Image uploaded successfully!
                       </div>
                   )}
                </div>
                {image && (
                    <div className="aspect-ratio-selector">
                        <h3>Select Aspect Ratio</h3>
                        <select
                           value={selectedAspectRatio}
                            onChange={handleAspectRatioChange}
                           className="aspect-ratio-dropdown"
                       >
                           {aspectRatioOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                           ))}
                       </select>
                    </div>
               )}
               {image && (
                   <div className="editor-container">
                       <div className={`processing-overlay ${isProcessing ? 'visible' : ''}`}>
                           <div className="loading-spinner">
                                <div className="spinner-circle"></div>
                                <div className="spinner-text">{processingMessage}</div>
                            </div>
                       </div>
                       <div className="cropper-section">
                           <React.Suspense fallback={<div>Loading Cropper...</div>}>
                                <CropperComponent
                                    key={cropperKey}
                                    src={image}
                                    aspectRatio={selectedAspectRatio}
                                    guides={true}
                                    ref={cropperRef}
                                   zoomable={false}
                                   zoomOnWheel={false}
                                   crop={handleCropChange}
                                   minCropBoxWidth={100}
                                   minCropBoxHeight={100}
                                  autoCropArea={1}
                                   viewMode={1}
                                />
                           </React.Suspense>
                       </div>
                       <div className="correction-section" data-label="Correction">
                            {correctionImage && (
                                <div className="image-container">
                                   <img
                                        src={correctionImage}
                                       alt="Correction image"
                                        className="image-base"
                                        style={{ display: isProcessing && !correctionImage ? 'none' : 'block' }}
                                  />


                                    <div className="image-overlay">
                                        <img
                                            src={outline.src}  // 直接使用 .src 获取图片路径
                                            alt="Outline"
                                            style={{ 
                                                opacity: 0.5,
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain', // 添加这个属性
                                            }}
                                        />
                                    </div>


                               </div>
                            )}
                       </div>
                        {(croppedImage || processedImage || image) && (
                            <div className="preview-section" data-label="Preview">
                                <div className="image-container">
                                   <img
                                        key={imageKey}
                                        src={croppedImage || processedImage || image}
                                        alt="Processed image"
                                        onError={(e) => {
                                            e.target.src = '';
                                        }}
                                       className="image-base"
                                        style={{
                                            display: isProcessing && !(croppedImage || processedImage || image) ? 'none' : 'block',
                                        }}
                                       loading="lazy"
                                   />
                               </div>
                            </div>
                        )}
                    </div>
               )}
                 {croppedImage && (
                    <div className="background-selector">
                       <h3>Select background color</h3>
                       <div className="color-buttons">
                           {presetColors.map((color) => (
                               <button
                                    key={color.value}
                                   className={`color-button ${backgroundColor === color.value ? 'selected' : ''}`}
                                    data-color={color.name}
                                   style={{
                                       backgroundColor: color.value,
                                        color: color.name.startsWith('Light') || color.name === 'White' ? 'black' : 'white',
                                   }}
                                    onClick={() => handleBackgroundChange(color.value)}
                                    disabled={isProcessing}
                                >
                                    {color.name}
                                </button>
                           ))}
                       </div>
                    </div>
               )}
                {croppedImage && (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                       <button
                            onClick={handleDownload}
                           className={`button button-primary ${isProcessing ? 'loading-button' : ''}`}
                            disabled={isProcessing}
                       >
                           <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ marginRight: '0.5rem' }}
                           >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                           </svg>
                            Download photo
                        </button>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
