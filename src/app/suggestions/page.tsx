import ProfileEnhancementTool from "@/components/suggestions/ProfileEnhancementTool";
import IcebreakerTool from "@/components/suggestions/IcebreakerTool";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, MessageSquarePlus } from "lucide-react";

export default function SuggestionsPage() {
  return (
    <div className="py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-headline mb-3 text-primary">AI-Powered Suggestions</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Leverage artificial intelligence to enhance your professional presence and networking skills on Proximity Network.
        </p>
      </div>

      <Tabs defaultValue="profile-enhancement" className="w-full max-w-3xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="profile-enhancement" className="py-3">
            <Lightbulb className="mr-2 h-5 w-5" />
            Profile Enhancement
          </TabsTrigger>
          <TabsTrigger value="icebreakers" className="py-3">
            <MessageSquarePlus className="mr-2 h-5 w-5" />
            Icebreaker Messages
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile-enhancement">
          <ProfileEnhancementTool />
        </TabsContent>
        <TabsContent value="icebreakers">
          <IcebreakerTool />
        </TabsContent>
      </Tabs>
    </div>
  );
}
