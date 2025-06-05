// icebreaker-message-suggestions.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating icebreaker message suggestions.
 *
 * - icebreakerMessageSuggestions - A function that generates icebreaker message suggestions for starting a conversation with another user.
 * - IcebreakerMessageSuggestionsInput - The input type for the icebreakerMessageSuggestions function.
 * - IcebreakerMessageSuggestionsOutput - The output type for the icebreakerMessageSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IcebreakerMessageSuggestionsInputSchema = z.object({
  userProfile: z
    .string()
    .describe('The profile information of the user you want to connect with.'),
  viewerProfile: z
    .string()
    .describe('Your own profile information.'),
});
export type IcebreakerMessageSuggestionsInput = z.infer<
  typeof IcebreakerMessageSuggestionsInputSchema
>;

const IcebreakerMessageSuggestionsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of icebreaker message suggestions.'),
});
export type IcebreakerMessageSuggestionsOutput = z.infer<
  typeof IcebreakerMessageSuggestionsOutputSchema
>;

export async function icebreakerMessageSuggestions(
  input: IcebreakerMessageSuggestionsInput
): Promise<IcebreakerMessageSuggestionsOutput> {
  return icebreakerMessageSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'icebreakerMessageSuggestionsPrompt',
  input: {schema: IcebreakerMessageSuggestionsInputSchema},
  output: {schema: IcebreakerMessageSuggestionsOutputSchema},
  prompt: `You are a helpful assistant that generates icebreaker messages to start a conversation with someone on a professional networking platform.

  Given the profile of the user and the profile of the viewer, generate 3 distinct icebreaker messages that the viewer can use to initiate a conversation. Be concise and professional.

  User Profile: {{{userProfile}}}
  Viewer Profile: {{{viewerProfile}}}

  Format your response as a JSON object with a "suggestions" field containing an array of strings.
  `,
});

const icebreakerMessageSuggestionsFlow = ai.defineFlow(
  {
    name: 'icebreakerMessageSuggestionsFlow',
    inputSchema: IcebreakerMessageSuggestionsInputSchema,
    outputSchema: IcebreakerMessageSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
