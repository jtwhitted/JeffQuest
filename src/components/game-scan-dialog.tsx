
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, AlertTriangle, RefreshCw } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getGameTitleFromImage, type GetGameTitleOutput } from '@/ai/flows/get-game-title-from-image';

interface GameScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetailsScanned: (details: GetGameTitleOutput) => void;
}

export function GameScanDialog({
  open,
  onOpenChange,
  onDetailsScanned,
}: GameScanDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function setupCamera() {
      if (!open) return;
      setHasCameraPermission(undefined);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [open, toast]);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      
      // Automatically trigger confirm after capture
      handleConfirm(dataUrl);
    }
  }, []);

  const handleConfirm = async (imageToProcess: string | null) => {
    if (!imageToProcess) return;

    setIsLoading(true);
    try {
      const result = await getGameTitleFromImage({ photoDataUri: imageToProcess });
      onDetailsScanned(result);
      handleClose();
    } catch (error) {
      console.error('Error identifying game title:', error);
      toast({
        variant: 'destructive',
        title: 'Error Identifying Game',
        description: 'Could not get game title from the image. Please try again.',
      });
    } finally {
      setIsLoading(false);
      // Reset image for retake if needed
      setCapturedImage(null);
    }
  };
  
  const handleClose = () => {
    setCapturedImage(null);
    onOpenChange(false);
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        handleClose();
    }
    onOpenChange(isOpen);
  }

  const renderVideoState = () => {
    if (isLoading) {
       return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
          <Loader2 className="mb-2 h-8 w-8 animate-spin" />
          <p>Analyzing Image...</p>
        </div>
      );
    }

    if (hasCameraPermission === undefined) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin" />
          <p>Requesting camera access...</p>
        </div>
      );
    }

    if (hasCameraPermission === false) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Camera Access Denied</AlertTitle>
            <AlertDescription>
              Please grant camera permissions in your browser settings.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Scan Game Box</DialogTitle>
          <DialogDescription>
            Center the game box cover in the frame to automatically capture the title.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover ${!hasCameraPermission ? 'hidden' : 'block'}`}
            autoPlay
            playsInline
            muted
          />

          {renderVideoState()}

          <canvas ref={canvasRef} className="hidden" />
        </div>
        
        <DialogFooter className="gap-2 sm:justify-between">
            <Button
              onClick={handleCapture}
              disabled={!hasCameraPermission || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              Capture
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
