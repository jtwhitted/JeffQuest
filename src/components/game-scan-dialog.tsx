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
import { searchBggAction, getBggDetailsAction } from '@/lib/actions';
import { selectGameFromImages } from '@/ai/flows/select-game-from-images';
import { useGames } from '@/context/game-context';

type SearchResult = { id: string; name: string };

interface GameScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameAdded: () => void;
}

export function GameScanDialog({
  open,
  onOpenChange,
  onGameAdded,
}: GameScanDialogProps) {
  const { toast } = useToast();
  const { addGame } = useGames();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing Image...');

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

  const handleAddGameById = useCallback(async (bggId: string, name: string) => {
    try {
      setLoadingMessage(`Adding ${name} to your collection...`);
      setIsLoading(true);
      await addGame({ bggId, name });
      toast({
        title: 'Game Added!',
        description: `${name} has been added to your collection.`,
      });
      onGameAdded();
    } catch (e: any) {
      console.error("Error adding game by ID", e);
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Could not add the game.' });
    } finally {
      setIsLoading(false);
    }
  }, [addGame, onGameAdded, toast]);


  const handleCaptureAndSearch = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const originalPhotoDataUri = canvas.toDataURL('image/jpeg');
    
    setIsLoading(true);
    try {
      setLoadingMessage('Identifying game from image...');
      const { title, photoDataUri } = await getGameTitleFromImage({ photoDataUri: originalPhotoDataUri });

      setLoadingMessage(`Searching BGG for "${title}"...`);
      const searchResults = await searchBggAction(title);
      
      if (searchResults.length === 0) {
        toast({ variant: 'destructive', title: 'Game Not Found', description: `No BGG matches found for "${title}".` });
        return;
      }

      if (searchResults.length === 1) {
        await handleAddGameById(searchResults[0].id, searchResults[0].name);
        return;
      }

      // Multiple results - time for visual AI matching!
      setLoadingMessage('Multiple results found. Fetching box art...');
      const candidateIds = searchResults.slice(0, 5).map(r => r.id); // Limit to 5 candidates to be safe
      const candidatesDetails = await getBggDetailsAction(candidateIds.join(','));

      const validCandidates = candidatesDetails.filter(c => c.imageUrl);

      if (validCandidates.length <= 1) {
        // If we can't get enough images, fall back to adding the first result
        await handleAddGameById(searchResults[0].id, searchResults[0].name);
        return;
      }
      
      setLoadingMessage('Visually analyzing box art to find the best match...');
      const { bestMatchBggId } = await selectGameFromImages({
        originalPhotoDataUri: photoDataUri,
        candidates: validCandidates.map(c => ({
          bggId: c.id!, // The action will populate this
          name: c.name,
          imageUrl: c.imageUrl!
        }))
      });

      const bestMatch = candidatesDetails.find(c => c.id === bestMatchBggId);
      if (bestMatch) {
        await handleAddGameById(bestMatch.id!, bestMatch.name);
      } else {
        // Fallback if AI fails to return a valid ID
        await handleAddGameById(searchResults[0].id, searchResults[0].name);
      }
      
    } catch (error: any) {
      console.error('Error during scan and search process:', error);
      toast({
        variant: 'destructive',
        title: 'Error Scanning Game',
        description: error.message || 'Could not identify or find the game.',
      });
    } finally {
      setIsLoading(false);
      onOpenChange(false); // Close dialog on completion
    }
  }, [onOpenChange, toast, handleAddGameById]);
  
  const handleClose = () => {
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4 text-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin" />
          <p>{loadingMessage}</p>
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
            Center the game box cover in the frame to identify it.
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
              onClick={handleCaptureAndSearch}
              disabled={!hasCameraPermission || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              Capture and Identify
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
