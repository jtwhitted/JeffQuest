
'use client';

import { useState } from 'react';
import type { Game } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { useGames } from '@/context/game-context';

interface RulebookEditorProps {
    game: Game;
}

export function RulebookEditor({ game }: RulebookEditorProps) {
    const { toast } = useToast();
    const { updateGame } = useGames();
    const [rulebookText, setRulebookText] = useState(game.rulebookText || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateGame(game.id, { rulebookText });
            toast({
                title: 'Rulebook Saved!',
                description: 'The rulebook has been updated.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error Saving Rulebook',
                description: error.message || 'Could not save the rulebook text.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Rulebook Editor</CardTitle>
                <CardDescription>
                    Paste the text from the game's rulebook here. This will enable the AI to answer rules questions in the future.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Paste rulebook text here..."
                    value={rulebookText}
                    onChange={(e) => setRulebookText(e.target.value)}
                    rows={15}
                    className="max-h-[50vh]"
                />
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Rulebook
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
