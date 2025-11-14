
'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Trophy, Swords, Percent } from 'lucide-react';

interface LegendaryPlayerCardProps {
  name: string;
  title: string;
  stylizedAvatarDataUri: string;
  wins: number;
  gamesPlayed: number;
  winRate: number;
}

export function LegendaryPlayerCard({
  name,
  title,
  stylizedAvatarDataUri,
  wins,
  gamesPlayed,
  winRate,
}: LegendaryPlayerCardProps) {
  return (
    <div className="w-full max-w-sm mx-auto font-serif">
      <Card className="overflow-hidden rounded-xl border-4 border-amber-900/50 bg-stone-800 shadow-2xl shadow-black/50">
        {/* Card Header - Name and Title */}
        <CardHeader className="p-3 bg-gradient-to-t from-stone-900 to-stone-800 border-b-2 border-amber-900/50">
          <h2 className="text-xl font-bold text-amber-100 tracking-wide text-center">{name}</h2>
          <p className="text-sm text-amber-300/80 italic text-center -mt-1">&quot;{title}&quot;</p>
        </CardHeader>
        
        {/* Card Image */}
        <div className="relative aspect-[3/2] w-full">
          <Image
            src={stylizedAvatarDataUri}
            alt={`Fantasy portrait of ${name}`}
            fill
            className="object-cover border-y-4 border-amber-900/50"
            unoptimized
          />
           <div className="absolute inset-0 bg-gradient-to-t from-stone-800/80 via-transparent to-transparent" />
        </div>
        
        {/* Card Content - Stats */}
        <CardContent className="p-4 bg-stone-900 text-amber-100/90">
            <div className="space-y-3">
                <div className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span className="font-semibold">Wins</span>
                    </div>
                    <span className="font-bold tracking-wider">{wins}</span>
                </div>
                 <div className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-slate-400" />
                        <span className="font-semibold">Games Played</span>
                    </div>
                    <span className="font-bold tracking-wider">{gamesPlayed}</span>
                </div>
                 <div className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <Percent className="w-5 h-5 text-green-400" />
                        <span className="font-semibold">Win Rate</span>
                    </div>
                    <span className="font-bold tracking-wider">{winRate}%</span>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
