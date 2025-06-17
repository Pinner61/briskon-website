"use client"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { User, ShoppingBag, Briefcase, Settings, Bell, LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface CurrentUser {
  name: string
  email: string
  role: string
}

export default function CombinedDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = sessionStorage.getItem("currentUser")
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUser(parsedUser)
      // If user has a specific role other than 'both' or 'admin' (who might see this), redirect them.
      // This page is primarily for users with 'both' role or as a fallback.
      if (parsedUser.role === "buyer" && router.pathname !== "/dashboard/buyer") {
        // router.push('/dashboard/buyer'); // Commented out to allow viewing this page directly for now
      } else if (parsedUser.role === "seller" && router.pathname !== "/dashboard/seller") {
        // router.push('/dashboard/seller');
      }
    }
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem("currentUser")
    sessionStorage.removeItem("registeredUser") // Clear any temp registration
    router.push("/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p>You are not logged in. Please log in to access your dashboard.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    )
  }

  // This dashboard is intended for users with 'both' role, or as a generic landing if no specific role dashboard is hit.
  // Admins might also land here if not redirected to /dashboard/admin specifically.

  return (
    <div className="min-h-screen py-12 md:py-20 bg-gray-100 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <header className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
                Welcome, {user.name || "User"}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">Your Briskon Auctions Hub (Role: {user.role})</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/notifications">
                  <Bell className="h-4 w-4 mr-1.5" /> Notifications <Badge className="ml-2">1</Badge>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/profile">
                  <Settings className="h-4 w-4 mr-1.5" /> Account
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1.5" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(user.role === "buyer" || user.role === "both") && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-blue-500" /> Buyer Dashboard
                </CardTitle>
                <CardDescription>Access your bidding activities, watchlist, and purchases.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/dashboard/buyer">Go to Buyer Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(user.role === "seller" || user.role === "both") && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-500" /> Seller Dashboard
                </CardTitle>
                <CardDescription>Manage your listings, sales, and seller profile.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/dashboard/seller">Go to Seller Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {user.role === "admin" && (
            <Card className="hover:shadow-lg transition-shadow md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-red-500" /> Admin Panel
                </CardTitle>
                <CardDescription>Access platform management tools and oversight.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/dashboard/admin">Go to Admin Panel</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {user.role === "both" && (
          <Card>
            <CardHeader>
              <CardTitle>Overview for Buyer & Seller</CardTitle>
              <CardDescription>Summary of your activities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                You have <strong>3 active bids</strong> and <strong>7 active listings</strong>.
              </p>
              <p>Your last sale was "Vintage Lamp" for $150.</p>
              <p>Your last purchase was "Antique Map" for $80.</p>
            </CardContent>
          </Card>
        )}

        {user.role !== "buyer" && user.role !== "seller" && user.role !== "both" && user.role !== "admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Your role is: <strong>{user.role}</strong>. Specific dashboard features for this role may be under
                development.
              </p>
              <p className="mt-4">
                You can manage your account settings{" "}
                <Link href="/settings/profile" className="text-blue-600 hover:underline">
                  here
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
