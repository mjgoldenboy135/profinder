"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { icebreakerMessageSuggestions, type IcebreakerMessageSuggestionsInput, type IcebreakerMessageSuggestionsOutput } from "@/ai/flows/icebreaker-message-suggestions";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function IcebreakerTool() {
  const [userProfile, setUserProfile] = useState("");
  const [viewerProfile, setViewerProfile] = useState("");
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.trim() || !viewerProfile.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide both user profiles.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const input: IcebreakerMessageSuggestionsInput = { userProfile, viewerProfile };
      const result: IcebreakerMessageSuggestionsOutput = await icebreakerMessageSuggestions(input);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error("Error getting icebreaker suggestions:", err);
      setError("Failed to generate icebreaker messages. Please try again.");
      toast({
        title: "Error",
        description: "Could not fetch suggestions from AI.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-headline">
          <MessageSquarePlus className="mr-2 h-6 w-6 text-primary" />
          AI Icebreaker Generator
        </CardTitle>
        <CardDescription>
          Get AI-powered icebreaker message suggestions to start a conversation.
          Provide some details about the person you want to connect with and yourself.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="userProfile" className="text-lg">Target User's Profile Snippet</Label>
            <Textarea
              id="userProfile"
              value={userProfile}
              onChange={(e) => setUserProfile(e.target.value)}
              placeholder="Key details about the person you want to message (e.g., their profession, recent posts, shared interests from their profile)."
              rows={5}
              className="mt-2"
              required
            />
          </div>
          <div>
            <Label htmlFor="viewerProfile" className="text-lg">Your Profile Snippet / Context</Label>
            <Textarea
              id="viewerProfile"
              value={viewerProfile}
              onChange={(e) => setViewerProfile(e.target.value)}
              placeholder="Briefly about yourself or your reason for connecting (e.g., your profession, shared connections, interest in their work)."
              rows={5}
              className="mt-2"
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Icebreakers...
              </>
            ) : (
              "Get Icebreakers"
            )}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 font-headline">Suggested Icebreakers:</h3>
            <ul className="list-none space-y-4">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="p-4 border rounded-md bg-muted hover:shadow-sm transition-shadow">
                  <p className="text-foreground/90">{suggestion}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-primary hover:text-primary/80"
                    onClick={() => {
                      navigator.clipboard.writeText(suggestion);
                      toast({ title: "Copied!", description: "Icebreaker copied to clipboard." });
                    }}
                  >
                    Copy
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {suggestions && suggestions.length === 0 && !error && (
           <Alert className="mt-6">
            <MessageSquarePlus className="h-4 w-4" />
            <AlertTitle>No Specific Icebreakers</AlertTitle>
            <AlertDescription>
              The AI couldn't generate icebreakers based on the input. Try providing more distinct details for both profiles.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
