// src/ai/flows/profile-enhancement-suggestions.ts
'use server';

/**
 * @fileOverview Provides suggestions for users to enhance their professional profiles.
 *
 * - getProfileEnhancementSuggestions - A function that generates profile enhancement suggestions.
 * - ProfileEnhancementInput - The input type for the getProfileEnhancementSuggestions function.
 * - ProfileEnhancementOutput - The return type for the getProfileEnhancementSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProfileEnhancementInputSchema = z.object({
  profileDetails: z
    .string()
    .describe('Details of the user profile, including education, profession, experience, and skills.'),
  desiredImprovements: z
    .string()
    .optional()
    .describe('Any specific areas the user wants to improve in their profile.'),
});
export type ProfileEnhancementInput = z.infer<typeof ProfileEnhancementInputSchema>;

const ProfileEnhancementOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of suggestions for improving the user profile.'),
});
export type ProfileEnhancementOutput = z.infer<typeof ProfileEnhancementOutputSchema>;

export async function getProfileEnhancementSuggestions(
  input: ProfileEnhancementInput
): Promise<ProfileEnhancementOutput> {
  return profileEnhancementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'profileEnhancementPrompt',
  input: {schema: ProfileEnhancementInputSchema},
  output: {schema: ProfileEnhancementOutputSchema},
  prompt: `You are a professional profile expert. Given the following profile details, suggest improvements to make the profile more compelling and complete.

Profile Details: {{{profileDetails}}}

Desired Improvements: {{{desiredImprovements}}}

Suggestions should be specific and actionable.

Output in JSON format:

{
  "suggestions": ["suggestion 1", "suggestion 2", ...]
}`,
});

const profileEnhancementFlow = ai.defineFlow(
  {
    name: 'profileEnhancementFlow',
    inputSchema: ProfileEnhancementInputSchema,
    outputSchema: ProfileEnhancementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
