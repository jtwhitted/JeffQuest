
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleRulebookUpload } from '@/lib/actions';
import { Game } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

interface RulebookEditorProps {
  game: Game;
}

export function RulebookEditor({ game }: RulebookEditorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

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
    
    // Read file as Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        try {
            const pdfDataUri = reader.result as string;
            const result = await handleRulebookUpload(game.id, pdfDataUri);
            toast({
                title: 'Upload Successful',
                description: result.message,
            });
            setFile(null);
        } catch (error: any) {
             toast({
                title: 'Upload Failed',
                description: error.message || 'Could not process the rulebook.',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = () => {
        toast({
            title: 'File Read Error',
            description: 'Could not read the selected file.',
            variant: 'destructive',
        });
        setIsUploading(false);
    };
  };

  return (
    <Card>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="rulebook-editor" className="border-b-0">
          <AccordionTrigger className="p-6 hover:no-underline">
              <div className="text-left">
                <CardTitle>Rulebook Editor</CardTitle>
                <CardDescription className="mt-1.5">
                  Upload a PDF of the game's rulebook to enable AI rule assistance.
                </CardDescription>
              </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
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
              
              <Button onClick={handleUpload} disabled={isUploading || !file} className="w-full">
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? 'Processing...' : 'Upload & Parse'}
              </Button>

              {game.rulebookText && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="rulebook-text">
                    <AccordionTrigger>
                      <div className='flex items-center gap-2'>
                          <FileText className="h-4 w-4" />
                          View Current Rulebook Text
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-48 rounded-md border p-4 text-sm text-muted-foreground">
                          <pre className="whitespace-pre-wrap font-sans">{game.rulebookText}</pre>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
