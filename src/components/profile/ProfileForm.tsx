
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
import { Globe, Loader2, MapPin, LocateFixed } from "lucide-react";
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
  locationLat: z.coerce.number().min(-90).max(90).optional(),
  locationLng: z.coerce.number().min(-180).max(180).optional(),
  locationAddress: z.string().optional(),
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
  locationLat: undefined,
  locationLng: undefined,
  locationAddress: "",
  isOnline: false,
  showContact: false,
  bio: "",
};

export default function ProfileForm() {
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuthContext();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

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
        education: firestoreProfile?.education || "",
        profession: firestoreProfile?.profession || "",
        professionalDetails: firestoreProfile?.professionalDetails || "",
        yearsOfExperience: firestoreProfile?.yearsOfExperience || 0,
        linkedinProfileUrl: firestoreProfile?.linkedinProfileUrl || "",
        phoneNumber: firestoreProfile?.phoneNumber || "",
        locationLat: firestoreProfile?.location?.lat,
        locationLng: firestoreProfile?.location?.lng,
        locationAddress: firestoreProfile?.location?.address || "",
        isOnline: firestoreProfile?.isOnline || false,
        showContact: firestoreProfile?.showContact || false,
        bio: firestoreProfile?.bio || "",
      };
      form.reset(initialData);
      setPreviewImage(initialProfilePictureUrl);
    }
  }, [authUser, form]);

  useEffect(() => {
    if (!authLoading && authUser) {
      setIsFetchingProfile(true);
      getUserProfile(authUser.uid)
        .then(firestoreProfile => {
          resetFormWithProfileData(firestoreProfile);
        })
        .catch(error => {
          console.error("[ProfileForm useEffect] Error fetching profile from Firestore:", error);
          resetFormWithProfileData(null);
          toast({ title: "Error", description: "Could not load full profile. Using basic info.", variant: "destructive" });
        })
        .finally(() => {
          setIsFetchingProfile(false);
        });
    } else if (!authLoading && !authUser) {
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
      form.setValue("profilePictureUrl", "");
    } else {
      const existingUrl = form.getValues("profilePictureUrl") || authUser?.photoURL;
      setPreviewImage(existingUrl || null);
      form.setValue("profilePicture", undefined);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("locationLat", position.coords.latitude);
        form.setValue("locationLng", position.coords.longitude);
        toast({
          title: "Location Fetched",
          description: "Latitude and Longitude updated with your current location.",
        });
        setIsFetchingLocation(false);
      },
      (error) => {
        let message = "Could not get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Permission to access location was denied.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "The request to get user location timed out.";
        }
        toast({
          title: "Location Error",
          description: message,
          variant: "destructive",
        });
        setIsFetchingLocation(false);
      }
    );
  };

  async function onSubmit(values: ProfileFormValues) {
    console.log("[ProfileForm onSubmit] Form submission process initiated...");
    if (!authUser || !auth) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }

    let { profilePicture, locationLat, locationLng, locationAddress, ...dataForAuthAndFirestore } = values;
    let newAuthPhotoURL = values.profilePictureUrl || authUser.photoURL || "";

    console.log("[ProfileForm onSubmit] BEGIN: Form submission process. Values:", JSON.stringify(values, null, 2));
    
    setIsUploadingPicture(true);
    if (profilePicture && profilePicture.length > 0) {
      const fileToUpload = profilePicture[0];
      console.log("[ProfileForm onSubmit] BEGIN: Profile picture upload for file:", fileToUpload.name);
      toast({ title: "Uploading Picture...", description: "Your new profile picture is being uploaded." });
      try {
        const downloadURL = await uploadProfilePicture(authUser.uid, fileToUpload);
        console.log("[ProfileForm onSubmit] END: Profile picture uploaded. Download URL:", downloadURL);
        newAuthPhotoURL = downloadURL;
      } catch (uploadError: any) {
        console.error("[ProfileForm onSubmit] CATCH: Error uploading profile picture:", uploadError);
        toast({ title: "Upload Failed", description: `Could not upload profile picture: ${uploadError.message || 'Please try again.'}`, variant: "destructive" });
        setIsUploadingPicture(false);
        return;
      }
    } else if (previewImage === null && (authUser.photoURL || values.profilePictureUrl)) {
      console.log("[ProfileForm onSubmit] INFO: Profile picture marked for removal.");
      newAuthPhotoURL = "";
    }
    setIsUploadingPicture(false);

    let locationData: User['location'] | undefined = undefined;
    if (locationLat !== undefined && locationLng !== undefined) {
        locationData = {
            lat: locationLat,
            lng: locationLng,
            address: locationAddress || "", 
        };
    }

    console.log("[ProfileForm onSubmit] Calculated newAuthPhotoURL for update:", newAuthPhotoURL);
    console.log("[ProfileForm onSubmit] Calculated locationData for update:", locationData);

    try {
      console.log("[ProfileForm onSubmit] TRY block entered.");
      const authUpdates: { displayName?: string; photoURL?: string | null } = {};
      if (values.fullName !== (authUser.displayName || "")) {
        authUpdates.displayName = values.fullName;
      }
      const photoURLForAuth = newAuthPhotoURL === undefined ? null : newAuthPhotoURL;
      if (photoURLForAuth !== (authUser.photoURL || null)) {
        authUpdates.photoURL = photoURLForAuth;
      }

      if (Object.keys(authUpdates).length > 0) {
        console.log("[ProfileForm onSubmit] BEGIN: Firebase Auth profile update with:", authUpdates);
        await updateAuthProfile(authUser, authUpdates);
        console.log("[ProfileForm onSubmit] END: Firebase Auth profile updated successfully.");
      } else {
        console.log("[ProfileForm onSubmit] SKIPPED: Firebase Auth profile update (no changes needed).");
      }

      const finalDataToSaveToFirestore: Partial<User> = {
        ...dataForAuthAndFirestore,
        fullName: values.fullName, 
        profilePictureUrl: newAuthPhotoURL,
        location: locationData, 
      };
      
      console.log("[ProfileForm onSubmit] BEGIN: Firestore profile update for user:", authUser.uid, "with data:", JSON.stringify(finalDataToSaveToFirestore, null, 2));
      await updateUserProfile(authUser.uid, finalDataToSaveToFirestore);
      console.log("[ProfileForm onSubmit] END: Firestore profile updated successfully.");

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });

      const newResetValues = { ...values, profilePictureUrl: newAuthPhotoURL, profilePicture: undefined };
      form.reset(newResetValues);
      setPreviewImage(newAuthPhotoURL || null);
      console.log("[ProfileForm onSubmit] TRY block finished successfully.");

    } catch (error: any) {
      console.error("[ProfileForm onSubmit] CATCH: Error during Auth or Firestore profile update:", error);
      toast({ title: "Update Error", description: `Failed to update profile: ${error.message || 'Please try again.'}`, variant: "destructive" });
    } finally {
      console.log("[ProfileForm onSubmit] FINALLY block entered.");
      // isUploadingPicture is already set, isSubmitting is handled by react-hook-form
      console.log("[ProfileForm onSubmit] Form submission flow logically complete.");
    }
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
                    <Image src={previewImage} alt="Profile Preview" width={150} height={150} className="rounded-full object-cover ring-2 ring-primary" data-ai-hint="user avatar"/>
 ) : (
                    <div className="w-[150px] h-[150px] rounded-full bg-muted flex items-center justify-center text-muted-foreground text-4xl ring-2 ring-border">
                        {initials}
                    </div>
                )}
                 <FormField
                    control={form.control}
                    name="profilePicture"
                    render={() => ( 
                        <FormItem>
                        <FormLabel htmlFor="profilePictureInput" className={cn(buttonVariants({variant: "outline", size:"sm"}), "cursor-pointer", (isUploadingPicture || form.formState.isSubmitting) && "opacity-50 cursor-not-allowed")}>
                            {isUploadingPicture && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {previewImage ? "Change" : "Upload"} Picture
                        </FormLabel>
                        <FormControl>
                            <Input
                                id="profilePictureInput"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProfilePictureChange}
                                disabled={isUploadingPicture || form.formState.isSubmitting}
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
                        form.setValue("profilePictureUrl", "");
                    }} disabled={isUploadingPicture || form.formState.isSubmitting}>Remove Picture</Button>
                )}
            </div>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} value={field.value ?? ''} /></FormControl>
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
                  <FormControl><Textarea placeholder="A brief introduction about yourself." {...field} value={field.value ?? ''} /></FormControl>
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
                  <FormControl><Input placeholder="e.g., Software Engineer, Marketing Manager" {...field} value={field.value ?? ''} /></FormControl>
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
                  <FormControl><Textarea placeholder="e.g., B.Sc. Computer Science from XYZ University (2020)" {...field} value={field.value ?? ''} /></FormControl>
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
                  <FormControl><Textarea rows={5} placeholder="Describe your skills, work history, achievements, and professional interests." {...field} value={field.value ?? ''} /></FormControl>
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
                   <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value ?? 0)}>
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
                  <FormControl><Input placeholder="https://linkedin.com/in/yourprofile" {...field} value={field.value ?? ''}/></FormControl>
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
                  <FormControl><Input type="tel" placeholder="Your contact phone number" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-headline flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" /> Location for Map</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} disabled={isFetchingLocation}>
                        {isFetchingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                        Use Current Location
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="locationLat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any" 
                          placeholder="e.g., 34.0522" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationLng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any" 
                          placeholder="e.g., -118.2437" 
                          {...field} 
                          value={field.value ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
                 <FormField
                  control={form.control}
                  name="locationAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Address (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., San Francisco, CA (for display)" {...field} value={field.value ?? ''} /></FormControl>
                       <FormDescription>A general address like city and state for display purposes.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormDescription>
                    Your precise latitude and longitude are used to place you on the map if you choose to appear online.
                    The address field is for display purposes only.
                </FormDescription>
              </CardContent>
            </Card>


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
                          {field.value && (!form.getValues("locationLat") || !form.getValues("locationLng")) && <span className="text-destructive block"> Location coordinates are missing.</span>}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked && (!form.getValues("locationLat") || !form.getValues("locationLng"))) {
                                toast({
                                    title: "Location Needed",
                                    description: "To appear on the map, please provide your latitude and longitude or use current location.",
                                    variant: "destructive"
                                });
                            } else {
                                toast({
                                    title: `You are now ${checked ? 'Online' : 'Offline'}`,
                                    description: checked ? 'Your profile may be visible on the map if location is set.' : 'You will not be visible on the map.',
                                });
                            }
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
                        <FormDescription>Allow others to see your email on your public profile.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || authLoading || isFetchingProfile || isUploadingPicture || isFetchingLocation}>
              {(form.formState.isSubmitting || isUploadingPicture) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting || isUploadingPicture ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

      