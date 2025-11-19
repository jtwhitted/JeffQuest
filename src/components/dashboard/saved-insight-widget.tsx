'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

export function SavedInsightWidget() {
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>Saved Insight Title</CardTitle>
                        <CardDescription className="mt-1">
                           Original user query will go here...
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <X className="h-4 w-4 text-muted-foreground" />
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
