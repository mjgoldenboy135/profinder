"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import type { ProfileFormData } from "@/lib/types";
import { getCurrentUser } from "@/lib/placeholder-data"; // For fetching initial data
import Image from "next/image";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  profilePicture: z.any().optional(), // Handling file upload separately
  profilePictureUrl: z.string().url().optional().or(z.literal("")),
  education: z.string().optional(),
  profession: z.string().optional(),
  professionalDetails: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).optional(),
  linkedinProfileUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
  email: z.string().email(), // Usually pre-filled and potentially not editable or carefully handled
  phoneNumber: z.string().optional(),
  // Placeholder for privacy settings
  showContact: z.boolean().optional().default(false),
  showLocation: z.boolean().optional().default(false),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<ProfileFormData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching current user data
    const user = getCurrentUser(); // Assuming this returns full user data
    setCurrentUser(user);
    setPreviewImage(user.profilePictureUrl || null);
    form.reset({
      ...user,
      yearsOfExperience: user.yearsOfExperience ?? 0,
      // Map privacy settings if they exist
      showContact: user.profilePrivacySettings?.showContact === 'all',
      showLocation: user.profilePrivacySettings?.showLocation === 'all',
    });
  }, []);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: currentUser?.fullName || "",
      education: currentUser?.education || "",
      profession: currentUser?.profession || "",
      professionalDetails: currentUser?.professionalDetails || "",
      yearsOfExperience: currentUser?.yearsOfExperience || 0,
      linkedinProfileUrl: currentUser?.linkedinProfileUrl || "",
      email: currentUser?.email || "",
      phoneNumber: currentUser?.phoneNumber || "",
      profilePictureUrl: currentUser?.profilePictureUrl || "",
      showContact: currentUser?.profilePrivacySettings?.showContact === 'all' || false,
      showLocation: currentUser?.profilePrivacySettings?.showLocation === 'all' || false,
    },
  });

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
      setPreviewImage(currentUser?.profilePictureUrl || null); // Revert to original if no file selected
       form.setValue("profilePicture", undefined);
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const { profilePicture, ...dataToSave } = values;
    
    if (profilePicture && profilePicture.length > 0) {
      // Handle image upload here, get URL, and save it
      // For demo, we'll use the preview image URL if it's a data URL
      if (previewImage && previewImage.startsWith('data:')) {
        dataToSave.profilePictureUrl = 'https://placehold.co/150x150.png?text=NewPic'; // Placeholder for uploaded image
      }
    } else if (!previewImage && currentUser?.profilePictureUrl) {
        // If preview is cleared and there was an original image, it means user wants to remove it
        dataToSave.profilePictureUrl = ""; 
    }


    console.log("Profile update data:", dataToSave);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been successfully saved.",
    });
  }

  if (!currentUser) {
    return <p>Loading profile...</p>; // Or a skeleton loader
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
                        {currentUser?.fullName?.[0].toUpperCase() || '?'}
                    </div>
                )}
                 <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel htmlFor="profilePictureInput" className={Button({variant: "outline", size:"sm"}).className + " cursor-pointer"}>
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
                        form.setValue("profilePicture", undefined); // Clear the file input
                        form.setValue("profilePictureUrl", ""); // Indicate removal if submitted
                    }}>Remove Picture</Button>
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
                  <FormDescription>Email cannot be changed after sign up (for this demo).</FormDescription>
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
                   <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select years of experience" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[...Array(21).keys()].map(year => ( // 0-20 years
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
                  <FormControl><Input type="tel" placeholder="Your phone number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card>
              <CardHeader><CardTitle className="text-lg font-headline">Privacy Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="showContact"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Show Contact Information</FormLabel>
                        <FormDescription>Allow others to see your email and phone number.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showLocation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Share Location on Map</FormLabel>
                        <FormDescription>Allow others to see your location on the map.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
