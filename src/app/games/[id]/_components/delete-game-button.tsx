'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { deleteGame } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

interface DeleteGameButtonProps {
  gameId: string;
  gameName: string;
}

export function DeleteGameButton({ gameId, gameName }: DeleteGameButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteGame(gameId);
      toast({
        title: 'Game Deleted',
        description: `${gameName} has been removed from your collection.`,
      });
      router.push('/games');
      router.refresh(); // To ensure the list is updated
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete game.',
      });
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
        outline
        onClick={() => setDeleteDialogOpen(true)}
      >
        <Trash2 className="mr-2" />
        Delete
      </Button>
    </>
  );
}
