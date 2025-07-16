
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
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
import { auth, googleProvider } from "@/lib/firebase"; // Import googleProvider
import { signInWithEmailAndPassword, signInWithRedirect, type UserCredential } from "firebase/auth"; // Import signInWithRedirect
import { getUserProfile, createUserProfile } from "@/services/userService"; // For checking/creating profile

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    form.clearErrors(); 
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        toast({
          title: "Email Not Verified",
          description: "Please verify your email address to continue.",
        });
        router.push("/verify-email");
        return;
      }
      
      toast({
        title: "Login Successful!",
        description: "Welcome back to Proximity Network.",
      });
      router.push("/map"); 
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Invalid email or password. Please try again.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        form.setError("email", { type: "manual", message: " " }); 
        form.setError("password", { type: "manual", message: " " }); 
      } else {
         errorMessage = "An unexpected error occurred. Please try again.";
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  async function handleGoogleLogin() {
    form.clearErrors();
    try {
      const result: UserCredential = await signInWithRedirect(auth, googleProvider);
      const user = result.user;

      if (!user.email) {
        throw new Error("Email not provided by Google. Cannot proceed.");
      }

      const userProfile = await getUserProfile(user.uid);

      if (!userProfile) {
        await createUserProfile(user.uid, {
          fullName: user.displayName || "Google User",
          email: user.email, 
          profilePictureUrl: user.photoURL || "",
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
          favoriteUserIds: [],
          locationVisibility: 'public', // Default visibility for new users
        });
      }

      toast({
        title: "Login Successful!",
        description: `Welcome back, ${user.displayName || "User"}!`,
      });
      router.push("/map");
    } catch (error: any) {
      console.error("Google login error:", error);
      let errorMessage = "Failed to sign in with Google. Please try again.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account already exists with this email. Please sign in using your original method.";
      } else if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
        errorMessage = "Google sign-in popup was closed or cancelled. Please try again if you wish to sign in with Google.";
      } else if (error.message === "Email not provided by Google. Cannot proceed.") {
        errorMessage = "Your Google account did not provide an email address, which is required.";
      }
      toast({
        title: "Google Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }


  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline">Welcome Back</CardTitle>
        <CardDescription>Log in to Proximity Network.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <div className="flex items-center justify-between">
              <div /> 
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging In..." : "Log In"}
            </Button>
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleGoogleLogin} 
          disabled={form.formState.isSubmitting /* Or a new loading state for Google login */}
        >
          {/* You can add a Google icon here later, e.g., using an SVG or an icon library */}
          Sign in with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
