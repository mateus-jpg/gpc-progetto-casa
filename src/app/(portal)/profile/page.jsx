"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getProfile } from "@/actions/profile";
import { PasswordChangeForm } from "@/components/profile/PasswordChangeForm";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const result = await getProfile();
      if (result.success) {
        setProfile(result.profile);
      } else {
        toast.error(result.error || "Failed to load profile");
      }
    } catch (_error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="container mx-auto py-10 max-w-2xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">My Profile</h1>
          {profile?.role && (
            <Badge
              variant={
                profile.role === "admin"
                  ? "destructive"
                  : profile.role === "structure_admin"
                    ? "default"
                    : "outline"
              }
            >
              {profile.role === "admin"
                ? "Super Admin"
                : profile.role === "structure_admin"
                  ? "Structure Admin"
                  : "User"}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Profile Form */}
      <ProfileForm profile={profile} onUpdate={fetchProfile} />

      {/* Password Change */}
      <PasswordChangeForm />

      {/* Account Info */}
      {profile && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium">Account Information</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Created</span>
              <span>
                {profile.metadata?.creationTime
                  ? new Date(profile.metadata.creationTime).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Sign In</span>
              <span>
                {profile.metadata?.lastSignInTime
                  ? new Date(
                      profile.metadata.lastSignInTime,
                    ).toLocaleDateString()
                  : "Never"}
              </span>
            </div>
            {profile.structureIds && profile.structureIds.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Structure Access</span>
                <span>{profile.structureIds.length} structure(s)</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
