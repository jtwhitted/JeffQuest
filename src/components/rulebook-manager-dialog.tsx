
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
import { Loader2, UploadCloud, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleRulebookUpload, deleteRulebookDocument } from '@/lib/actions';
import { Game } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useGames } from '@/context/game-context';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface RulebookManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game;
}

export function RulebookManagerDialog({ game, open, onOpenChange }: RulebookManagerDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const { updateGame } = useGames();

  const handleFileSelect = (selectedFile: File | null | undefined) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      if (!documentName) {
        // Pre-fill name based on filename, removing .pdf
        setDocumentName(selectedFile.name.replace(/\.pdf$/i, ''));
      }
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
      toast({ title: 'No file selected', variant: 'destructive' });
      return;
    }
     if (!documentName.trim()) {
      toast({ title: 'Document name is required', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        try {
            const pdfDataUri = reader.result as string;
            const updatedGame = await handleRulebookUpload(game.id, documentName, pdfDataUri);
            updateGame(updatedGame.id, { documents: updatedGame.documents });
            toast({
                title: 'Upload Successful',
                description: `"${documentName}" has been added.`,
            });
            setFile(null);
            setDocumentName('');
        } catch (error: any) {
             toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = () => {
        toast({ title: 'File Read Error', variant: 'destructive' });
        setIsUploading(false);
    };
  };

  const handleDelete = async (documentId: string) => {
    setIsDeleting(documentId);
    try {
        const updatedGame = await deleteRulebookDocument(game.id, documentId);
        updateGame(updatedGame.id, { documents: updatedGame.documents });
        toast({ title: 'Document Deleted' });
    } catch (error: any) {
        toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsDeleting(null);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDocumentName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Manage Rulebooks</DialogTitle>
                <DialogDescription>
                    Upload or remove rulebooks, errata, and other documents for {game.name}.
                </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
                <h3 className="font-semibold text-sm">Uploaded Documents</h3>
                {game.documents && game.documents.length > 0 ? (
                    <ScrollArea className="h-32 rounded-md border">
                        <div className="p-4 space-y-2">
                        {game.documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground"/>
                                    <span className="text-sm">{doc.name}</span>
                                </div>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                    onClick={() => handleDelete(doc.id)}
                                    disabled={isDeleting === doc.id}
                                >
                                   {isDeleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive"/>} 
                                   <span className="sr-only">Delete document</span>
                                </Button>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">No documents uploaded yet.</p>
                )}
            </div>

            <Separator />
            
            <div className="space-y-4">
                <h3 className="font-semibold text-sm pt-2">Upload New Document</h3>
                <Input
                    id="doc-name"
                    placeholder="Document Name (e.g., Core Rules, FAQ)"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    disabled={isUploading}
                    className="col-span-3"
                />
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
                <Button variant="ghost" onClick={handleClose}>Done</Button>
                <Button onClick={handleUpload} disabled={isUploading || !file || !documentName.trim()}>
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUploading ? 'Processing...' : 'Upload & Parse'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
