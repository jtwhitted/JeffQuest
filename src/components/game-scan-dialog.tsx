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
import { Loader2, Camera, AlertTriangle } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getGameTitleFromImage } from '@/ai/flows/get-game-title-from-image';

interface GameScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTitleScanned: (title: string) => void;
}

export function GameScanDialog({
  open,
  onOpenChange,
  onTitleScanned,
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
    async function getCameraPermission() {
      if (!open || hasCameraPermission) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    }
    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open, hasCameraPermission]);

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
    }
  }, []);

  const handleConfirm = async () => {
    if (!capturedImage) return;

    setIsLoading(true);
    try {
      const result = await getGameTitleFromImage({ photoDataUri: capturedImage });
      onTitleScanned(result.title);
      toast({
        title: 'Title Identified!',
        description: `Found title: ${result.title}`,
      });
      handleClose();
    } catch (error) {
      console.error('Error identifying game title:', error);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not identify a game title from the image.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    setCapturedImage(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Scan Game Box</DialogTitle>
          <DialogDescription>
            Center the game box cover in the frame and capture an image.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          {hasCameraPermission === undefined && (
            <div className="flex h-full flex-col items-center justify-center">
              <Loader2 className="mb-2 h-8 w-8 animate-spin" />
              <p>Requesting camera access...</p>
            </div>
          )}

          {hasCameraPermission === false && (
            <div className="flex h-full flex-col items-center justify-center p-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                  Please grant camera permissions in your browser settings to use
                  this feature.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {hasCameraPermission && !capturedImage && (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted
            />
          )}

          {capturedImage && (
            <img src={capturedImage} alt="Captured game box" className="h-full w-full object-cover" />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
        
        <DialogFooter className="gap-2 sm:justify-between">
          {!capturedImage ? (
            <Button
              onClick={handleCapture}
              disabled={!hasCameraPermission || isLoading}
              className="w-full"
            >
              <Camera className="mr-2 h-4 w-4" />
              Capture
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setCapturedImage(null)}
                disabled={isLoading}
              >
                Retake
              </Button>
              <Button onClick={handleConfirm} disabled={isLoading} className="flex-1">
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm Title
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
