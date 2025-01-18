'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import 'cropperjs/dist/cropper.css';
import './globals.css';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';
import outline from '../../public/outline.png';
import type { CropperRef, AspectRatioOption, ColorOption, ImageInfo, CropData, ScaleFactors } from '@/types';
import { imageProcessor } from '../utils/imageProcessor';
import { aspectRatioOptions, presetColors } from '../constants';
import { intelligentCrop } from '../utils/intelligentCrop';

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
    const [isScaleInitialized, setIsScaleInitialized] = useState(false);
    const isDevelopmentMode = process.env.NODE_ENV !== 'production';
    const [isCropperReady, setIsCropperReady] = useState(false);
    const [cropperCanvasScale, setCropperCanvasScale] = useState({ scaleX: 1, scaleY: 1 });

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


    const [selectedAspectRatio, setSelectedAspectRatio] = useState<number>(3 / 4);

     const handleAspectRatioChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const newAspectRatio = parseFloat(event.target.value);
        setSelectedAspectRatio(newAspectRatio);
        setCropperKey(prevKey => prevKey + 1);


        // 保持原有的 correctionImage 和 croppedImage
        const currentCorrectionImage = correctionImage;
        const currentCroppedImage = croppedImage;


        if (imageRef.current?.src && isScaleInitialized && isCropperReady) {
           setTimeout(() => {
                if (cropperRef.current?.cropper) {
                    const img = imageRef.current;
                    if (!img) return;
                     if (isDevelopmentMode) {
                        console.log('Cropper Data before intelligentCrop (handleAspectRatioChange):', {
                            imageData: cropperRef.current.cropper.getImageData(),
                            canvasData: cropperRef.current.cropper.getCanvasData(),
                           scaleRef: scaleRef.current
                        });
                    }
                    const autoCropData = intelligentCrop(
                        img,
                         newAspectRatio,
                        scaleRef.current.scaleX,
                        scaleRef.current.scaleY,
                        canvasRef.current,
                        isDevelopmentMode
                    );

                   const canvasData = cropperRef.current.cropper.getCanvasData();


                   const scaledCropData = {
                       left: autoCropData.left * (canvasData.width /  img.naturalWidth),
                        top: autoCropData.top * (canvasData.height / img.naturalHeight),
                        width: autoCropData.width *  (canvasData.width /  img.naturalWidth),
                        height: autoCropData.height * (canvasData.height / img.naturalHeight),
                    };

                   cropperRef.current.cropper.setCropBoxData(scaledCropData);


                    // 恢复之前的图像
                    if (currentCorrectionImage) {
                        setCorrectionImage(currentCorrectionImage);
                    }
                    if (currentCroppedImage) {
                        setCroppedImage(currentCroppedImage);
                    }
                     if (isDevelopmentMode) {
                        console.log('Cropper Box Data after setCropBoxData in handleAspectRatioChange:', cropperRef.current.cropper.getCropBoxData());
                    }
                }
            }, 100);
        }
    }, [image, isDevelopmentMode, isScaleInitialized, selectedAspectRatio, correctionImage, croppedImage,isCropperReady]);


    const memoizedHandleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
    
         try {
             await imageProcessor({
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
             setIsCropperReady
           });
        } catch (error) {
            console.error('Image processing error:', error);
           setIsProcessing(false);
            setProcessingMessage('Image processing failed');
            
            // 重置所有相关状态
            setImage(null);
            setProcessedImage(null);
            setCroppedImage(null);
            setCorrectionImage(null);
             setIsCropperReady(false)
        }
    }, [imageProcessor,selectedAspectRatio,isDevelopmentMode]);

    const handleCropChange = useCallback(() => {
        if (!cropperRef.current?.cropper || !image) {
            console.warn('Cropper or image not ready for crop change');
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

                ctx.fillStyle = lastProcessedImageData?.current?.backgroundColor || backgroundColor;
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

            if(lastProcessedImageData.current){
               lastProcessedImageData.current = {
                     ...lastProcessedImageData.current,
                     dataURL: newImageDataURL,
                      width: canvas.width,
                     height: canvas.height,
                    aspectRatio: canvas.width / canvas.height,
                     backgroundColor: color
              };
            }

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


    useEffect(() => {
        if (isDevelopmentMode) {
            console.log('Image state changed:', {
                image,
                 imageRefCurrent: imageRef.current,
                imageRefSrc: imageRef.current?.src
            });
        }

       if (image && isScaleInitialized && isCropperReady) {
            try {
                 const img = imageRef.current;
                if (!img) {
                     console.warn('Image element not initialized');
                     return;
                }
                img.src = image;
               img.onload = () => {
                 setTimeout(()=>{
                        if (cropperRef.current?.cropper) {
                           if (isDevelopmentMode) {
                               console.log('Cropper Data before intelligentCrop (useEffect):', {
                                  imageData: cropperRef.current.cropper.getImageData(),
                                 canvasData: cropperRef.current.cropper.getCanvasData(),
                                  scaleRef: scaleRef.current
                               });
                           }
                            const autoCropData = intelligentCrop(
                                 img,
                                 selectedAspectRatio,
                                 scaleRef.current.scaleX,
                                 scaleRef.current.scaleY,
                                canvasRef.current,
                                isDevelopmentMode
                           );
                           
                           const canvasData = cropperRef.current.cropper.getCanvasData();

                            const scaledCropData = {
                                left: autoCropData.left * (canvasData.width /  img.naturalWidth),
                                top: autoCropData.top * (canvasData.height / img.naturalHeight),
                                width: autoCropData.width *  (canvasData.width /  img.naturalWidth),
                                height: autoCropData.height * (canvasData.height / img.naturalHeight),
                             };
                            cropperRef.current.cropper.setCropBoxData(scaledCropData);
                           
                            if (isDevelopmentMode) {
                               console.log('Cropper Box Data after setCropBoxData in useEffect:', cropperRef.current.cropper.getCropBoxData());
                           }
                       }
                   },100)

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
                   setIsCropperReady(false)
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
                setIsCropperReady(false)
           }
       }
    }, [image, isScaleInitialized,selectedAspectRatio,isDevelopmentMode,isCropperReady]);

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
                                    onInitialized={() => {
                                          setIsCropperReady(true);
                                         if (cropperRef.current?.cropper && isDevelopmentMode) {
                                            console.log('Cropper Initialized:', {
                                                imageData: cropperRef.current.cropper.getImageData(),
                                                canvasData: cropperRef.current.cropper.getCanvasData(),
                                                cropBoxData: cropperRef.current.cropper.getCropBoxData(),
                                                 scaleRef: scaleRef.current
                                            });
                                            
                                            const canvasData = cropperRef.current.cropper.getCanvasData();
                                                if(imageRef.current){
                                                   setCropperCanvasScale({
                                                        scaleX: canvasData.width / imageRef.current.naturalWidth,
                                                        scaleY: canvasData.height / imageRef.current.naturalHeight,
                                                     })
                                                }
                                        }
                                    }}
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
                                                objectFit: 'fill', // 添加这个属性
                                                objectPosition: 'center',
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
