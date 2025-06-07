
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
import { useState, useEffect, useCallback, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Globe, Loader2, MapPin } from "lucide-react";
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
  const locationWatchId = useRef<number | null>(null);
  const [isLocationPermissionDenied, setIsLocationPermissionDenied] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultFormValues,
  });

  const watchedIsOnline = form.watch("isOnline");

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


  useEffect(() => {
    if (!authUser || isFetchingProfile) {
      return;
    }
    // Check if isOnline was explicitly changed by user interaction, not just on form load.
    // form.formState.dirtyFields.isOnline ensures this runs only when user toggles the switch.
    if (form.formState.dirtyFields.isOnline === undefined && !form.formState.isSubmitted) {
        return;
    }


    const manageLiveLocation = async (enable: boolean) => {
      const currentAddress = form.getValues("locationAddress") || "";
      console.log(`[ProfileForm Tracking] manageLiveLocation called with enable: ${enable}, user: ${authUser.uid}`);

      if (enable) {
        setIsLocationPermissionDenied(false);
        if (!navigator.geolocation) {
          toast({ title: "Geolocation Not Supported", description: "Live location tracking is not available on your browser.", variant: "destructive" });
          form.setValue("isOnline", false, { shouldDirty: false }); // Revert switch
          await updateUserProfile(authUser.uid, { isOnline: false });
          return;
        }

        console.log("[ProfileForm Tracking] Attempting to get current position...");
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            console.log(`[ProfileForm Tracking] getCurrentPosition SUCCESS: Lat: ${latitude}, Lng: ${longitude}`);
            const locationData = { lat: latitude, lng: longitude, address: currentAddress };
            try {
                await updateUserProfile(authUser.uid, { isOnline: true, location: locationData });
                toast({ title: "You are now Online!", description: "Your location is being shared." });
                console.log("[ProfileForm Tracking] Firestore updated: isOnline: true, location:", locationData);
            } catch (dbError) {
                console.error("[ProfileForm Tracking] Error updating Firestore after getCurrentPosition:", dbError);
                toast({ title: "Database Error", description: "Could not save online status.", variant: "destructive" });
                form.setValue("isOnline", false, { shouldDirty: false }); // Revert on error
                return; // Don't start watch if initial save fails
            }

            if (locationWatchId.current !== null) navigator.geolocation.clearWatch(locationWatchId.current);
            console.log("[ProfileForm Tracking] Starting watchPosition...");
            locationWatchId.current = navigator.geolocation.watchPosition(
              async (pos) => {
                const newLat = pos.coords.latitude;
                const newLng = pos.coords.longitude;
                console.log(`[ProfileForm Tracking] watchPosition UPDATE: Lat: ${newLat}, Lng: ${newLng}`);
                const newLocationData = { lat: newLat, lng: newLng, address: form.getValues("locationAddress") || "" };
                try {
                  await updateUserProfile(authUser.uid, { location: newLocationData });
                  console.log("[ProfileForm Tracking] Firestore updated via watchPosition:", newLocationData);
                } catch (watchDbError) {
                  console.error("[ProfileForm Tracking] Error updating Firestore via watchPosition:", watchDbError);
                  // Potentially inform user if watch updates fail consistently
                }
              },
              (watchErr) => {
                console.error("[ProfileForm Tracking] Error during watchPosition:", watchErr);
                toast({ title: "Location Tracking Error", description: `Could not update live location: ${watchErr.message}`, variant: "destructive" });
                // Optionally stop tracking if watch fails consistently
                // if (locationWatchId.current !== null) navigator.geolocation.clearWatch(locationWatchId.current);
                // form.setValue("isOnline", false); 
                // updateUserProfile(authUser.uid, { isOnline: false });
              },
              { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
            );
          },
          async (error) => {
            console.error("[ProfileForm Tracking] Error in getCurrentPosition:", error);
            let message = "Could not get your location to go online.";
            if (error.code === error.PERMISSION_DENIED) {
              message = "Location permission denied. Please enable it in your browser settings to appear on the map.";
              setIsLocationPermissionDenied(true);
            } else {
              message = `Could not get location: ${error.message}. Please try again.`;
            }
            toast({ title: "Location Error", description: message, variant: "destructive" });
            form.setValue("isOnline", false, { shouldDirty: false }); // Revert switch
            try {
                await updateUserProfile(authUser.uid, { isOnline: false });
                 console.log("[ProfileForm Tracking] Firestore updated: isOnline: false due to getCurrentPosition error.");
            } catch (dbError) {
                console.error("[ProfileForm Tracking] Error reverting isOnline status in Firestore:", dbError);
            }
          }
        );
      } else { // Disabling: isOnline is false
        if (locationWatchId.current !== null) {
          navigator.geolocation.clearWatch(locationWatchId.current);
          locationWatchId.current = null;
          console.log("[ProfileForm Tracking] Stopped location watch.");
        }
        try {
            await updateUserProfile(authUser.uid, { isOnline: false });
            toast({ title: "You are now Offline", description: "You will no longer appear on the map." });
            console.log("[ProfileForm Tracking] Firestore updated: isOnline: false.");
        } catch (dbError) {
            console.error("[ProfileForm Tracking] Error setting user offline in Firestore:", dbError);
            toast({ title: "Database Error", description: "Could not update offline status.", variant: "destructive" });
        }
      }
    };

    // Only call manageLiveLocation if the 'isOnline' field was actually changed by the user
    // or if the form was submitted (though isOnline is more of a live toggle).
    if (form.formState.dirtyFields.isOnline || (form.formState.isSubmitted && form.getFieldState("isOnline").isDirty)) {
         manageLiveLocation(watchedIsOnline);
    }


    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
        console.log("[ProfileForm Tracking] Cleaned up location watch on unmount/dependency change.");
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, watchedIsOnline, isFetchingProfile, toast, form]);
  // Removed form.formState.dirtyFields.isOnline from deps to avoid potential loop if not careful with setValue
  // It's checked inside the effect logic now. Added `form` to deps.

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

  async function onSubmit(values: ProfileFormValues) {
    if (!authUser || !auth) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    console.log("[ProfileForm onSubmit] Saving profile with values:", values);

    // isOnline and live lat/lng are handled by the useEffect.
    // This onSubmit saves other profile details.
    const { profilePicture, profilePictureUrl, isOnline: formIsOnlineValue, locationAddress, ...dataForAuthAndFirestore } = values;
    let newAuthPhotoURL = profilePictureUrl || authUser.photoURL || "";
    
    setIsUploadingPicture(true);
    if (profilePicture && profilePicture.length > 0) {
      const fileToUpload = profilePicture[0];
      toast({ title: "Uploading Picture...", description: "Your new profile picture is being uploaded." });
      try {
        const downloadURL = await uploadProfilePicture(authUser.uid, fileToUpload);
        newAuthPhotoURL = downloadURL;
      } catch (uploadError: any) {
        toast({ title: "Upload Failed", description: `Could not upload profile picture: ${uploadError.message || 'Please try again.'}`, variant: "destructive" });
        setIsUploadingPicture(false);
        return;
      }
    } else if (previewImage === null && (authUser.photoURL || profilePictureUrl)) {
      newAuthPhotoURL = "";
    }
    setIsUploadingPicture(false);

    try {
      const authUpdates: { displayName?: string; photoURL?: string | null } = {};
      if (values.fullName !== (authUser.displayName || "")) {
        authUpdates.displayName = values.fullName;
      }
      const photoURLForAuth = newAuthPhotoURL === undefined ? null : newAuthPhotoURL;
      if (photoURLForAuth !== (authUser.photoURL || null)) {
        authUpdates.photoURL = photoURLForAuth;
      }

      if (Object.keys(authUpdates).length > 0) {
        await updateAuthProfile(authUser, authUpdates);
      }
      
      // Prepare Firestore data - preserve live lat/lng if available
      const existingProfile = await getUserProfile(authUser.uid);
      const finalDataToSaveToFirestore: Partial<User> = {
        ...dataForAuthAndFirestore,
        fullName: values.fullName, 
        profilePictureUrl: newAuthPhotoURL,
        location: { 
            lat: existingProfile?.location?.lat, 
            lng: existingProfile?.location?.lng, 
            address: values.locationAddress || ""
        },
        // isOnline is handled by its own useEffect, don't overwrite from form submit unless intended
        // isOnline: values.isOnline, 
        showContact: values.showContact,
        bio: values.bio,
      };
      
      await updateUserProfile(authUser.uid, finalDataToSaveToFirestore);
      console.log("[ProfileForm onSubmit] Profile successfully updated in Firestore with:", finalDataToSaveToFirestore);

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });

      const newResetValues = { ...values, profilePictureUrl: newAuthPhotoURL, profilePicture: undefined };
      form.reset(newResetValues, { keepDirtyValues: false, keepValues: false });
      setPreviewImage(newAuthPhotoURL || null);

    } catch (error: any) {
      console.error("[ProfileForm onSubmit] Error updating profile:", error);
      toast({ title: "Update Error", description: `Failed to update profile: ${error.message || 'Please try again.'}`, variant: "destructive" });
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
                  <FormControl><Input type="email" placeholder="your.email@example.com" {...field} value={field.value ?? ''} disabled /></FormControl>
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

            <FormField
              control={form.control}
              name="locationAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" /> Location Address (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., San Francisco, CA (for public display)" {...field} value={field.value ?? ''} /></FormControl>
                    <FormDescription>
                        A general address for display on your profile. Your precise map location is handled by the "Appear Online" switch.
                    </FormDescription>
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
                          Appear Online &amp; on Map
                        </FormLabel>
                        <FormDescription>
                          {field.value ? "You are set to appear online. Live location is active if permission granted." : "You are set to appear offline."}
                          {isLocationPermissionDenied && <span className="text-destructive block"> Location permission denied. Please enable it in browser settings.</span>}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            form.setValue("isOnline", checked, { shouldDirty: true });
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

            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || authLoading || isFetchingProfile || isUploadingPicture}>
              {(form.formState.isSubmitting || isUploadingPicture) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting || isUploadingPicture ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
    
