import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ChangePasswordPage() {
  return (
    <div className="py-8">
      <div className="w-full max-w-3xl mx-auto mb-4">
        <Button variant="ghost" asChild>
          <Link href="/profile"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile</Link>
        </Button>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
