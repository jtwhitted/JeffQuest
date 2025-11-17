
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReactPlayer from 'react-player/youtube';
import type { YoutubeVideo } from '@/lib/types';
import { useEffect, useState } from 'react';

interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: YoutubeVideo | null;
}

export function VideoPlayerDialog({ open, onOpenChange, video }: VideoPlayerDialogProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!video || !isClient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{video.title}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video">
          <ReactPlayer
            url={`https://www.youtube.com/${video.id}`}
            width="100%"
            height="100%"
            controls
            playing
            className="absolute top-0 left-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
