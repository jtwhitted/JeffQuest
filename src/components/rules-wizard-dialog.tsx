
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mic, Sparkles, Square } from 'lucide-react';
import React, { useState, useRef } from 'react';
import type { Game } from '@/lib/types';
import { askRulebook } from '@/ai/flows/ask-rulebook';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface RulesWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: Game;
}

export function RulesWizardDialog({ open, onOpenChange, game }: RulesWizardDialogProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleAsk = async () => {
    if (!query.trim()) {
      toast({ variant: 'destructive', title: 'Please enter a question.' });
      return;
    }
    setIsAsking(true);
    setAnswer('');
    try {
      const result = await askRulebook({ rulebookText: game.rulebookText || '', query });
      setAnswer(result.answer);
    } catch (error: any) {
      console.error('Error asking rulebook:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not get an answer from the Rules Wizard.',
      });
    } finally {
      setIsAsking(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          
          setIsTranscribing(true);

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            if (base64Audio) {
              try {
                const { text } = await transcribeAudio({ audioDataUri: base64Audio });
                setQuery(text);
                toast({ title: 'Question transcribed!', description: 'You can now ask the wizard.' });
              } catch (error: any) {
                console.error('Transcription error:', error);
                toast({ variant: 'destructive', title: 'Transcription Failed', description: error.message });
              } finally {
                setIsTranscribing(false);
              }
            }
          };
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        toast({ variant: 'destructive', title: 'Microphone Error', description: 'Could not access the microphone.' });
      }
    }
  };


  const handleClose = () => {
    setQuery('');
    setAnswer('');
    setIsAsking(false);
    onOpenChange(false);
  };

  const getButtonState = () => {
    if (isRecording) return { text: 'Stop', icon: Square, variant: 'destructive' as const, disabled: false };
    if (isTranscribing) return { text: 'Transcribing...', icon: Loader2, variant: 'outline' as const, disabled: true };
    return { text: 'Record Question', icon: Mic, variant: 'outline' as const, disabled: false };
  }

  const buttonState = getButtonState();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rules Wizard</DialogTitle>
          <DialogDescription>
            Ask a question about the rules for {game.name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
                <Input 
                    placeholder="e.g., 'How does movement work?'" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isAsking || isRecording || isTranscribing}
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                />
                 <Button
                    type="button"
                    variant={buttonState.variant}
                    size="icon"
                    onClick={handleToggleRecording}
                    disabled={buttonState.disabled || isAsking}
                    aria-label={buttonState.text}
                >
                    <buttonState.icon className={cn("h-4 w-4", isTranscribing && "animate-spin")} />
                </Button>
            </div>
            
             <Button onClick={handleAsk} disabled={isAsking || !query.trim() || isRecording || isTranscribing} className="w-full">
              {isAsking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isAsking ? 'Thinking...' : 'Ask Wizard'}
            </Button>

            {answer && (
                <div className="pt-4">
                    <h3 className="font-semibold mb-2">Answer:</h3>
                    <ScrollArea className="h-48 rounded-md border p-4 text-sm bg-secondary/50">
                        <p className="whitespace-pre-wrap">{answer}</p>
                    </ScrollArea>
                </div>
            )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
