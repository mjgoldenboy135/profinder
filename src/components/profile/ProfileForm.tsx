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
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Loader2, BadgeCheck, MailWarning, Compass, Building2, MapPin } from "lucide-react";
import { sendVerificationEmail } from "@/services/authService";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { updateUserProfile, uploadProfilePicture, removeProfilePicture } from "@/services/userService";
import type { UserProfile } from "@/lib/types";
import { AVAILABILITY_OPTIONS } from "@/lib/types";
import { COMMON_PROFESSIONS } from "@/lib/professions";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const RESIZE_MAX_WIDTH = 800;
const RESIZE_MAX_HEIGHT = 800;

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters."),
  profilePicture: z.custom<FileList | undefined>().optional(),
  profile_picture_url: z.string().url().optional().or(z.literal("")),
  education: z.string().max(200, "Education details should not exceed 200 characters.").optional(),
  profession: z.string().max(100, "Profession should not exceed 100 characters.").optional(),
  company: z.string().max(150, "Company should not exceed 150 characters.").optional(),
  professional_details: z.string().max(250, "Professional details should not exceed 250 characters.").optional(),
  years_of_experience: z.coerce.number().min(0).optional(),
  linkedin_profile_url: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
  email: z.string().email(),
  phone_number: z.string().optional(),
  address: z.string().max(150, "Address should not exceed 150 characters.").optional(),
  bio: z.string().max(250, "Bio should not exceed 250 characters.").optional(),
  availability: z.enum(['none', 'open_to_work', 'hiring', 'networking', 'mentoring', 'collaborating']).default('none').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const defaultFormValues: ProfileFormValues = {
  full_name: "",
  email: "",
  profile_picture_url: "",
  education: "",
  profession: "",
  company: "",
  professional_details: "",
  years_of_experience: 0,
  linkedin_profile_url: "",
  phone_number: "",
  address: "",
  bio: "",
  availability: 'none',
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
  const { currentUser, currentUserProfile, loading: authLoading, refreshUserProfile } = useAuthContext();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [showProfessionSuggestions, setShowProfessionSuggestions] = useState(false);
  const professionBoxRef = useRef<HTMLDivElement>(null);

  const handleSendVerification = async () => {
    setIsSendingVerification(true);
    try {
      const message = await sendVerificationEmail();
      toast({ title: "Verification Email Sent", description: message });
    } catch (error: any) {
      toast({ title: "Could Not Send Email", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultFormValues,
  });

  const watchedProfession = form.watch("profession");

  // On-page profession suggestions (not the browser's datalist / keyboard
  // strip). Typing is never blocked — the field stays free text and the list
  // is purely optional.
  const professionSuggestions = useMemo(() => {
    const q = (watchedProfession || "").trim().toLowerCase();
    if (!q) return [];
    const matches = COMMON_PROFESSIONS.filter((p) => p.toLowerCase().includes(q));
    if (matches.length === 1 && matches[0].toLowerCase() === q) return [];
    return matches.slice(0, 8);
  }, [watchedProfession]);

  useEffect(() => {
    if (!showProfessionSuggestions) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (professionBoxRef.current && !professionBoxRef.current.contains(e.target as Node)) {
        setShowProfessionSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [showProfessionSuggestions]);

  const resetFormWithProfileData = useCallback((profile: UserProfile | null) => {
    if (currentUser && profile) {
      const initialData: ProfileFormValues = {
        ...defaultFormValues,
        full_name: profile.full_name || "",
        email: profile.email || "",
        profile_picture_url: profile.profile_picture_url || "",
        education: profile.education || "",
        profession: profile.profession || "",
        company: profile.company || "",
        professional_details: profile.professional_details || "",
        years_of_experience: profile.years_of_experience || 0,
        linkedin_profile_url: profile.linkedin_profile_url || "",
        phone_number: profile.phone_number || "",
        address: profile.address || "",
        bio: profile.bio || "",
        availability: profile.availability || 'none',
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

    const { profilePicture, profile_picture_url: currentFormPicUrl } = values;
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
        // User cleared their picture: persist the removal on the backend.
        if (currentUserProfile?.profile_picture_url) {
          try {
            await removeProfilePicture();
          } catch (removeError) {
            console.warn("Failed to remove profile picture:", removeError);
          }
        }
        newPicUrl = "";
      }

      const finalData: Partial<UserProfile> = {
        full_name: values.full_name,
        education: values.education,
        profession: values.profession,
        company: values.company,
        professional_details: values.professional_details,
        years_of_experience: values.years_of_experience,
        linkedin_profile_url: values.linkedin_profile_url,
        phone_number: values.phone_number,
        address: values.address,
        bio: values.bio,
        availability: values.availability,
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

  if (authLoading || isFetchingProfile) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading profile...</p></div>;
  }

  if (!currentUser) {
    return <p className="text-center py-10">Please log in to view and edit your profile.</p>;
  }

  const currentFullName = form.watch("full_name") || "";
  const initials = currentFullName.split(" ").map(n => n[0]).join("").toUpperCase() || "?";

  const isSaveDisabled = form.formState.isSubmitting || authLoading || isFetchingProfile || isUploadingPicture || isResizingImage;

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

            {currentUserProfile && (
              currentUserProfile.email_verified ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                  <BadgeCheck className="h-5 w-5 shrink-0" />
                  <span>Your email is verified.</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3">
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 flex-1">
                    <MailWarning className="h-5 w-5 shrink-0" />
                    <span>Your email isn&apos;t verified yet. Verify it to secure your account.</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendVerification}
                    disabled={isSendingVerification}
                    className="shrink-0"
                  >
                    {isSendingVerification && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSendingVerification ? "Sending..." : "Send Verification Email"}
                  </Button>
                </div>
              )
            )}
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
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Compass className="mr-2 h-5 w-5 text-primary" /> What I&apos;m Here For</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your availability" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Let others know what you&apos;re looking for. Shown as a tag on your profile and used in discovery filters.
                  </FormDescription>
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
                    <div className="relative" ref={professionBoxRef}>
                      <Input
                        placeholder="e.g., Software Engineer, Marketing Manager"
                        {...field}
                        value={field.value ?? ""}
                        maxLength={100}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        onChange={(e) => { field.onChange(e); setShowProfessionSuggestions(true); }}
                        onFocus={() => setShowProfessionSuggestions(true)}
                        role="combobox"
                        aria-expanded={showProfessionSuggestions && professionSuggestions.length > 0}
                        aria-autocomplete="list"
                      />
                      {showProfessionSuggestions && professionSuggestions.length > 0 && (
                        <ul
                          role="listbox"
                          className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg z-50"
                        >
                          {professionSuggestions.map((prof) => (
                            <li key={prof} role="option">
                              <button
                                type="button"
                                // onMouseDown fires before blur so the click isn't
                                // lost, and preventDefault keeps focus in the input
                                // so typing is never interrupted.
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  field.onChange(prof);
                                  setShowProfessionSuggestions(false);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                {prof}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Type freely, or pick a suggestion. Max 100 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Building2 className="mr-2 h-5 w-5 text-primary" /> Company / Organisation</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., XYZ Company" {...field} value={field.value ?? ''} maxLength={150} />
                  </FormControl>
                  <FormDescription>
                    Shown next to your profession, e.g. &quot;Doctor at XYZ Hospital&quot;. Max 150 characters.
                  </FormDescription>
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
                  <FormLabel className="flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" /> City / Address (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Riyadh, Saudi Arabia" {...field} value={field.value ?? ''} maxLength={150} /></FormControl>
                  <FormDescription>
                    Your city or general address, shown on your profile. Max 150 characters. Your precise live map location is controlled separately in Status &amp; Privacy.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full sm:w-auto" disabled={isSaveDisabled}>
              {(form.formState.isSubmitting || isUploadingPicture || isResizingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isResizingImage ? "Processing Image..." : (isUploadingPicture ? "Uploading..." : (form.formState.isSubmitting ? "Saving Profile..." : "Save Changes"))}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
