
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
import { getBggDetailsAction, searchBggAction } from '@/lib/actions';
import { useGames } from '@/context/game-context';
import type { Game } from '@/lib/types';
import { selectGameFromImages } from '@/ai/flows/select-game-from-images';


interface GameScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameAdded: (results: Partial<Game>[], query: string) => void;
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
      const { title } = await getGameTitleFromImage({ photoDataUri: originalPhotoDataUri });

      setLoadingMessage(`Searching BGG for "${title}"...`);
      const searchResults = await searchBggAction(title);
      
      if (!searchResults || searchResults.length === 0) {
        onGameAdded([], title); // No text matches found, trigger manual add
        return;
      }
      
      const candidatesWithImages = searchResults.filter(r => r.imageUrl);

      if (candidatesWithImages.length === 0) {
        onGameAdded(searchResults, title);
        return;
      }

      setLoadingMessage('Visually matching box art...');
      const { bestMatchBggId } = await selectGameFromImages({
        originalPhotoDataUri,
        candidates: candidatesWithImages.map(c => ({
          bggId: c.id!,
          name: c.name!,
          imageUrl: c.imageUrl!,
        })),
      });

      const bestMatch = searchResults.find(r => r.id === bestMatchBggId);

      if (!bestMatch || !bestMatch.id) {
         onGameAdded(searchResults, title);
         return;
      }

      // We have a confident visual match, fetch full details and add it.
      setLoadingMessage(`Adding "${bestMatch.name}"...`);
      const fullDetailsList = await getBggDetailsAction(bestMatch.id);
      if (fullDetailsList.length === 0 || !fullDetailsList[0].name) {
          throw new Error(`Could not fetch details for ${bestMatch.name} from BGG.`);
      }
      const gameDetails = fullDetailsList[0];

      await addGame({
          name: gameDetails.name!,
          bggId: gameDetails.id,
          description: gameDetails.description,
          yearPublished: gameDetails.yearPublished,
          minPlayers: gameDetails.minPlayers,
          maxPlayers: gameDetails.maxPlayers,
          minPlaytime: gameDetails.minPlaytime,
          maxPlaytime: gameDetails.maxPlaytime,
          difficulty: gameDetails.difficulty,
          category: gameDetails.category,
          mechanics: gameDetails.mechanics,
          designers: gameDetails.designers,
          publishers: gameDetails.publishers,
          imageUrl: gameDetails.imageUrl,
      });

      toast({
          title: 'Game Added!',
          description: `${bestMatch.name} has been added to your collection.`,
      });
      onOpenChange(false);
      onGameAdded([], 'SUCCESS');

    } catch (error: any) {
      console.error('Error during scan and search process:', error);
      toast({
        variant: 'destructive',
        title: 'Error Scanning Game',
        description: error.message || 'Could not identify or find the game.',
      });
      onGameAdded([], ''); // Fallback to allow manual add
    } finally {
      setIsLoading(false);
    }
  }, [onOpenChange, toast, onGameAdded, addGame]);
  
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Game Box</DialogTitle>
          <DialogDescription>
            Point your camera at a board game box. Make sure the title is
            clear.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {renderVideoState()}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        
        <DialogFooter>
          <Button
            onClick={handleCaptureAndSearch}
            disabled={!hasCameraPermission || isLoading}
            className="w-full"
          >
            <Camera className="mr-2 h-4 w-4" />
            {isLoading ? 'Scanning...' : 'Scan & Search'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
