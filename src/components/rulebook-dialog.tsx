
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleRulebookUpload } from '@/lib/actions';
import { Game } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useGames } from '@/context/game-context';

interface RulebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game;
}

export function RulebookDialog({ game, open, onOpenChange }: RulebookDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const { updateGame } = useGames();

  const handleFileSelect = (selectedFile: File | null | undefined) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      setFile(null);
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please select a PDF file.',
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files?.[0]);
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please choose a PDF file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        try {
            const pdfDataUri = reader.result as string;
            const updatedGame = await handleRulebookUpload(game.id, pdfDataUri);
            updateGame(updatedGame.id, { rulebookText: updatedGame.rulebookText });
            toast({
                title: 'Upload Successful',
                description: 'Rulebook uploaded and parsed. The Rules Wizard is now available!',
            });
            setFile(null);
            onOpenChange(false); // Close dialog on success
        } catch (error: any) {
             console.error('Failed to upload rulebook:', error);
             toast({
                title: 'Upload Failed',
                description: error.message || 'Could not process the rulebook.',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = (error) => {
        console.error('FileReader error during rulebook read:', error);
        toast({
            title: 'File Read Error',
            description: 'Could not read the selected file.',
            variant: 'destructive',
        });
        setIsUploading(false);
    };
  };

  const handleClose = () => {
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Upload Rulebook</DialogTitle>
            <DialogDescription>
                Upload a PDF of the game's rulebook to enable AI rule assistance.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div 
                className={cn(
                  "flex flex-col items-center justify-center space-y-2 rounded-lg border-2 border-dashed border-muted p-6 text-center transition-colors",
                  isDragging && "border-primary bg-accent"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
               >
                  <UploadCloud className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                      {file ? `Selected: ${file.name}` : 'Drag & drop a PDF or click to browse'}
                  </p>
                  <Input
                      id="rulebook-upload"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isUploading}
                  />
                  <label htmlFor="rulebook-upload" className="cursor-pointer">
                      <div className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          Browse Files
                      </div>
                  </label>
              </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleUpload} disabled={isUploading || !file}>
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUploading ? 'Processing...' : 'Upload & Parse'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

    