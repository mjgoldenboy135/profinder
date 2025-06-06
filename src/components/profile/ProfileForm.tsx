
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
import { useAuthContext } from "@/contexts/AuthContext"; 
import { auth } from "@/lib/firebase"; 
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { getUserProfile, updateUserProfile } from "@/services/userService"; // Import userService functions
import type { User } from "@/lib/types";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  profilePicture: z.any().optional(), // For file input
  profilePictureUrl: z.string().url().optional().or(z.literal("")), // For displaying/storing URL
  education: z.string().optional(),
  profession: z.string().optional(),
  professionalDetails: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).optional(),
  linkedinProfileUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
  email: z.string().email(),
  phoneNumber: z.string().optional(), // Keep in schema if you might use it later, but don't display publicly
  isOnline: z.boolean().optional().default(false),
  showContact: z.boolean().optional().default(false),
  bio: z.string().optional(),
  // interests are not directly in this form yet, but could be added
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const defaultFormValues: ProfileFormValues = {
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
  bio: "",
};

export default function ProfileForm() {
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuthContext();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!authLoading && authUser) {
      setIsFetchingProfile(true);
      getUserProfile(authUser.uid)
        .then(firestoreProfile => {
          const initialData: ProfileFormValues = {
            ...defaultFormValues, // Start with defaults
            fullName: authUser.displayName || "",
            email: authUser.email || "",
            profilePictureUrl: authUser.photoURL || "", // Auth photoURL is source of truth for display initially
            ...(firestoreProfile || {}), // Spread Firestore data, overriding defaults/Auth data where applicable
            // Ensure specific Auth fields take precedence if Firestore hasn't been updated yet or for display
            fullName: authUser.displayName || firestoreProfile?.fullName || "",
            email: authUser.email || firestoreProfile?.email || "",
            profilePictureUrl: authUser.photoURL || firestoreProfile?.profilePictureUrl || "",
          };
          form.reset(initialData);
          setPreviewImage(initialData.profilePictureUrl || null);
        })
        .catch(error => {
          console.error("Error fetching profile from Firestore:", error);
          // Fallback to Auth data if Firestore fetch fails
          form.reset({
            ...defaultFormValues,
            fullName: authUser.displayName || "",
            email: authUser.email || "",
            profilePictureUrl: authUser.photoURL || "",
          });
          setPreviewImage(authUser.photoURL || null);
          toast({ title: "Error", description: "Could not load full profile from database.", variant: "destructive" });
        })
        .finally(() => {
          setIsFetchingProfile(false);
        });
    } else if (!authLoading && !authUser) {
      form.reset(defaultFormValues);
      setPreviewImage(null);
      setIsFetchingProfile(false);
    }
  }, [authUser, authLoading, form, toast]);


  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("profilePicture", event.target.files); // Store FileList for upload
      form.setValue("profilePictureUrl", ""); // Clear existing URL if new file is chosen
    } else {
      // If file selection is cancelled, reset preview to existing URL or Auth URL
      setPreviewImage(form.getValues("profilePictureUrl") || authUser?.photoURL || null);
      form.setValue("profilePicture", undefined);
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!authUser || !auth) {
        toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
        return;
    }
    
    const { profilePicture, ...dataToSaveToFirestore } = values;
    let newAuthPhotoURL = values.profilePictureUrl; // Start with current URL in form

    // Simulate profile picture upload for now
    if (profilePicture && profilePicture.length > 0 && previewImage && previewImage.startsWith('data:')) {
      // In a real app, upload profilePicture to Firebase Storage:
      // 1. Generate a unique file name (e.g., `users/${authUser.uid}/profile.${fileExtension}`)
      // 2. const storageRef = ref(storage, `users/${authUser.uid}/profilePicture`);
      // 3. await uploadBytes(storageRef, profilePicture[0]);
      // 4. newAuthPhotoURL = await getDownloadURL(storageRef);
      // For now, we'll use a placeholder and assume previewImage is the data URI
      newAuthPhotoURL = 'https://placehold.co/150x150.png?text=NewPicSim'; // Simulated new URL
      dataToSaveToFirestore.profilePictureUrl = newAuthPhotoURL; // Update URL for Firestore
      toast({ title: "Note", description: "Profile picture upload simulated. Firebase Storage integration needed." });
    } else if (!previewImage && (authUser.photoURL || values.profilePictureUrl)) {
        // User removed picture
        newAuthPhotoURL = "";
        dataToSaveToFirestore.profilePictureUrl = "";
    }


    try {
      // Update Firebase Auth profile (displayName, photoURL) if they changed
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (values.fullName !== authUser.displayName) {
        authUpdates.displayName = values.fullName;
      }
      if (newAuthPhotoURL !== authUser.photoURL) {
        authUpdates.photoURL = newAuthPhotoURL;
      }
      if (Object.keys(authUpdates).length > 0) {
        await updateAuthProfile(authUser, authUpdates);
      }

      // Save all other profile data to Firestore
      await updateUserProfile(authUser.uid, dataToSaveToFirestore as Partial<User>);
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
      form.reset(values); // Update form with "saved" values, including new pic URL if simulated
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "Failed to update profile. Please try again.", variant: "destructive" });
    }
  }

  if (authLoading || isFetchingProfile) {
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
                        {(form.getValues("fullName")?.[0] || authUser?.displayName?.[0] || '?').toUpperCase()}
                    </div>
                )}
                 <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => ( // field is not directly used for Input type="file" but keep for consistency
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
                        form.setValue("profilePictureUrl", ""); 
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
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio / Short Summary</FormLabel>
                  <FormControl><Textarea placeholder="A brief introduction about yourself." {...field} /></FormControl>
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
                  <FormLabel>Professional Details / Experience</FormLabel>
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
                              description: checked ? 'Your general location may be visible on the map if shared.' : 'You will not be visible on the map.',
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

            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || authLoading || isFetchingProfile}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
