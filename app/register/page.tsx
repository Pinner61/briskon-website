"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Building,
  Phone,
  MapPin,
  Briefcase,
  ShoppingBag,
  Shield,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function RegisterPage() {
  const { register, isLoading: authLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    accountType: "buyer", // Default to 'buyer'
    sellerType: "individual", // Default to 'individual' for seller/both
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    organizationName: "", // New field for organization
    organizationContact: "", // New field for organization contact
    location: "",
    agreeToTerms: false,
    subscribeNewsletter: false,
  });

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && ["buyer", "seller", "both"].includes(typeParam)) {
      setFormData((prev) => ({ ...prev, accountType: typeParam }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      switch (user.role) {
        case "buyer":
          router.push("/auctions");
          break;
        case "seller":
          router.push("/dashboard/seller");
          break;
        case "both":
          router.push("/dashboard");
          break;
        default:
          router.push("/");
      }
    }
  }, [isAuthenticated, user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setSuccessMessage("");
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccessMessage("");
  };

  const handleRadioChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      accountType: value,
      sellerType: value === "buyer" ? "individual" : prev.sellerType, // Reset sellerType if switching to buyer
    }));
    setError("");
    setSuccessMessage("");
  };

  const handleSellerTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      sellerType: value,
      organizationName: value === "organization" ? prev.organizationName : "",
      organizationContact: value === "organization" ? prev.organizationContact : "",
    }));
    setError("");
    setSuccessMessage("");
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
    setError("");
    setSuccessMessage("");
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
    if (!/\d/.test(password)) return "Password must contain a number.";
    return "";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!formData.agreeToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fname: formData.firstName,
          lname: formData.lastName,
          location: formData.location,
          role: formData.accountType,
          type: (formData.accountType === "seller" || formData.accountType === "both") ? formData.sellerType : undefined,
          organizationName: formData.sellerType === "organization" ? formData.organizationName : undefined,
          organizationContact: formData.sellerType === "organization" ? formData.organizationContact : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(
          `Account created successfully! Welcome, ${formData.firstName}. Redirecting to your dashboard...`,
        );
        setTimeout(() => {
          switch (formData.accountType) {
            case "buyer":
              router.push("/auctions");
              break;
            case "seller":
              router.push("/dashboard/seller");
              break;
            case "both":
              router.push("/dashboard");
              break;
            default:
              router.push("/");
          }
        }, 2000);
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      setError("An error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/placeholder.svg?height=100&width=100')] opacity-5"></div>

      <div className="relative container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-2xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-block group">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-bold text-white">Briskon Auctions</h1>
                  <p className="text-blue-300 text-sm font-medium">Create Account</p>
                </div>
              </div>
            </Link>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl text-gray-300 mb-2">Join the Premier Auction Platform</h2>
              <p className="text-gray-400 text-sm">Start your journey in the world of professional auctions</p>
            </div>
          </div>

          {/* Enhanced Card */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-white mb-2">Create Your Account</CardTitle>
              <CardDescription className="text-gray-300 text-lg">
                Choose your role and join thousands of successful traders
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-lg font-semibold text-white block text-center">Choose Your Account Type</Label>
                  <RadioGroup
                    value={formData.accountType}
                    onValueChange={handleRadioChange}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {[
                      {
                        value: "buyer",
                        label: "Buyer",
                        icon: ShoppingBag,
                        desc: "Bid on exclusive auctions",
                        color: "from-green-500 to-emerald-600",
                        features: ["Access to all auctions", "Bid tracking", "Watchlist"],
                      },
                      {
                        value: "seller",
                        label: "Seller",
                        icon: Briefcase,
                        desc: "List items for auction",
                        color: "from-purple-500 to-violet-600",
                        features: ["Create auctions", "Seller dashboard", "Analytics"],
                      },
                      {
                        value: "both",
                        label: "Buyer & Seller",
                        icon: Shield,
                        desc: "Complete platform access",
                        color: "from-blue-500 to-indigo-600",
                        features: ["All buyer features", "All seller features", "Priority support"],
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = formData.accountType === item.value;
                      return (
                        <div key={item.value} className="relative">
                          <RadioGroupItem value={item.value} id={item.value} className="peer sr-only" />
                          <Label
                            htmlFor={item.value}
                            className={`relative flex flex-col items-center justify-between p-6 rounded-xl cursor-pointer transition-all duration-300 border-2 h-72 ${
                              isSelected
                                ? "border-white/40 bg-white/20 shadow-lg"
                                : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                            }`}
                          >
                            {/* Background Gradient */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-10 rounded-xl`}
                            ></div>

                            {/* Content */}
                            <div className="relative flex flex-col items-center text-center h-full">
                              <div
                                className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 bg-gradient-to-br ${item.color} shadow-lg`}
                              >
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <h3 className="font-bold text-white text-lg mb-1">{item.label}</h3>
                              <p className="text-gray-300 text-sm mb-3">{item.desc}</p>

                              {/* Centered Features List */}
                              <ul className="flex-1 flex flex-col items-center justify-center space-y-1 text-center">
                                {item.features.map((feature, index) => (
                                  <li
                                    key={index}
                                    className="text-xs text-gray-400 flex items-center justify-center gap-1"
                                  >
                                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div className="space-y-6 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-xl text-white">Personal Information</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-200 font-medium">
                        First Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/15 transition-all"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-200 font-medium">
                        Last Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/15 transition-all"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-200 font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/15 transition-all"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-200 font-medium">
                      Phone Number <span className="text-gray-400 text-sm">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/15 transition-all"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {(formData.accountType === "seller" || formData.accountType === "both") && (
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-lg font-semibold text-white block text-center">Seller Type</Label>
                    <RadioGroup
                      value={formData.sellerType}
                      onValueChange={handleSellerTypeChange}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {[
                        { value: "individual", label: "Individual" },
                        { value: "organization", label: "Organization" },
                      ].map((item) => (
                        <div key={item.value} className="relative">
                          <RadioGroupItem value={item.value} id={item.value} className="peer sr-only" />
                          <Label
                            htmlFor={item.value}
                            className={`flex items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 w-full ${
                              formData.sellerType === item.value
                                ? "border-white/40 bg-white/20 shadow-lg"
                                : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                            }`}
                          >
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {formData.sellerType === "organization" && (
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="organizationName" className="text-gray-200 font-medium">
                            Organization Name
                          </Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              id="organizationName"
                              name="organizationName"
                              placeholder="e.g., Acme Auctions"
                              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/15 transition-all"
                              value={formData.organizationName}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="organizationContact" className="text-gray-200 font-medium">
                            Organization Contact
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              id="organizationContact"
                              name="organizationContact"
                              type="tel"
                              placeholder="+1 (555) 123-4567"
                              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-white/15 transition-all"
                              value={formData.organizationContact}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-lg text-gray-50">Location & Security</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-gray-200">
                      Primary Location (City, Country)
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="location"
                        name="location"
                        placeholder="e.g., New York, USA"
                        className="pl-10"
                        value={formData.location}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-gray-200">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Min 8 chars, 1 uppercase, 1 lowercase, 1 number.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-gray-200">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleCheckboxChange("agreeToTerms", !!checked)}
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed cursor-pointer text-gray-200">
                      I agree to the Briskon Auctions{" "}
                      <Link href="/terms" className="text-blue-400 hover:text-blue-300">
                        Terms of Service
                      </Link>
                      ,{" "}
                      <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
                        Privacy Policy
                      </Link>
                      , and{" "}
                      <Link href="/auction-rules" className="text-blue-400 hover:text-blue-300">
                        Auction Rules
                      </Link>
                      .
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="subscribeNewsletter"
                      checked={formData.subscribeNewsletter}
                      onCheckedChange={(checked) => handleCheckboxChange("subscribeNewsletter", !!checked)}
                    />
                    <Label htmlFor="subscribeNewsletter" className="text-sm cursor-pointer text-gray-200">
                      Yes, send me auction updates, tips, and exclusive offers from Briskon Auctions.
                    </Label>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {successMessage && (
                  <Alert
                    variant="default"
                    className="bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200"
                  >
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-center space-y-4">
                <Button
                  type="submit"
                  className="w-full md:w-1/2"
                  disabled={authLoading || isLoading || !!successMessage}
                >
                  {authLoading || isLoading
                    ? "Creating Account..."
                    : successMessage
                    ? "Account Created!"
                    : "Create Account"}
                </Button>
                <div className="text-center text-sm text-gray-300">
                  <p>
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300 dark:text-blue-400">
                      Sign In
                    </Link>
                  </p>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
