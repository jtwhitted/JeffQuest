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
import { Loader2, Camera, AlertTriangle, RefreshCw } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AvatarCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarCaptured: (imageDataUrl: string) => void;
}

export function AvatarCaptureDialog({
  open,
  onOpenChange,
  onAvatarCaptured,
}: AvatarCaptureDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function setupCamera() {
      if (!open) return;
      setHasCameraPermission(undefined);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
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
      if (context) {
        // Flip the image horizontally for a mirror effect
        context.translate(video.videoWidth, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        // Flip back
        context.setTransform(1, 0, 0, 1, 0, 0);
      }
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
    }
  }, []);

  const handleConfirm = () => {
    if (capturedImage) {
      onAvatarCaptured(capturedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    onOpenChange(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        handleClose();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Capture Avatar</DialogTitle>
          <DialogDescription>
            Center your face in the frame and take a picture.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover scale-x-[-1] ${capturedImage || !hasCameraPermission ? 'hidden' : 'block'}`}
            autoPlay
            playsInline
            muted
          />

          {hasCameraPermission === undefined && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="mb-2 h-8 w-8 animate-spin" />
              <p>Requesting camera access...</p>
            </div>
          )}

          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                  Please grant camera permissions in your browser settings.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {capturedImage && (
            <img src={capturedImage} alt="Captured avatar" className="h-full w-full object-cover" />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
        
        <DialogFooter className="gap-2 sm:justify-between">
          {!capturedImage ? (
            <Button
              onClick={handleCapture}
              disabled={!hasCameraPermission}
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
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Use this Photo
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
