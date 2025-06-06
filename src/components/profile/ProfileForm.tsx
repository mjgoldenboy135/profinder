
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext"; // Import AuthContext
import { auth } from "@/lib/firebase"; // For potential updates to Firebase user profile
import { updateProfile } from "firebase/auth";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  profilePicture: z.any().optional(),
  profilePictureUrl: z.string().url().optional().or(z.literal("")),
  education: z.string().optional(),
  profession: z.string().optional(),
  professionalDetails: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).optional(),
  linkedinProfileUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  isOnline: z.boolean().optional().default(false),
  showContact: z.boolean().optional().default(false),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuthContext();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      profilePictureUrl: "",
      education: "",
      profession: "",
      professionalDetails: "",
      yearsOfExperience: 0,
      linkedinProfileUrl: "",
      phoneNumber: "",
      isOnline: false,
      showContact: false,
    },
  });

  useEffect(() => {
    if (!authLoading && authUser) {
      form.reset({
        fullName: authUser.displayName || "",
        email: authUser.email || "",
        profilePictureUrl: authUser.photoURL || "",
        // Initialize other fields to defaults or empty,
        // as they aren't in Firebase Auth directly.
        // These would typically be loaded from Firestore.
        education: "", // Populate from Firestore data if available
        profession: "", // Populate from Firestore data if available
        professionalDetails: "", // Populate from Firestore data if available
        yearsOfExperience: 0, // Populate from Firestore data if available
        linkedinProfileUrl: "", // Populate from Firestore data if available
        phoneNumber: "", // Keep empty/hidden by default
        isOnline: false, // Populate from Firestore data if available
        showContact: false, // Populate from Firestore data if available
      });
      setPreviewImage(authUser.photoURL || null);
    } else if (!authLoading && !authUser) {
      // Handle user not logged in (e.g., redirect or show placeholder)
      // For now, just reset to default values
      form.reset();
      setPreviewImage(null);
    }
  }, [authUser, authLoading, form]);


  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("profilePicture", event.target.files);
    } else {
      setPreviewImage(form.getValues("profilePictureUrl") || authUser?.photoURL || null);
      form.setValue("profilePicture", undefined);
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!authUser) {
        toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
        return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    const { profilePicture, ...dataToSave } = values;
    let newProfilePictureUrl = values.profilePictureUrl;

    if (profilePicture && profilePicture.length > 0 && previewImage && previewImage.startsWith('data:')) {
      // In a real app, upload profilePicture to Firebase Storage
      // then get the download URL and set it to newProfilePictureUrl
      // For now, simulate with a placeholder.
      newProfilePictureUrl = 'https://placehold.co/150x150.png?text=NewPic';
      // Example: await uploadBytes(storageRef, profilePicture[0]); newProfilePictureUrl = await getDownloadURL(storageRef);
      try {
        await updateProfile(authUser, { photoURL: newProfilePictureUrl });
         toast({ title: "Note", description: "Profile picture update simulated. Firebase Storage integration needed." });
      } catch (error) {
        console.error("Error updating Firebase Auth profile picture:", error);
        toast({ title: "Error", description: "Failed to update profile picture in Auth.", variant: "destructive" });
      }
    } else if (!previewImage && (authUser.photoURL || values.profilePictureUrl)) {
        // User removed picture
        newProfilePictureUrl = "";
         try {
            await updateProfile(authUser, { photoURL: newProfilePictureUrl });
        } catch (error) {
            console.error("Error removing Firebase Auth profile picture:", error);
        }
    }
    dataToSave.profilePictureUrl = newProfilePictureUrl;

    // Here you would save `dataToSave` (excluding fullName and email if they are non-editable)
    // to your Firestore database document for this user (authUser.uid).
    // For example: await setDoc(doc(db, "users", authUser.uid), dataToSave, { merge: true });

    console.log("Profile update data (to be saved to Firestore):", dataToSave);
    toast({
      title: "Profile Updated (Simulated)",
      description: "Your profile information has been 'saved'. Firestore integration is the next step.",
    });
    // Optionally, re-fetch or update AuthContext if displayName/photoURL changed in Firebase Auth and you want immediate reflection
    // Or simply rely on the form state for display until next refresh.
    form.reset(dataToSave); // Update form with "saved" values, including new pic URL
  }

  if (authLoading) {
    return <p className="text-center py-10">Loading profile...</p>;
  }

  if (!authUser) {
    return <p className="text-center py-10">Please log in to view and edit your profile.</p>;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">Manage Your Profile</CardTitle>
        <CardDescription>Keep your professional information up to date.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex flex-col items-center space-y-4">
                {previewImage ? (
                    <Image src={previewImage} alt="Profile Preview" width={150} height={150} className="rounded-full object-cover ring-2 ring-primary" />
                ) : (
                    <div className="w-[150px] h-[150px] rounded-full bg-muted flex items-center justify-center text-muted-foreground text-4xl ring-2 ring-border">
                        {authUser?.displayName?.[0].toUpperCase() || '?'}
                    </div>
                )}
                 <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel htmlFor="profilePictureInput" className={cn(buttonVariants({variant: "outline", size:"sm"}), "cursor-pointer")}>
                            {previewImage ? "Change" : "Upload"} Picture
                        </FormLabel>
                        <FormControl>
                            <Input id="profilePictureInput" type="file" accept="image/*" className="hidden" onChange={handleProfilePictureChange} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {previewImage && (
                    <Button variant="ghost" size="sm" onClick={() => {
                        setPreviewImage(null);
                        form.setValue("profilePicture", undefined);
                        form.setValue("profilePictureUrl", ""); // Clear the URL too
                    }}>Remove Picture</Button>
                )}
            </div>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} disabled /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="your.email@example.com" {...field} disabled /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profession"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profession</FormLabel>
                  <FormControl><Input placeholder="e.g., Software Engineer, Marketing Manager" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Education</FormLabel>
                  <FormControl><Textarea placeholder="e.g., B.Sc. Computer Science from XYZ University (2020)" {...field} /></FormControl>
                  <FormDescription>Mention your degree, institution, and graduation year.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="professionalDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Details / Bio</FormLabel>
                  <FormControl><Textarea rows={5} placeholder="Describe your skills, work history, achievements, and professional interests." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="yearsOfExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                   <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || 0)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select years of experience" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[...Array(21).keys()].map(year => (
                        <SelectItem key={year} value={String(year)}>{year} {year === 1 ? 'year' : 'years'}</SelectItem>
                      ))}
                       <SelectItem value="21">20+ years</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="linkedinProfileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn Profile URL</FormLabel>
                  <FormControl><Input placeholder="https://linkedin.com/in/yourprofile" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Phone number field is in schema but not rendered for privacy */}
            
            <Card>
              <CardHeader><CardTitle className="text-lg font-headline">Status & Privacy</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="isOnline"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center">
                          <Globe className="mr-2 h-5 w-5 text-primary" />
                          Appear Online & on Map
                        </FormLabel>
                        <FormDescription>
                          {field.value ? "You are currently set to appear online." : "You are currently set to appear offline."}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            toast({
                              title: `You are now ${checked ? 'Online' : 'Offline'}`,
                              description: checked ? 'Your location may be visible on the map if shared.' : 'You will not be visible on the map.',
                            });
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showContact"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Show Contact Information</FormLabel>
                        <FormDescription>Allow others to see your email on your profile.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || authLoading}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    