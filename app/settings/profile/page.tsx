"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  fname: string;
  lname: string;
  role: string;
  email: string;
  created_at: string;
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const userId = params.id || user?.id; // Fallback to auth user ID if no param

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/profiles/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();
        if (!data.success) throw new Error(data.error || "Failed to load profile");
        setProfile(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;
  if (!profile) return <div className="text-center py-20">Profile not found</div>;

  const createdAtIST = DateTime.fromISO(profile.created_at, { zone: "utc" }).setZone("Asia/Kolkata").toLocaleString(DateTime.DATETIME_FULL);

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Full Name</h3>
              <p className="text-gray-600 dark:text-gray-300">{`${profile.fname} ${profile.lname}`}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Role</h3>
              <p className="text-gray-600 dark:text-gray-300">{profile.role}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Email</h3>
              <p className="text-gray-600 dark:text-gray-300">{profile.email}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Joined</h3>
              <p className="text-gray-600 dark:text-gray-300">{createdAtIST}</p>
            </div>
<Button
  variant="outline"
  className="w-full"
  onClick={() => router.push("/dashboard")}
>
  Dashboard
</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
