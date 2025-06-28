
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase"; 
import {
  createUserWithEmailAndPassword,
  updateProfile as updateAuthProfile,
  sendEmailVerification, // Import sendEmailVerification
} from "firebase/auth"; 
import { createUserProfile } from "@/services/userService"; // Import userService

const signUpSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." })
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpForm() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignUpFormValues) {
    form.clearErrors();
    if (!auth) {
      toast({ title: "Error", description: "Firebase Auth is not initialized.", variant: "destructive" });
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      if (user) {
        // Update Firebase Auth user's profile (displayName)
        const authProfilePromise = updateAuthProfile(user, {
          displayName: values.fullName,
        });

        // Create user profile document in Firestore
        const firestoreProfilePromise = createUserProfile(user.uid, {
          fullName: values.fullName,
          email: values.email,
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
          interests: [],
          favoriteUserIds: [], // Initialize favoriteUserIds
        });

        // Send verification email
        const emailVerificationPromise = sendEmailVerification(user);

        await Promise.all([
          authProfilePromise,
          firestoreProfilePromise,
          emailVerificationPromise,
        ]);

      } else {
        // This case should ideally not happen if createUserWithEmailAndPassword resolves successfully
        throw new Error("User creation succeeded but no user object was returned from Firebase Auth.");
      }

      toast({
        title: "Sign Up Successful!",
        description: "Please check your email to verify your account.",
      });
      console.log("Attempting to redirect to /verify-email from SignUpForm"); // Diagnostic log
      router.push("/verify-email"); 
    } catch (error: any) {
      console.error("Sign up process error details:", error); // More detailed error logging
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use. Please try another.";
        form.setError("email", { type: "manual", message: errorMessage });
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak. Please choose a stronger password.";
         form.setError("password", { type: "manual", message: errorMessage });
      } else if (error.message && (error.message.toLowerCase().includes("firestore") || error.message.toLowerCase().includes("client is offline"))) {
        errorMessage = "Your account was created, but there was an issue saving your full profile. You can try updating it from your profile page later.";
      } else if (error.message === "User creation succeeded but no user object was returned from Firebase Auth.") {
        errorMessage = "User account could not be fully initialized. Please try again.";
      }
      
      toast({
        title: "Sign Up Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl overflow-hidden"> {/* Added overflow-hidden to Card */}
      <CardHeader className="p-0"> {/* Removed padding from CardHeader */}
        <div className="overflow-hidden rounded-t-lg"> {/* Optional: if you want image to also have rounded top corners independent of card */}
          <div className="relative aspect-video w-full">
            <Image
              src="/home_image.jpg"
              alt="Profinder - Professional Networking"
              fill
              style={{ objectFit: 'cover' }}
              data-ai-hint="professional network"
            />
          </div>
        </div>
        <div className="p-6 text-center"> {/* Wrapper for text content with padding */}
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join Profinder to connect with professionals.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
