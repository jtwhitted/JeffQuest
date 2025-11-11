
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Session, Game, Player } from '@/lib/types';
import { format } from 'date-fns';
import { Crown, ArrowRight, Users, ShieldCheck, ShieldX } from 'lucide-react';

interface SessionCardProps {
  session: Session;
  game: Game;
  players: Player[];
  winner?: Player;
}

export default function SessionCard({ session, game, players, winner }: SessionCardProps) {
  const isCooperative = session.cooperativeResult;

  const renderWinner = () => {
    if (isCooperative) {
      if (session.cooperativeResult === 'win') {
        return (
          <div className="mt-4 flex items-center text-green-400">
            <ShieldCheck className="mr-2 h-5 w-5" />
            <span className="font-semibold">All players won!</span>
          </div>
        );
      } else {
        return (
          <div className="mt-4 flex items-center text-red-400">
            <ShieldX className="mr-2 h-5 w-5" />
            <span className="font-semibold">All players lost</span>
          </div>
        );
      }
    }

    if (winner) {
      return (
        <div className="mt-4 flex items-center">
            <Crown className="mr-2 h-5 w-5 text-amber-400" />
            <span className="font-semibold">{winner.name} won!</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="relative h-40 p-0">
        <Image
          src={game.imageUrl}
          alt={game.name}
          fill
          className="object-cover"
          data-ai-hint={`${game.category} game`}
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4">
            <CardTitle className="text-xl font-bold text-white">{game.name}</CardTitle>
            <p className="text-sm text-gray-300">{format(new Date(session.date), 'MMMM d, yyyy')}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <div className="flex -space-x-2 overflow-hidden">
          {players.map((player) => (
            <Avatar key={player.id} className="h-8 w-8 border-2 border-card">
              <AvatarImage src={player.avatarUrl} alt={player.name} />
              <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        {renderWinner()}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild variant="outline" className="w-full">
            <Link href={`/sessions/${session.id}`}>
                View Details <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
