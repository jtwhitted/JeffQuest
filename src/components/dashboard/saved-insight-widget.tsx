
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import type { DashboardInsight } from "@/lib/types";
import { useGames } from "@/context/game-context";
import { useToast } from "@/hooks/use-toast";

interface SavedInsightWidgetProps {
    insight: DashboardInsight;
}

export function SavedInsightWidget({ insight }: SavedInsightWidgetProps) {
    const { deleteInsight } = useGames();
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            await deleteInsight(insight.id);
            toast({
                title: 'Insight Removed',
                description: 'The saved insight has been deleted from your dashboard.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not remove the insight.',
            });
        }
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>Saved Insight Title</CardTitle>
                        <CardDescription className="mt-1">
                           {insight.query}
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDelete}>
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Delete Insight</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="ml-2">Generating visualization...</p>
                </div>
            </CardContent>
        </Card>
    );
}
