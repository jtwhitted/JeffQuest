
'use client';

import { useState } from 'react';
import type { Game } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, UploadCloud } from 'lucide-react';
import { useGames } from '@/context/game-context';

interface RulebookEditorProps {
    game: Game;
}

export function RulebookEditor({ game }: RulebookEditorProps) {
    const { toast } = useToast();
    const { updateGame } = useGames();
    const [isSaving, setIsSaving] = useState(false);
    const [fileName, setFileName] = useState<string | null>(game.rulebookText ? 'rulebook.txt' : null);

    const handleSave = async () => {
        // This function is now a placeholder as we can't save rulebook text from a file yet.
        setIsSaving(true);
        try {
            // In a real implementation, we would process a file here.
            // For now, we'll just show a success message if a file was "uploaded".
            if (fileName) {
                 toast({
                    title: 'Rulebook Saved!',
                    description: 'The rulebook has been updated.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'No file selected',
                    description: 'Please choose a rulebook file to upload.',
                });
            }
           
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error Saving Rulebook',
                description: error.message || 'Could not save the rulebook.',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // NOTE: We are only storing the file name for UI purposes.
            // The actual file content is not being processed or stored.
            setFileName(file.name);
            // We would need a server action to handle the upload & text extraction here.
            toast({
                title: "File Selected",
                description: `${file.name}. Click 'Save Rulebook' to confirm (simulation).`,
            })
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Rulebook Editor</CardTitle>
                <CardDescription>
                    Upload the game's rulebook here. This will enable the AI to answer rules questions in the future.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center">
                    <UploadCloud className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">
                        Drag and drop a PDF file here, or click to select a file.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                        (File upload is for demonstration only)
                    </p>
                    <input
                        type="file"
                        accept="application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                    />
                </div>
                 {fileName && (
                    <div className="text-sm font-medium text-center">
                        Selected file: <span className="text-primary">{fileName}</span>
                    </div>
                )}
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving || !fileName}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Rulebook
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

