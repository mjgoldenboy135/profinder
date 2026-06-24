import ProfileForm from "@/components/profile/ProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";

export default function MyProfilePage() {
  return (
    <div className="py-8">
      <ProfileForm />
      <ChangePasswordForm />
    </div>
  );
}
