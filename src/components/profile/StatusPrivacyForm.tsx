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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, Globe, Heart, Loader2, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/services/userService";
import { apiFetch } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

const schema = z.object({
  address: z.string().max(150, "Location address should not exceed 150 characters.").optional(),
  is_online: z.boolean().optional().default(false),
  show_contact: z.boolean().optional().default(false),
  location_visibility: z.enum(['public', 'favorites', 'none']).default('public').optional(),
});

type FormValues = z.infer<typeof schema>;

const defaults: FormValues = {
  address: "",
  is_online: false,
  show_contact: false,
  location_visibility: 'public',
};

export default function StatusPrivacyForm() {
  const { toast } = useToast();
  const { currentUser, currentUserProfile, loading: authLoading, refreshUserProfile } = useAuthContext();
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isLocationPermissionDenied, setIsLocationPermissionDenied] = useState(false);
  const locationWatchId = useRef<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const watchedIsOnline = form.watch("is_online");
  const watchedLocationVisibility = form.watch("location_visibility");
  const watchedAddress = form.watch("address");

  const resetFormWithProfileData = useCallback((profile: UserProfile | null) => {
    if (currentUser && profile) {
      form.reset({
        address: profile.address || "",
        is_online: profile.location_visibility === 'none' ? false : (profile.is_online || false),
        show_contact: profile.show_contact || false,
        location_visibility: profile.location_visibility || 'public',
      });
    }
  }, [currentUser, form]);

  useEffect(() => {
    if (!authLoading && currentUserProfile) {
      resetFormWithProfileData(currentUserProfile);
      setIsFetchingProfile(false);
    } else if (!authLoading && !currentUser) {
      form.reset(defaults);
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

  async function onSubmit(values: FormValues) {
    if (!currentUser) return;
    const finalIsOnline = values.location_visibility === 'none' ? false : values.is_online;
    try {
      await updateUserProfile(currentUser.id, {
        address: values.address,
        is_online: finalIsOnline,
        show_contact: values.show_contact,
        location_visibility: values.location_visibility,
      });
      toast({ title: "Settings Saved", description: "Your status & privacy settings have been updated." });
      form.reset({ ...values, is_online: finalIsOnline });
      if (refreshUserProfile) await refreshUserProfile();
    } catch (error: any) {
      toast({ title: "Update Error", description: error.message || "Please try again.", variant: "destructive" });
    }
  }

  const isOnlineSwitchDisabled = watchedLocationVisibility === 'none';

  if (authLoading || isFetchingProfile) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>;
  }

  if (!currentUser) {
    return <p className="text-center py-10">Please log in to manage your status &amp; privacy.</p>;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">Status &amp; Privacy</CardTitle>
        <CardDescription>Control your live location, map visibility, and what others can see.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Public on Map</div>
                      </SelectItem>
                      <SelectItem value="favorites">
                        <div className="flex items-center gap-2"><Heart className="h-4 w-4" /> Visible to My Favorites Only</div>
                      </SelectItem>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> Private (Not on Map)</div>
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
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
