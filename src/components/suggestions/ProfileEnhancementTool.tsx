"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getProfileEnhancementSuggestions, type ProfileEnhancementInput, type ProfileEnhancementOutput } from "@/ai/flows/profile-enhancement-suggestions";
import { Lightbulb, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProfileEnhancementTool() {
  const [profileDetails, setProfileDetails] = useState("");
  const [desiredImprovements, setDesiredImprovements] = useState("");
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileDetails.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide your profile details.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const input: ProfileEnhancementInput = { 
        profileDetails, 
        ...(desiredImprovements.trim() && { desiredImprovements: desiredImprovements.trim() }) 
      };
      const result: ProfileEnhancementOutput = await getProfileEnhancementSuggestions(input);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error("Error getting profile enhancement suggestions:", err);
      setError("Failed to generate suggestions. Please try again.");
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
          <Lightbulb className="mr-2 h-6 w-6 text-primary" />
          AI Profile Enhancer
        </CardTitle>
        <CardDescription>
          Get AI-powered suggestions to make your professional profile stand out.
          Provide your current profile information below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="profileDetails" className="text-lg">Your Profile Details</Label>
            <Textarea
              id="profileDetails"
              value={profileDetails}
              onChange={(e) => setProfileDetails(e.target.value)}
              placeholder="Paste your current profile summary, skills, experience, education, etc."
              rows={8}
              className="mt-2"
              required
            />
          </div>
          <div>
            <Label htmlFor="desiredImprovements" className="text-lg">Desired Improvements (Optional)</Label>
            <Textarea
              id="desiredImprovements"
              value={desiredImprovements}
              onChange={(e) => setDesiredImprovements(e.target.value)}
              placeholder="e.g., 'Make my summary more impactful', 'Highlight my leadership skills', 'Suggestions for attracting recruiters'"
              rows={3}
              className="mt-2"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Suggestions...
              </>
            ) : (
              "Get Suggestions"
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
            <h3 className="text-xl font-semibold mb-4 font-headline">Here are your suggestions:</h3>
            <ul className="list-disc space-y-3 pl-5 bg-muted p-4 rounded-md">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-foreground/90">{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
         {suggestions && suggestions.length === 0 && !error && (
          <Alert className="mt-6">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>No Specific Suggestions</AlertTitle>
            <AlertDescription>
              The AI couldn't generate specific suggestions based on the input. Try providing more details or rephrasing your request.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
