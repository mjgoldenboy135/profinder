
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
import { Globe, Loader2, MapPin, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { getUserProfile, updateUserProfile, uploadProfilePicture } from "@/services/userService";
import type { User } from "@/lib/types";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const RESIZE_MAX_WIDTH = 300;
const RESIZE_MAX_HEIGHT = 300;

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

async function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Could not get canvas context"));
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Canvas to Blob conversion failed"));
            }
            // Use 'image/jpeg' for better compression and consistency
            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg", 
              lastModified: Date.now(),
            });
            console.log("Resized file size:", (resizedFile.size / 1024).toFixed(2), "KB");
            resolve(resizedFile);
          },
          "image/jpeg",
          0.85 // JPEG quality (0.0 to 1.0)
        );
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


export default function ProfileForm() {
  const { toast } = useToast();
  const { currentUser: authUser, loading: authLoading } = useAuthContext();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false); 
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
    
    // Only act if 'isOnline' was explicitly changed by the user or during form submission.
    // Check form.getFieldState("isOnline").isDirty for more precise check on user interaction.
    if (form.getFieldState("isOnline").isDirty || (form.formState.isSubmitted && form.getFieldState("isOnline").isDirty)) {
      const manageLiveLocation = async (enable: boolean) => {
        const currentAddress = form.getValues("locationAddress") || "";
        if (enable) {
          setIsLocationPermissionDenied(false);
          if (!navigator.geolocation) {
            toast({ title: "Geolocation Not Supported", description: "Live location tracking is not available on your browser.", variant: "destructive" });
            form.setValue("isOnline", false, { shouldDirty: false, shouldValidate: false });
            await updateUserProfile(authUser.uid, { isOnline: false });
            return;
          }
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const locationData = { lat: latitude, lng: longitude, address: currentAddress };
              try {
                  await updateUserProfile(authUser.uid, { isOnline: true, location: locationData });
                  toast({ title: "You are now Online!", description: "Your location is being shared." });
              } catch (dbError) {
                  toast({ title: "Database Error", description: "Could not save online status.", variant: "destructive" });
                  form.setValue("isOnline", false, { shouldDirty: false, shouldValidate: false });
                  return; 
              }
              if (locationWatchId.current !== null) navigator.geolocation.clearWatch(locationWatchId.current);
              locationWatchId.current = navigator.geolocation.watchPosition(
                async (pos) => {
                  const newLat = pos.coords.latitude;
                  const newLng = pos.coords.longitude;
                  const newLocationData = { lat: newLat, lng: newLng, address: form.getValues("locationAddress") || "" };
                  try {
                    await updateUserProfile(authUser.uid, { location: newLocationData });
                  } catch (watchDbError) {
                     // console.warn("Failed to update live location during watch:", watchDbError);
                  }
                },
                (watchErr) => {
                  toast({ title: "Location Tracking Error", description: `Could not update live location: ${watchErr.message}`, variant: "destructive" });
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
              );
            },
            async (error) => {
              let message = "Could not get your location to go online.";
              if (error.code === error.PERMISSION_DENIED) {
                message = "Location permission denied. Please enable it in your browser settings to appear on the map.";
                setIsLocationPermissionDenied(true);
              } else {
                message = `Could not get location: ${error.message}. Please try again.`;
              }
              toast({ title: "Location Error", description: message, variant: "destructive" });
              form.setValue("isOnline", false, { shouldDirty: false, shouldValidate: false });
              try {
                  await updateUserProfile(authUser.uid, { isOnline: false });
              } catch (dbError) {
                   // console.error("Error setting user offline after location permission denial:", dbError);
              }
            }
          );
        } else { 
          if (locationWatchId.current !== null) {
            navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = null;
          }
          try {
              await updateUserProfile(authUser.uid, { isOnline: false });
              toast({ title: "You are now Offline", description: "You will no longer appear on the map." });
          } catch (dbError) {
              toast({ title: "Database Error", description: "Could not update offline status.", variant: "destructive" });
          }
        }
      };
      manageLiveLocation(watchedIsOnline);
    }

    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    };
  // form.getFieldState needed for dirty check of 'isOnline'
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [authUser, watchedIsOnline, isFetchingProfile, toast, form.formState.isSubmitted, form.getValues, form.setValue]);


  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File Too Large",
          description: `Image is too large. Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        event.target.value = ""; 
        return;
      }

      setIsResizingImage(true);
      toast({ title: "Processing image...", description: "Resizing your image for optimal upload." });

      try {
        const resizedFile = await resizeImage(file, RESIZE_MAX_WIDTH, RESIZE_MAX_HEIGHT);
         if (resizedFile.size > MAX_FILE_SIZE_BYTES) {
          toast({
            title: "Resized File Still Too Large",
            description: `After resizing, the image is still too large (${(resizedFile.size / (1024*1024)).toFixed(2)}MB). Please try a smaller original image.`,
            variant: "destructive",
          });
          event.target.value = "";
          setPreviewImage(form.getValues("profilePictureUrl") || authUser?.photoURL || null); // Revert preview
          setIsResizingImage(false);
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(resizedFile);
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(resizedFile);
        form.setValue("profilePicture", dataTransfer.files, { shouldDirty: true });
        form.setValue("profilePictureUrl", "", { shouldDirty: true }); 
        toast({ title: "Image Ready", description: "Resized image is ready for preview. Save changes to upload." });

      } catch (error) {
        console.error("Error resizing image:", error);
        toast({
          title: "Image Processing Failed",
          description: "Could not process the image. Please try another one or a different format.",
          variant: "destructive",
        });
        setPreviewImage(form.getValues("profilePictureUrl") || authUser?.photoURL || null);
        event.target.value = ""; 
      } finally {
        setIsResizingImage(false);
      }
    } else {
      const existingUrl = form.getValues("profilePictureUrl") || authUser?.photoURL;
      setPreviewImage(existingUrl || null);
      form.setValue("profilePicture", undefined, { shouldDirty: true });
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!authUser || !auth) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }

    // Note: fullName and email are from `values` which are sourced from `authUser` and disabled in form
    // So, they reflect the auth state, not user input for these fields.
    const { profilePicture, profilePictureUrl: currentFormPicUrl, isOnline: formIsOnlineValue, locationAddress, ...dataForFirestore } = values;
    let newAuthPhotoURL = authUser.photoURL || currentFormPicUrl || ""; // Start with existing or form loaded URL
    
    toast({ title: "Saving Profile...", description: "Please wait." });
    
    try {
        if (profilePicture && profilePicture.length > 0) {
            const fileToUpload = profilePicture[0]; // Already resized
            setIsUploadingPicture(true);
            toast({ title: "Uploading Picture...", description: "Your new profile picture is being uploaded." });
            try {
                newAuthPhotoURL = await uploadProfilePicture(authUser.uid, fileToUpload);
                toast({ title: "Picture Uploaded!", description: "Profile picture updated successfully." });
            } catch (uploadError: any) {
                toast({ title: "Upload Failed", description: `Could not upload profile picture: ${uploadError.message || 'Please try again.'}`, variant: "destructive" });
                setIsUploadingPicture(false); 
                return; 
            } finally {
                setIsUploadingPicture(false);
            }
        } else if (previewImage === null && (authUser.photoURL || currentFormPicUrl)) {
            // User explicitly removed the picture by clearing preview and no new file
            newAuthPhotoURL = "";
        }

        // Update Firebase Auth profile (only photoURL might change if name is fixed)
        const authUpdates: { photoURL?: string | null } = {};
        const photoURLForAuth = newAuthPhotoURL === undefined ? null : newAuthPhotoURL;

        if (photoURLForAuth !== (authUser.photoURL || null)) { // Compare with null if authUser.photoURL is undefined
            authUpdates.photoURL = photoURLForAuth;
        }
        // Note: authUser.displayName is not updated here as per requirement.
        // It was set during signup and remains fixed.

        if (Object.keys(authUpdates).length > 0) {
            await updateAuthProfile(authUser, authUpdates);
        }
        
        const existingProfile = await getUserProfile(authUser.uid);
        const finalDataToSaveToFirestore: Partial<User> = {
            ...dataForFirestore, // contains other editable fields like bio, profession etc.
            // fullName and email are taken from `values`, which are from `authUser` due to disabled fields
            fullName: values.fullName, 
            email: values.email,
            profilePictureUrl: newAuthPhotoURL,
            location: { 
                // Preserve existing lat/lng if address changes but not online status
                lat: formIsOnlineValue ? existingProfile?.location?.lat : undefined, 
                lng: formIsOnlineValue ? existingProfile?.location?.lng : undefined, 
                address: values.locationAddress || ""
            },
            isOnline: formIsOnlineValue, // This is handled separately by the useEffect for real-time updates
            showContact: values.showContact,
            bio: values.bio,
        };
        
        await updateUserProfile(authUser.uid, finalDataToSaveToFirestore);

        toast({
            title: "Profile Updated",
            description: "Your profile information has been saved.",
        });

        // Reset form with the newly saved values to clear dirty state
        const newResetValues: ProfileFormValues = { 
          ...values, // Use current form values as base
          profilePictureUrl: newAuthPhotoURL, // Update with new URL
          profilePicture: undefined, // Clear the FileList
        };
        form.reset(newResetValues, { keepValues: true }); // Keep submitted values, clear dirty, errors
        setPreviewImage(newAuthPhotoURL || null);

    } catch (error: any) {
        toast({ title: "Update Error", description: `Failed to update profile: ${error.message || 'Please try again.'}`, variant: "destructive" });
    } finally {
        // Ensure all loading states are reset in the main submission flow too
        if (form.formState.isSubmitting) {
           // This is typically handled by react-hook-form itself, but good to be mindful
        }
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

  const isSaveDisabled = form.formState.isSubmitting || authLoading || isFetchingProfile || isUploadingPicture || isResizingImage;


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">Manage Your Profile</CardTitle>
        <CardDescription>Keep your professional information up to date. Full name and email cannot be changed.</CardDescription>
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
                    render={({ field }) => ( // field is not directly used for Input type="file" but needed for RHF context
                        <FormItem>
                        <FormLabel htmlFor="profilePictureInput" className={cn(buttonVariants({variant: "outline", size:"sm"}), "cursor-pointer", (isUploadingPicture || isResizingImage) && "opacity-50 cursor-not-allowed")}>
                            {(isUploadingPicture || isResizingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isResizingImage ? "Processing..." : (isUploadingPicture ? "Uploading..." : (previewImage ? "Change Picture" : "Upload Picture"))}
                        </FormLabel>
                        <FormControl>
                            <Input
                                id="profilePictureInput"
                                type="file"
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                className="hidden"
                                onChange={handleProfilePictureChange}
                                disabled={isUploadingPicture || isResizingImage} // Disable while processing/uploading
                            />
                        </FormControl>
                        <FormDescription>
                            Max file size: {MAX_FILE_SIZE_MB}MB. Images are automatically resized to {RESIZE_MAX_WIDTH}x{RESIZE_MAX_HEIGHT}px.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {previewImage && (
                    <Button variant="ghost" size="sm" onClick={() => {
                        setPreviewImage(null);
                        form.setValue("profilePicture", undefined, { shouldDirty: true });
                        form.setValue("profilePictureUrl", "", { shouldDirty: true }); 
                    }} disabled={isUploadingPicture || isResizingImage}>Remove Picture</Button>
                )}
            </div>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} value={field.value ?? ''} disabled /></FormControl>
                  <FormDescription>Your full name cannot be changed after signup.</FormDescription>
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
                   <FormDescription>Your email address cannot be changed after signup.</FormDescription>
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
                          onCheckedChange={field.onChange}
                          aria-readonly // Indicate it's controlled by form state
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

            <Button type="submit" className="w-full sm:w-auto" disabled={isSaveDisabled}>
              {(form.formState.isSubmitting || isUploadingPicture || isResizingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isResizingImage ? "Processing Image..." : (isUploadingPicture || form.formState.isSubmitting ? "Saving..." : "Save Changes")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
    

    
