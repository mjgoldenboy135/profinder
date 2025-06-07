
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
  locationAddress: z.string().optional(), // User-settable display address
  isOnline: z.boolean().optional().default(false), // Controls live tracking and map visibility
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
        ...(firestoreProfile || {}), // Spread firestore profile first
        fullName: authUser.displayName || firestoreProfile?.fullName || "",
        email: authUser.email || firestoreProfile?.email || "",
        profilePictureUrl: initialProfilePictureUrl,
        education: firestoreProfile?.education || "",
        profession: firestoreProfile?.profession || "",
        professionalDetails: firestoreProfile?.professionalDetails || "",
        yearsOfExperience: firestoreProfile?.yearsOfExperience || 0,
        linkedinProfileUrl: firestoreProfile?.linkedinProfileUrl || "",
        phoneNumber: firestoreProfile?.phoneNumber || "",
        locationAddress: firestoreProfile?.location?.address || "", // Only address from profile
        isOnline: firestoreProfile?.isOnline || false, // isOnline from profile
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
          resetFormWithProfileData(null); // Reset with authUser data only
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
    if (!authUser || isFetchingProfile || !form.formState.isDirty || form.formState.dirtyFields.isOnline === undefined) {
      // Only proceed if authUser exists, profile is loaded, and the isOnline field was actually changed by the user.
      // This prevents running on initial load unless isOnline was explicitly toggled.
      return;
    }

    const manageLiveLocation = async (enable: boolean) => {
      if (enable) {
        setIsLocationPermissionDenied(false); // Reset permission denied state
        if (!navigator.geolocation) {
          toast({ title: "Geolocation Not Supported", description: "Live location tracking is not available on your browser.", variant: "destructive" });
          form.setValue("isOnline", false); // Revert switch
          await updateUserProfile(authUser.uid, { isOnline: false });
          return;
        }

        // Attempt to get current position first to check permissions and get initial fix
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await updateUserProfile(authUser.uid, {
              isOnline: true,
              location: { lat: latitude, lng: longitude, address: form.getValues("locationAddress") || "" },
            });
            toast({ title: "You are now Online!", description: "Your location is being shared on the map." });

            // If successful, start watching
            if (locationWatchId.current !== null) navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = navigator.geolocation.watchPosition(
              async (pos) => {
                try {
                  await updateUserProfile(authUser.uid, {
                    location: { lat: pos.coords.latitude, lng: pos.coords.longitude, address: form.getValues("locationAddress") || "" },
                    // isOnline remains true
                  });
                } catch (watchError) {
                  console.error("[ProfileForm Tracking] Error updating live location in Firestore:", watchError);
                }
              },
              (watchErr) => { // Error callback for watchPosition
                console.error("[ProfileForm Tracking] Error watching position:", watchErr);
                // Don't repeatedly toast, but log. Consider if user should be taken offline if watch fails.
              },
              { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
            );
          },
          async (error) => { // Error callback for getCurrentPosition
            console.error("[ProfileForm Tracking] Error getting current position:", error);
            let message = "Could not get your location to go online.";
            if (error.code === error.PERMISSION_DENIED) {
              message = "Location permission denied. Cannot go online on the map.";
              setIsLocationPermissionDenied(true);
            }
            toast({ title: "Location Error", description: message, variant: "destructive" });
            form.setValue("isOnline", false); // Revert switch in UI
            await updateUserProfile(authUser.uid, { isOnline: false }); // Revert in DB
          }
        );
      } else { // Disabling: isOnline is false
        if (locationWatchId.current !== null) {
          navigator.geolocation.clearWatch(locationWatchId.current);
          locationWatchId.current = null;
          console.log("[ProfileForm Tracking] Stopped location watch.");
        }
        await updateUserProfile(authUser.uid, { isOnline: false });
        toast({ title: "You are now Offline", description: "You will no longer appear on the map." });
      }
    };

    manageLiveLocation(watchedIsOnline);

    // Cleanup function for the useEffect
    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
        console.log("[ProfileForm Tracking] Cleaned up location watch on unmount/dependency change.");
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, watchedIsOnline, isFetchingProfile, form.formState.isDirty, form.formState.dirtyFields.isOnline, toast, form]);


  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("profilePicture", event.target.files);
      form.setValue("profilePictureUrl", ""); // Clear URL if new file is selected
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

    // isOnline and live location are handled by the useEffect.
    // We only save other profile details here.
    let { profilePicture, profilePictureUrl, isOnline: formIsOnlineValue, locationAddress, ...dataForAuthAndFirestore } = values;
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
      // If preview is null (user removed picture) and there was an existing URL.
      newAuthPhotoURL = "";
    }
    setIsUploadingPicture(false);

    // Location data for general profile display (address)
    // The live lat/lng for map is handled by the useEffect for isOnline switch
    const profileLocationData: Partial<User['location']> = {
        address: locationAddress || "",
    };
    // Preserve existing lat/lng if they exist from live tracking unless explicitly cleared
    const existingProfile = await getUserProfile(authUser.uid);
    if (existingProfile?.location?.lat && existingProfile?.location?.lng) {
        profileLocationData.lat = existingProfile.location.lat;
        profileLocationData.lng = existingProfile.location.lng;
    }


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

      // Data to save to Firestore:
      // - isOnline is managed by its own useEffect.
      // - live lat/lng for map is managed by its own useEffect.
      // - This onSubmit saves the rest of the profile info.
      const finalDataToSaveToFirestore: Partial<User> = {
        ...dataForAuthAndFirestore,
        fullName: values.fullName, 
        profilePictureUrl: newAuthPhotoURL,
        location: { // Save user-provided address, preserve live lat/lng if any
            lat: existingProfile?.location?.lat, // Keep existing live lat if available
            lng: existingProfile?.location?.lng, // Keep existing live lng if available
            address: values.locationAddress || ""
        },
        // isOnline: values.isOnline, // This is handled by the useEffect
        showContact: values.showContact,
        bio: values.bio,
      };
      
      await updateUserProfile(authUser.uid, finalDataToSaveToFirestore);

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });

      // Reset form state properly after successful submission
      const newResetValues = { ...values, profilePictureUrl: newAuthPhotoURL, profilePicture: undefined };
      form.reset(newResetValues, { keepDirtyValues: false, keepValues: false });
      setPreviewImage(newAuthPhotoURL || null);

    } catch (error: any) {
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
                        form.setValue("profilePictureUrl", ""); // Clear the URL as well
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
                        A general address for display on your profile. Your precise location for the map is handled by the "Appear Online" switch.
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
                          {field.value ? "You are set to appear online. Live location is active." : "You are set to appear offline."}
                          {field.value && isLocationPermissionDenied && <span className="text-destructive block"> Location permission denied.</span>}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            // This directly calls react-hook-form's onChange.
                            // The useEffect watching 'watchedIsOnline' will handle side effects (DB update, location tracking).
                            // Need to explicitly mark form as dirty if this is the only change.
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

    