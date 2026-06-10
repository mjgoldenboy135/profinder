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
import { Eye, Globe, Heart, Loader2, MapPin, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { updateUserProfile, uploadProfilePicture } from "@/services/userService";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { UserProfile } from "@/lib/types";
import { COMMON_PROFESSIONS } from "@/lib/professions";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const RESIZE_MAX_WIDTH = 300;
const RESIZE_MAX_HEIGHT = 300;

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters."),
  profilePicture: z.custom<FileList | undefined>().optional(),
  profile_picture_url: z.string().url().optional().or(z.literal("")),
  education: z.string().max(200, "Education details should not exceed 200 characters.").optional(),
  profession: z.string().max(100, "Profession should not exceed 100 characters.").optional(),
  professional_details: z.string().max(250, "Professional details should not exceed 250 characters.").optional(),
  years_of_experience: z.coerce.number().min(0).optional(),
  linkedin_profile_url: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
  email: z.string().email(),
  phone_number: z.string().optional(),
  address: z.string().max(150, "Location address should not exceed 150 characters.").optional(),
  is_online: z.boolean().optional().default(false),
  show_contact: z.boolean().optional().default(false),
  bio: z.string().max(250, "Bio should not exceed 250 characters.").optional(),
  location_visibility: z.enum(['public', 'favorites', 'none']).default('public').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const defaultFormValues: ProfileFormValues = {
  full_name: "",
  email: "",
  profile_picture_url: "",
  education: "",
  profession: "",
  professional_details: "",
  years_of_experience: 0,
  linkedin_profile_url: "",
  phone_number: "",
  address: "",
  is_online: false,
  show_contact: false,
  bio: "",
  location_visibility: 'public',
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
        if (!ctx) return reject(new Error("Could not get canvas context"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Canvas to Blob conversion failed"));
            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          },
          "image/jpeg",
          0.85
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
  const router = useRouter();
  const { currentUser, currentUserProfile, loading: authLoading, refreshUserProfile, logout } = useAuthContext();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false);
  const locationWatchId = useRef<number | null>(null);
  const [isLocationPermissionDenied, setIsLocationPermissionDenied] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultFormValues,
  });

  const watchedIsOnline = form.watch("is_online");
  const watchedLocationVisibility = form.watch("location_visibility");
  const watchedAddress = form.watch("address");

  const resetFormWithProfileData = useCallback((profile: UserProfile | null) => {
    if (currentUser && profile) {
      const initialData: ProfileFormValues = {
        ...defaultFormValues,
        full_name: profile.full_name || "",
        email: profile.email || "",
        profile_picture_url: profile.profile_picture_url || "",
        education: profile.education || "",
        profession: profile.profession || "",
        professional_details: profile.professional_details || "",
        years_of_experience: profile.years_of_experience || 0,
        linkedin_profile_url: profile.linkedin_profile_url || "",
        phone_number: profile.phone_number || "",
        address: profile.address || "",
        is_online: profile.location_visibility === 'none' ? false : (profile.is_online || false),
        show_contact: profile.show_contact || false,
        bio: profile.bio || "",
        location_visibility: profile.location_visibility || 'public',
      };
      form.reset(initialData);
      setPreviewImage(profile.profile_picture_url || null);
    }
  }, [currentUser, form]);

  useEffect(() => {
    if (!authLoading && currentUserProfile) {
      resetFormWithProfileData(currentUserProfile);
      setIsFetchingProfile(false);
    } else if (!authLoading && !currentUser) {
      form.reset(defaultFormValues);
      setPreviewImage(null);
      setIsFetchingProfile(false);
    }
  }, [currentUser, currentUserProfile, authLoading, resetFormWithProfileData, form]);

  useEffect(() => {
    if (watchedLocationVisibility === 'none') {
      if (form.getValues("is_online")) {
        form.setValue("is_online", false, { shouldDirty: true });
      }
    }
  }, [watchedLocationVisibility, form]);

  useEffect(() => {
    if (!currentUser || isFetchingProfile || form.formState.isSubmitting || typeof watchedIsOnline === 'undefined') {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      return;
    }

    const manageLiveLocation = async (enable: boolean) => {
      const currentAddress = watchedAddress || "";

      if (enable && watchedLocationVisibility !== 'none') {
        setIsLocationPermissionDenied(false);
        if (!navigator.geolocation) {
          toast({ title: "Geolocation Not Supported", description: "Live location tracking is not available on your browser.", variant: "destructive" });
          form.setValue("is_online", false, { shouldDirty: true });
          await apiFetch('/auth/online/', { method: 'POST', body: JSON.stringify({ is_online: false }) });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await updateUserProfile(currentUser.id, {
                is_online: true,
                lat: latitude,
                lng: longitude,
                address: currentAddress,
                location_visibility: watchedLocationVisibility,
              });
              toast({ title: "You are now Online!", description: "Your location is being shared based on your visibility settings." });
            } catch (dbError) {
              toast({ title: "Database Error", description: "Could not save online status.", variant: "destructive" });
              form.setValue("is_online", false, { shouldDirty: true });
              return;
            }
            if (locationWatchId.current !== null) navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = navigator.geolocation.watchPosition(
              async (pos) => {
                try {
                  await updateUserProfile(currentUser.id, {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    address: form.getValues("address") || "",
                  });
                } catch (watchDbError) {
                  console.warn("Silent fail for watch position update:", watchDbError);
                }
              },
              (watchErr) => {
                console.error("Location Tracking Error:", watchErr);
              },
              { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
            );
          },
          async (error) => {
            let message = "Could not get your location to go online.";
            if (error.code === error.PERMISSION_DENIED) {
              message = "Location permission denied. Please enable it in your browser settings.";
              setIsLocationPermissionDenied(true);
            } else {
              message = `Could not get location: ${error.message}. Please try again.`;
            }
            toast({ title: "Location Error", description: message, variant: "destructive" });
            form.setValue("is_online", false, { shouldDirty: true });
            try {
              await updateUserProfile(currentUser.id, { is_online: false });
            } catch {}
          }
        );
      } else {
        if (locationWatchId.current !== null) {
          navigator.geolocation.clearWatch(locationWatchId.current);
          locationWatchId.current = null;
        }
        const isCurrentlyOnline = form.getValues("is_online");
        if (isCurrentlyOnline || watchedLocationVisibility === 'none') {
          try {
            await updateUserProfile(currentUser.id, { is_online: false });
            if (enable === false && watchedLocationVisibility !== 'none') {
              toast({ title: "You are now Offline", description: "You will no longer appear on the map." });
            }
          } catch (dbError) {
            toast({ title: "Database Error", description: "Could not update offline status.", variant: "destructive" });
          }
        }
      }
    };

    manageLiveLocation(watchedIsOnline);

    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, watchedIsOnline, watchedLocationVisibility, watchedAddress, isFetchingProfile, form.formState.isSubmitting]);


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
            description: `After resizing, the image is still too large. Please try a smaller original image.`,
            variant: "destructive",
          });
          event.target.value = "";
          setPreviewImage(form.getValues("profile_picture_url") || null);
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
        form.setValue("profile_picture_url", "", { shouldDirty: true });
        toast({ title: "Image Ready", description: "Resized image is ready for preview. Save changes to upload." });

      } catch (error) {
        console.error("Error resizing image:", error);
        toast({
          title: "Image Processing Failed",
          description: "Could not process the image. Please try another one.",
          variant: "destructive",
        });
        setPreviewImage(form.getValues("profile_picture_url") || null);
        event.target.value = "";
      } finally {
        setIsResizingImage(false);
      }
    } else {
      const existingUrl = form.getValues("profile_picture_url");
      setPreviewImage(existingUrl || null);
      form.setValue("profilePicture", undefined, { shouldDirty: true });
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }

    const { profilePicture, profile_picture_url: currentFormPicUrl, ...dataForApi } = values;
    let newPicUrl = currentFormPicUrl || currentUserProfile?.profile_picture_url || "";

    try {
      if (profilePicture && profilePicture.length > 0) {
        const fileToUpload = profilePicture[0];
        setIsUploadingPicture(true);
        try {
          newPicUrl = await uploadProfilePicture(currentUser.id, fileToUpload);
        } catch (uploadError: any) {
          toast({ title: "Upload Failed", description: uploadError.message || "Could not upload profile picture.", variant: "destructive" });
          throw uploadError;
        } finally {
          setIsUploadingPicture(false);
        }
      } else if (previewImage === null) {
        newPicUrl = "";
      }

      const finalIsOnline = values.location_visibility === 'none' ? false : values.is_online;

      const finalData: Partial<UserProfile> = {
        full_name: values.full_name,
        education: values.education,
        profession: values.profession,
        professional_details: values.professional_details,
        years_of_experience: values.years_of_experience,
        linkedin_profile_url: values.linkedin_profile_url,
        phone_number: values.phone_number,
        address: values.address,
        is_online: finalIsOnline,
        show_contact: values.show_contact,
        bio: values.bio,
        location_visibility: values.location_visibility,
      };

      await updateUserProfile(currentUser.id, finalData);

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });

      form.reset({
        ...values,
        profile_picture_url: newPicUrl || "",
        profilePicture: undefined,
        is_online: finalIsOnline,
      });
      setPreviewImage(newPicUrl || null);
      if (refreshUserProfile) await refreshUserProfile();

    } catch (error: any) {
      console.error("Error during profile submission:", error);
      if (!error.message?.includes("upload")) {
        toast({ title: "Update Error", description: `Failed to update profile: ${error.message || 'Please try again.'}`, variant: "destructive" });
      }
    } finally {
      if (isUploadingPicture) setIsUploadingPicture(false);
    }
  }

  const handleDeleteProfile = async () => {
    if (!currentUser) return;
    setIsDeletingProfile(true);
    try {
      await apiFetch(`/users/${currentUser.id}/`, { method: 'DELETE' });
      logout();
      toast({
        title: "Profile Deleted",
        description: "Your account has been permanently removed.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast({
        title: "Deletion Failed",
        description: "Could not delete profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingProfile(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (authLoading || isFetchingProfile) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading profile...</p></div>;
  }

  if (!currentUser) {
    return <p className="text-center py-10">Please log in to view and edit your profile.</p>;
  }

  const currentFullName = form.watch("full_name") || "";
  const initials = currentFullName.split(" ").map(n => n[0]).join("").toUpperCase() || "?";

  const isSaveDisabled = form.formState.isSubmitting || authLoading || isFetchingProfile || isUploadingPicture || isResizingImage;
  const isOnlineSwitchDisabled = watchedLocationVisibility === 'none';

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
                <Image src={previewImage} alt="Profile Preview" width={150} height={150} className="rounded-full object-cover ring-2 ring-primary" data-ai-hint="user avatar" />
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
                    <FormLabel htmlFor="profilePictureInput" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer", (isUploadingPicture || isResizingImage) && "opacity-50 cursor-not-allowed")}>
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
                        disabled={isUploadingPicture || isResizingImage}
                        key={previewImage || Date.now()}
                      />
                    </FormControl>
                    <FormDescription>
                      Max file size: {MAX_FILE_SIZE_MB}MB. JPG, PNG, GIF, WEBP. Images are auto-resized.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {previewImage && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setPreviewImage(null);
                  form.setValue("profilePicture", undefined, { shouldDirty: true });
                  form.setValue("profile_picture_url", "", { shouldDirty: true });
                }} disabled={isUploadingPicture || isResizingImage}>Remove Picture</Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="full_name"
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
                  <FormControl><Textarea placeholder="A brief introduction about yourself." {...field} value={field.value ?? ''} maxLength={250} /></FormControl>
                  <FormDescription>Max 250 characters.</FormDescription>
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
                  <FormControl>
                    <Input
                      list="profession-options"
                      placeholder="e.g., Software Engineer, Marketing Manager"
                      {...field}
                      value={field.value ?? ""}
                      maxLength={100}
                    />
                  </FormControl>
                  <datalist id="profession-options">
                    {COMMON_PROFESSIONS.map((prof) => (
                      <option key={prof} value={prof} />
                    ))}
                  </datalist>
                  <FormDescription>Max 100 characters.</FormDescription>
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
                  <FormControl><Textarea placeholder="e.g., B.Sc. Computer Science from XYZ University (2020)" {...field} value={field.value ?? ''} maxLength={200} /></FormControl>
                  <FormDescription>Max 200 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="professional_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Details / Experience</FormLabel>
                  <FormControl><Textarea rows={5} placeholder="Describe your skills, work history, achievements, and professional interests." {...field} value={field.value ?? ''} maxLength={250} /></FormControl>
                  <FormDescription>Max 250 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="years_of_experience"
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
              name="linkedin_profile_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn Profile URL</FormLabel>
                  <FormControl><Input placeholder="https://linkedin.com/in/yourprofile" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number"
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" /> Location Address (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., San Francisco, CA (for public display)" {...field} value={field.value ?? ''} maxLength={150} /></FormControl>
                  <FormDescription>
                    Max 150 characters. A general address for display on your profile. Your precise map location is handled by the &quot;Appear Online&quot; switch.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card>
              <CardHeader><CardTitle className="text-lg font-headline">Status &amp; Privacy</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="location_visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Eye className="mr-2 h-5 w-5 text-primary" /> Location Visibility on Map</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'public'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select who can see your location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" /> Public on Map
                            </div>
                          </SelectItem>
                          <SelectItem value="favorites">
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4" /> Visible to My Favorites Only
                            </div>
                          </SelectItem>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" /> Private (Not on Map)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === 'public' && "Your location is visible to everyone on the map when you're online."}
                        {field.value === 'favorites' && "Only users you've favorited can see your location on the map when you're online."}
                        {field.value === 'none' && "Your location will not be shared on the map, regardless of the 'Appear Online' switch."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_online"
                  render={({ field }) => (
                    <FormItem className={cn("flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm", isOnlineSwitchDisabled && "opacity-70")}>
                      <div className="space-y-0.5">
                        <FormLabel className={cn("flex items-center", isOnlineSwitchDisabled && "cursor-not-allowed")}>
                          <Globe className="mr-2 h-5 w-5 text-primary" />
                          Appear Online &amp; on Map
                        </FormLabel>
                        <FormDescription className={cn(isOnlineSwitchDisabled && "cursor-not-allowed")}>
                          {isOnlineSwitchDisabled
                            ? "Set Location Visibility above to 'Public' or 'Favorites' to enable this."
                            : (field.value ? "You are set to appear online. Live location is active if permission granted." : "You are set to appear offline.")
                          }
                          {isLocationPermissionDenied && !isOnlineSwitchDisabled && <span className="text-destructive block"> Location permission denied. Please enable it in browser settings.</span>}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={isOnlineSwitchDisabled ? false : field.value}
                          onCheckedChange={field.onChange}
                          disabled={isOnlineSwitchDisabled}
                          aria-readonly={isOnlineSwitchDisabled}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="show_contact"
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
              {isResizingImage ? "Processing Image..." : (isUploadingPicture ? "Uploading..." : (form.formState.isSubmitting ? "Saving Profile..." : "Save Changes"))}
            </Button>
          </form>
        </Form>
        <div className="mt-6">
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="w-full sm:w-auto">Delete Profile</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your profile. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingProfile}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProfile}
                  disabled={isDeletingProfile}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isDeletingProfile ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
