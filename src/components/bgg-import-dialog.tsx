
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download } from 'lucide-react';
import React, { useState } from 'react';
import { useGames } from '@/context/game-context';
import { importBggCollectionAction } from '@/lib/actions';

interface BggImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bggUsername: string;
}

export function BggImportDialog({ open, onOpenChange, bggUsername }: BggImportDialogProps) {
  const { toast } = useToast();
  const { refreshData } = useGames();
  const [isImporting, setIsImporting] = useState(false);

  const handleImportCollection = async () => {
    if (!bggUsername) return;
    setIsImporting(true);
    try {
        const result = await importBggCollectionAction(bggUsername);
        toast({
            title: 'Import Complete',
            description: `${result.importedCount} new games were added to your library.`,
        });
        await refreshData();
        onOpenChange(false); // Close the modal on success
    } catch (error: any) {
        console.error('Error importing BGG collection:', error);
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'Could not import the BGG collection.',
        });
    } finally {
        setIsImporting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };
  
  return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import from BGG</DialogTitle>
            <DialogDescription>
              Import all owned games from the BoardGameGeek collection of <strong>{bggUsername}</strong>. This will not create duplicates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
             <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleImportCollection}
                disabled={isImporting}
                >
                {isImporting ? <Loader2 className="mr-2 animate-spin"/> : <Download className="mr-2" />}
                {isImporting ? 'Importing...' : 'Import BGG Collection'}
            </Button>
          </div>

           <DialogFooter>
             <Button variant="ghost" onClick={handleClose}>Cancel</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

    