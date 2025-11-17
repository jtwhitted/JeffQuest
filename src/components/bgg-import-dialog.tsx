
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
import { Loader2, Download, History, Star, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useGames } from '@/context/game-context';
import { importBggCollectionAction, importBggFriendsAction, importBggPlayHistory, importBggRatingsAction } from '@/lib/actions';
import { Separator } from './ui/separator';

interface BggImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bggUsername: string;
  playerId: string;
}

export function BggImportDialog({ open, onOpenChange, bggUsername, playerId }: BggImportDialogProps) {
  const { toast } = useToast();
  const { refreshData } = useGames();
  const [isImporting, setIsImporting] = useState(false);
  const [importingMessage, setImportingMessage] = useState('');

  const handleImportCollection = async () => {
    if (!bggUsername) return;
    setIsImporting(true);
    setImportingMessage('Importing Collection...');
    try {
        const result = await importBggCollectionAction(bggUsername);
        toast({
            title: 'Import Complete',
            description: `${result.importedCount} new games were added to your library.`,
        });
        await refreshData();
        onOpenChange(false);
    } catch (error: any) {
        console.error('Error importing BGG collection:', error);
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'Could not import the BGG collection.',
        });
    } finally {
        setIsImporting(false);
        setImportingMessage('');
    }
  };
  
  const handleImportPlays = async () => {
    if (!bggUsername) return;
    setIsImporting(true);
    setImportingMessage('Importing Plays...');
    try {
        const result = await importBggPlayHistory(bggUsername);
        toast({
            title: 'Play History Imported',
            description: `${result.importedCount} new sessions were added.`,
        });
        await refreshData();
        onOpenChange(false);
    } catch (error: any) {
        console.error('Error importing BGG plays:', error);
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'Could not import the play history.',
        });
    } finally {
        setIsImporting(false);
        setImportingMessage('');
    }
  };

  const handleImportRatings = async () => {
    if (!bggUsername) return;
    setIsImporting(true);
    setImportingMessage('Importing Ratings...');
    try {
        const result = await importBggRatingsAction(bggUsername, playerId);
        toast({
            title: 'Ratings Synced',
            description: `${result.updatedCount} game ratings were updated.`,
        });
        await refreshData();
        onOpenChange(false);
    } catch (error: any) {
        console.error('Error importing BGG ratings:', error);
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'Could not import your game ratings.',
        });
    } finally {
        setIsImporting(false);
        setImportingMessage('');
    }
  };

  const handleImportFriends = async () => {
    if (!bggUsername) return;
    setIsImporting(true);
    setImportingMessage('Importing Friends...');
    try {
        const { importedCount, friendsFound, friendsUsernames } = await importBggFriendsAction(bggUsername);
        
        let description = `Found ${friendsFound} friends on BGG. Friends list: ${JSON.stringify(friendsUsernames)}.`;
        if (importedCount > 0) {
            description += ` ${importedCount} new player(s) were imported.`;
        } else if (friendsFound > 0) {
            description += ` No new players were imported (they may already exist).`;
        } else {
             description = `No friends found on BGG for user ${bggUsername}.`;
        }

        toast({
            title: 'Friend Import Complete',
            description: description,
            duration: 9000,
        });

        if (importedCount > 0) {
          await refreshData();
        }
        onOpenChange(false);
    } catch (error: any) {
        console.error('Error importing BGG friends:', error);
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'Could not import your BGG friends.',
        });
    } finally {
        setIsImporting(false);
        setImportingMessage('');
    }
  };


  const handleClose = () => {
    onOpenChange(false);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import from BGG</DialogTitle>
            <DialogDescription>
              Import data from the BoardGameGeek account of <strong>{bggUsername}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
             <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleImportCollection}
                disabled={isImporting}
                >
                {isImporting && importingMessage === 'Importing Collection...' ? <Loader2 className="mr-2 animate-spin"/> : <Download className="mr-2" />}
                {isImporting && importingMessage === 'Importing Collection...' ? 'Importing...' : 'Import BGG Collection'}
            </Button>
            
             <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleImportPlays}
                disabled={isImporting}
                >
                {isImporting && importingMessage === 'Importing Plays...' ? <Loader2 className="mr-2 animate-spin"/> : <History className="mr-2" />}
                {isImporting && importingMessage === 'Importing Plays...' ? 'Importing...' : 'Import Play History'}
            </Button>
             <Button 
                variant="outline" 
                className="w-full"
                onClick={handleImportRatings}
                disabled={isImporting}
                >
                {isImporting && importingMessage === 'Importing Ratings...' ? <Loader2 className="mr-2 animate-spin"/> : <Star className="mr-2" />}
                {isImporting && importingMessage === 'Importing Ratings...' ? 'Importing...' : 'Import Game Ratings'}
            </Button>
             <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleImportFriends}
                disabled={isImporting}
                >
                {isImporting && importingMessage === 'Importing Friends...' ? <Loader2 className="mr-2 animate-spin"/> : <Users className="mr-2" />}
                {isImporting && importingMessage === 'Importing Friends...' ? 'Importing...' : 'Import BGG Friends'}
            </Button>
          </div>

           <DialogFooter>
             <Button variant="ghost" onClick={handleClose}>Cancel</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
