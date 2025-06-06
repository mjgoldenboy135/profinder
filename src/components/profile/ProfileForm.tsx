
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
import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Globe, Loader2 } from "lucide-react"; // Added Loader2
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { getUserProfile, updateUserProfile, uploadProfilePicture } from "@/services/userService";
import type { User } from "@/lib/types";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  profilePicture: z.custom<FileList | undefined>().optional(),
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
  bio: z.string().optional(),
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
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultFormValues,
  });

  const resetFormWithProfileData = useCallback((firestoreProfile: User | null) => {
    if (authUser) {
      const initialProfilePictureUrl = authUser.photoURL || firestoreProfile?.profilePictureUrl || "";
      const initialData: ProfileFormValues = {
        ...defaultFormValues,
        ...(firestoreProfile || {}),
        fullName: authUser.displayName || firestoreProfile?.fullName || "",
        email: authUser.email || firestoreProfile?.email || "",
        profilePictureUrl: initialProfilePictureUrl,
        // Ensure other fields from firestoreProfile are preferred if they exist
        education: firestoreProfile?.education || "",
        profession: firestoreProfile?.profession || "",
        professionalDetails: firestoreProfile?.professionalDetails || "",
        yearsOfExperience: firestoreProfile?.yearsOfExperience || 0,
        linkedinProfileUrl: firestoreProfile?.linkedinProfileUrl || "",
        phoneNumber: firestoreProfile?.phoneNumber || "",
        isOnline: firestoreProfile?.isOnline || false,
        showContact: firestoreProfile?.showContact || false,
        bio: firestoreProfile?.bio || "",
      };
      console.log("[ProfileForm resetFormWithProfileData] Resetting form with data:", initialData);
      form.reset(initialData);
      setPreviewImage(initialProfilePictureUrl);
    }
  }, [authUser, form]);

  useEffect(() => {
    console.log("[ProfileForm useEffect] Running effect.", { authLoading, authUserExists: !!authUser, isFetchingProfile });
    if (!authLoading && authUser) {
      console.log("[ProfileForm useEffect] Auth loaded and user exists. Fetching profile for UID:", authUser.uid);
      setIsFetchingProfile(true);
      getUserProfile(authUser.uid)
        .then(firestoreProfile => {
          console.log("[ProfileForm useEffect] Successfully fetched Firestore profile:", firestoreProfile);
          resetFormWithProfileData(firestoreProfile);
        })
        .catch(error => {
          console.error("[ProfileForm useEffect] Error fetching profile from Firestore:", error);
          resetFormWithProfileData(null); // Reset with auth data even if Firestore fetch fails
          toast({ title: "Error", description: "Could not load full profile from database. Using basic info.", variant: "destructive" });
        })
        .finally(() => {
          console.log("[ProfileForm useEffect] Firestore fetch attempt finished. Setting isFetchingProfile to false.");
          setIsFetchingProfile(false);
        });
    } else if (!authLoading && !authUser) {
      console.log("[ProfileForm useEffect] Auth loaded but no user. Resetting form and setting isFetchingProfile to false.");
      form.reset(defaultFormValues);
      setPreviewImage(null);
      setIsFetchingProfile(false);
    }
  }, [authUser, authLoading, resetFormWithProfileData, toast]);


  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("profilePicture", event.target.files);
      form.setValue("profilePictureUrl", ""); // Clear existing URL if new file is chosen
    } else {
      // If file selection is cancelled, revert to authUser's photoURL or existing form value
      const existingUrl = form.getValues("profilePictureUrl") || authUser?.photoURL;
      setPreviewImage(existingUrl || null);
      form.setValue("profilePicture", undefined);
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!authUser || !auth) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    console.log("[ProfileForm onSubmit] Starting submission with values:", values);

    let { profilePicture, ...dataForFirestore } = values; // Renamed to avoid confusion
    let newAuthPhotoURL = values.profilePictureUrl || authUser.photoURL || ""; // Initialize with current or form value

    if (profilePicture && profilePicture.length > 0) {
      const fileToUpload = profilePicture[0];
      setIsUploading(true);
      console.log("[ProfileForm onSubmit] Starting profile picture upload...");
      try {
        toast({ title: "Uploading...", description: "Your new profile picture is being uploaded." });
        const downloadURL = await uploadProfilePicture(authUser.uid, fileToUpload);
        console.log("[ProfileForm onSubmit] Profile picture uploaded. Download URL:", downloadURL);
        newAuthPhotoURL = downloadURL;
      } catch (uploadError: any) {
        console.error("Error uploading profile picture:", uploadError);
        toast({ title: "Upload Failed", description: `Could not upload profile picture: ${uploadError.message || 'Please try again.'}`, variant: "destructive" });
        setIsUploading(false);
        return; // Stop submission
      }
      // isUploading will be set to false in the final finally block
    } else if (previewImage === null && (authUser.photoURL || values.profilePictureUrl)) {
      // This condition means "Remove Picture" was clicked and previewImage is now null
      console.log("[ProfileForm onSubmit] Profile picture marked for removal.");
      newAuthPhotoURL = "";
    }

    console.log(`[ProfileForm onSubmit] State before Auth/Firestore updates: isUploading=${isUploading}`);
    console.log(`[ProfileForm onSubmit] AuthUser current: photoURL='${authUser.photoURL}', displayName='${authUser.displayName}'`);
    console.log(`[ProfileForm onSubmit] Form values to be processed: fullName='${values.fullName}', current form profilePictureUrl='${values.profilePictureUrl}'`);
    console.log(`[ProfileForm onSubmit] Calculated newAuthPhotoURL for update='${newAuthPhotoURL}'`);

    try {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (values.fullName !== (authUser.displayName || "")) {
        authUpdates.displayName = values.fullName;
      }
      if (newAuthPhotoURL !== (authUser.photoURL || "")) {
        authUpdates.photoURL = newAuthPhotoURL;
      }

      if (Object.keys(authUpdates).length > 0) {
        console.log("[ProfileForm onSubmit] BEGIN: Firebase Auth profile update with:", authUpdates);
        await updateAuthProfile(authUser, authUpdates);
        console.log("[ProfileForm onSubmit] END: Firebase Auth profile updated successfully.");
      } else {
        console.log("[ProfileForm onSubmit] SKIPPED: Firebase Auth profile update (no changes needed).");
      }

      // Prepare final data for Firestore, ensuring all relevant fields from 'values' are included
      // and profilePictureUrl is the potentially new one.
      const finalDataToSaveToFirestore: Partial<User> = {
        ...dataForFirestore, // Contains all fields from 'values' except 'profilePicture' (FileList)
        fullName: values.fullName, // Explicitly take from current form values
        profilePictureUrl: newAuthPhotoURL, // Use the determined newAuthPhotoURL
      };
      // Remove email from Firestore update if it's not meant to be changed here
      // delete finalDataToSaveToFirestore.email; // Assuming email is not editable via this form or managed elsewhere

      console.log("[ProfileForm onSubmit] BEGIN: Firestore profile update for user:", authUser.uid, "with data:", finalDataToSaveToFirestore);
      await updateUserProfile(authUser.uid, finalDataToSaveToFirestore);
      console.log("[ProfileForm onSubmit] END: Firestore profile updated successfully.");

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });

      const newResetValues = { ...values, profilePictureUrl: newAuthPhotoURL, profilePicture: undefined, fullName: values.fullName };
      console.log("[ProfileForm onSubmit] Resetting form with new values:", newResetValues);
      form.reset(newResetValues);
      console.log("[ProfileForm onSubmit] Setting preview image to:", newAuthPhotoURL);
      setPreviewImage(newAuthPhotoURL || null);

    } catch (error: any) {
      console.error("Error updating profile (Auth or Firestore):", error);
      if (error.name && error.message) {
        console.error("Error details - Name:", error.name, "Message:", error.message, "Code:", error.code);
      }
      toast({ title: "Update Error", description: `Failed to update profile: ${error.message || 'Please try again.'}`, variant: "destructive" });
    } finally {
      console.log("[ProfileForm onSubmit] Entering final finally block. Setting isUploading to false.");
      setIsUploading(false); // Ensure isUploading is reset regardless of outcome
    }
    console.log("[ProfileForm onSubmit] Submission process finished.");
  }


  if (authLoading || isFetchingProfile) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading profile...</p></div>;
  }

  if (!authUser) {
    return <p className="text-center py-10">Please log in to view and edit your profile.</p>;
  }

  const currentFullName = form.watch("fullName") || authUser?.displayName || "";
  const initials = currentFullName.split(" ").map(n => n[0]).join("").toUpperCase() || "?";


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
                        {initials}
                    </div>
                )}
                 <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel htmlFor="profilePictureInput" className={cn(buttonVariants({variant: "outline", size:"sm"}), "cursor-pointer", isUploading && "opacity-50 cursor-not-allowed")}>
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {previewImage ? "Change" : "Upload"} Picture
                        </FormLabel>
                        <FormControl>
                            <Input
                                id="profilePictureInput"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProfilePictureChange}
                                disabled={isUploading}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {previewImage && (
                    <Button variant="ghost" size="sm" onClick={() => {
                        setPreviewImage(null);
                        form.setValue("profilePicture", undefined);
                        form.setValue("profilePictureUrl", ""); // Explicitly clear the URL as well
                    }} disabled={isUploading}>Remove Picture</Button>
                )}
            </div>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
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
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl><Input type="tel" placeholder="Your contact phone number" {...field} /></FormControl>
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
                            setTimeout(() => {
                              toast({
                                title: `You are now ${checked ? 'Online' : 'Offline'}`,
                                description: checked ? 'Your general location may be visible on the map if shared.' : 'You will not be visible on the map.',
                              });
                            }, 0);
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
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                             setTimeout(() => {
                                field.onChange(checked);
                            }, 0);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || authLoading || isFetchingProfile || isUploading}>
              {(form.formState.isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting || isUploading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    