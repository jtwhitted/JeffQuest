
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { useGames } from '@/context/game-context';

interface DeleteGameButtonProps {
  gameId: string;
  gameName: string;
}

export function DeleteGameButton({ gameId, gameName }: DeleteGameButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { deleteGame } = useGames();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    // First, navigate away to prevent a 404 on the detail page
    router.push('/games');
    
    // Then, delete the game data.
    try {
      await deleteGame(gameId);

      toast({
        title: 'Game Deleted',
        description: `${gameName} has been removed from your collection.`,
      });
      
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete game.',
      });
      // If deletion fails, the user is already safely on the /games page.
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Game"
        description={`Are you sure you want to delete ${gameName}? All associated session data will also be affected.`}
      />
      <Button
        variant="destructive"
        onClick={() => setDeleteDialogOpen(true)}
      >
        <Trash2 className="mr-2" />
        Delete
      </Button>
    </>
  );
}
