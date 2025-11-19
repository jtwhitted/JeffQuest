'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { WandSparkles } from "lucide-react";

export function AiInsightWidget() {

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <WandSparkles className="text-primary" />
                    AI Insight Generator
                </CardTitle>
                <CardDescription>
                    Ask a question about your game data and get a custom visualization.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="e.g., 'Chart my wins per player for Catan' or 'Which game category have I played the most?'"
                />
                <Button className="w-full">
                    Generate Insight
                </Button>
            </CardContent>
        </Card>
    )
}
