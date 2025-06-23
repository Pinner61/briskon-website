"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth"; // Adjust import path
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function CreateListingPage() {
  const { user } = useAuth();
  const [supabase] = useState(() =>
    createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
      },
    })
  ); // Initialize Supabase client

  const initialFormData = {
    auctiontype: "",
    auctionsubtype: "",
    ismultilot: false,
    productname: "",
    productdescription: "",
    productimages: [] as string[], // Array of image URLs
    productdocuments: [] as string[], // Array of document URLs
    lots: "", // Simplified to text, will convert to JSON
    attributes: "", // Simplified to text, will convert to JSON
    sku: "",
    brand: "",
    model: "",
    startprice: 0,
    minimumincrement: 0,
    auctionduration: "", // Simplified to text, will convert to JSON
    currency: "USD",
    launchtype: "",
    scheduledstart: "", // Timestamp
    bidextension: false,
    bidextensiontime: 0,
    allowautobidding: false,
    bidincrementtype: "",
    bidincrementrules: "", // Simplified to text, will convert to JSON
    issilentauction: false,
    participationtype: "",
    participantemails: [] as string[],
    qualificationcriteria: "", // Simplified to text, will convert to JSON
    termsandconditions: "", // Simplified to text, will convert to JSON
    enabledispute: false,
    language: "en",
    enablenotifications: false,
    notificationtypes: [] as string[],
    enableanalytics: false,
    reserveprice: 0,
  };
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // For image thumbnails

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle array fields
  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = e.target.value.split(",").map((item) => item.trim());
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle file input changes and upload to Supabase Storage
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const files = e.target.files;
    if (!files) return;

    const newPreviews: string[] = [];
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (field === "productimages" && !file.type.startsWith("image/")) {
        setError("Please upload only image files for product images.");
        return;
      }
      if (field === "productdocuments" && !file.type.startsWith("application/") && !file.type.startsWith("text/")) {
        setError("Please upload only document files (e.g., PDF, Word) for product documents.");
        return;
      }

      // Generate preview URL for images
      if (field === "productimages") {
        newPreviews.push(URL.createObjectURL(file));
      }

      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from("auctions")
        .upload(`public/${fileName}`, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        setError(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = await supabase.storage
        .from("auctions")
        .getPublicUrl(`public/${fileName}`);
      newUrls.push(urlData.publicUrl);
    }

    if (field === "productimages") {
      setFormData((prev) => ({ ...prev, productimages: [...prev.productimages, ...newUrls] }));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    } else if (field === "productdocuments") {
      setFormData((prev) => ({ ...prev, productdocuments: [...prev.productdocuments, ...newUrls] }));
    }
  };

  // Remove an image preview and its corresponding URL
  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      productimages: prev.productimages.filter((_, i) => i !== index),
    }));
  };

  // Custom parser for key-value pair text to JSON
  const parseKeyValuePairs = (text: string): { [key: string]: string | number | boolean } => {
    if (!text) return {};
    try {
      const pairs = text.split(",").map((pair) => pair.trim().split(":")).filter((pair) => pair.length === 2);
      const obj = pairs.reduce((acc, [key, value]) => {
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        let parsedValue: string | number | boolean = trimmedValue;
        if (!isNaN(Number(trimmedValue))) parsedValue = Number(trimmedValue);
        else if (trimmedValue.toLowerCase() === "true") parsedValue = true;
        else if (trimmedValue.toLowerCase() === "false") parsedValue = false;
        else if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) parsedValue = trimmedValue.slice(1, -1);
        return { ...acc, [trimmedKey]: parsedValue };
      }, {});
      return obj;
    } catch (e) {
      console.error("Invalid format, defaulting to empty object:", e);
      return {};
    }
  };

  // Submit form to API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation for scheduled start if launchtype is scheduled
    if (formData.launchtype === "scheduled" && !formData.scheduledstart) {
      setError("A scheduled start time is required for scheduled launch type.");
      setLoading(false);
      return;
    }

    // Convert text inputs to JSON objects using custom parser
    const jsonFields = {
      lots: formData.lots,
      attributes: formData.attributes,
      auctionduration: formData.auctionduration,
      bidincrementrules: formData.bidincrementrules,
      qualificationcriteria: formData.qualificationcriteria,
      termsandconditions: formData.termsandconditions,
    };
    const parsedJsonFields = Object.fromEntries(
      Object.entries(jsonFields).map(([key, value]) => [key, parseKeyValuePairs(value)])
    );

    // Filter out text-based JSON fields and merge parsed JSON
    const { lots, attributes, auctionduration, bidincrementrules, qualificationcriteria, termsandconditions, ...rest } = formData;
    const payload = {
      ...rest,
      ...parsedJsonFields,
      createdby: user?.email || "unknown", // Store email in createdby
      status: formData.launchtype === "immediate" ? "active" : formData.launchtype === "scheduled" ? "scheduled" : "pending", // Set status based on launchtype
      scheduledstart:
        formData.launchtype === "immediate"
          ? new Date().toISOString() // Set current time for immediate launch
          : formData.scheduledstart
          ? new Date(formData.scheduledstart).toISOString()
          : null,
    };

    const response = await fetch("/api/auctions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Failed to create listing");
    else {
      console.log("Listing created!", result.data);
      setFormData(initialFormData); // Clear form on success
      setImagePreviews([]); // Clear image previews
      setSuccess("Listing created successfully!"); // Show success message
      setTimeout(() => setSuccess(null), 3000); // Hide success message after 3 seconds
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-12 md:py-20 bg-gray-100 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Create New Listing</h1>
            <Button asChild variant="outline">
              <Link href="/dashboard/seller">Back to Dashboard</Link>
            </Button>
          </div>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Details Section */}
              <fieldset className="border p-4 rounded-lg">
                <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300">Product Details</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <input
                      name="productname"
                      value={formData.productname}
                      onChange={handleChange}
                      placeholder="Product Name"
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <textarea
                      name="productdescription"
                      value={formData.productdescription}
                      onChange={handleChange}
                      placeholder="Description"
                      className="w-full p-2 border rounded h-20 resize-none"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="SKU"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      placeholder="Brand"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      placeholder="Model"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="lots"
                      value={formData.lots}
                      onChange={handleChange}
                      placeholder="Lots (e.g., 'lot1: value1, lot2: value2')"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="attributes"
                      value={formData.attributes}
                      onChange={handleChange}
                      placeholder="Attributes (e.g., 'color: red, size: large')"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileChange(e, "productimages")}
                      className="w-full p-2 border rounded mt-1"
                    />
                    {/* Image Preview Gallery */}
                    {imagePreviews.length > 0 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto max-w-full">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt="Preview"
                              className="w-16 h-16 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Documents</label>
                    <input
                      type="file"
                      accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      onChange={(e) => handleFileChange(e, "productdocuments")}
                      className="w-full p-2 border rounded mt-1"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Pricing Section */}
              <fieldset className="border p-4 rounded-lg">
                <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300">Pricing</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <input
                      type="number"
                      name="startprice"
                      value={formData.startprice}
                      onChange={handleChange}
                      placeholder="e.g., 100.00"
                      className="w-full p-2 border rounded"
                      required
                      min="0"
                      step="0.01"
                    />
                    <p className="text-sm text-gray-500 mt-1">The initial price at which bidding begins.</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      name="minimumincrement"
                      value={formData.minimumincrement}
                      onChange={handleChange}
                      placeholder="e.g., 5.00"
                      className="w-full p-2 border rounded"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-sm text-gray-500 mt-1">The smallest amount by which bids can increase.</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      name="reserveprice"
                      value={formData.reserveprice}
                      onChange={handleChange}
                      placeholder="e.g., 50.00"
                      className="w-full p-2 border rounded"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-sm text-gray-500 mt-1">The minimum price required for the auction to be successful (optional).</p>
                  </div>
                </div>
              </fieldset>

              {/* Auction Settings Section */}
              <fieldset className="border p-4 rounded-lg">
                <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300">Auction Settings</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <select
                      name="auctiontype"
                      value={formData.auctiontype}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select Auction Type</option>
                      <option value="forward">Forward</option>
                      <option value="reverse">Reverse</option>
                    </select>
                  </div>
                  <div>
                    <select
                      name="auctionsubtype"
                      value={formData.auctionsubtype}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select Auction Subtype</option>
                      <option value="english">English</option>
                      <option value="dutch">Dutch</option>
                      <option value="sealed-bid">Sealed Bid</option>
                    </select>
                  </div>
                  <div>
                    <select
                      name="bidincrementtype"
                      value={formData.bidincrementtype}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select Bid Increment Type</option>
                      <option value="fixed">Fixed</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <select
                      name="launchtype"
                      value={formData.launchtype}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select Launch Type</option>
                      <option value="immediate">Immediate</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="datetime-local"
                      name="scheduledstart"
                      value={formData.scheduledstart}
                      onChange={handleChange}
                      className={`w-full p-2 border rounded ${formData.launchtype === "immediate" ? "bg-gray-200 cursor-not-allowed" : ""}`}
                      disabled={formData.launchtype === "immediate"}
                    />
                  </div>
                  <div>
                    <select
                      name="participationtype"
                      value={formData.participationtype}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select Participation Type</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <div>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      name="bidextensiontime"
                      value={formData.bidextensiontime}
                      onChange={handleChange}
                      placeholder="e.g., 5"
                      className="w-full p-2 border rounded"
                      min="0"
                    />
                    <p className="text-sm text-gray-500 mt-1">Time in minutes to extend the auction if a bid is placed near the end (optional).</p>
                  </div>
                  <div>
                    <input
                      type="text"
                      name="bidincrementrules"
                      value={formData.bidincrementrules}
                      onChange={handleChange}
                      placeholder="Bid Increment Rules (e.g., 'initial: 10, step: 5')"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="participantemails"
                      value={formData.participantemails.join(",")}
                      onChange={(e) => handleArrayChange(e, "participantemails")}
                      placeholder="Participant Emails (comma-separated)"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="notificationtypes"
                      value={formData.notificationtypes.join(",")}
                      onChange={(e) => handleArrayChange(e, "notificationtypes")}
                      placeholder="Notification Types (comma-separated)"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Additional Options Section */}
              <fieldset className="border p-4 rounded-lg">
                <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300">Additional Options</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="ismultilot"
                      checked={formData.ismultilot}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label>Is Multi-Lot</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="bidextension"
                      checked={formData.bidextension}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label>Bid Extension</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowautobidding"
                      checked={formData.allowautobidding}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label>Allow Auto Bidding</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="issilentauction"
                      checked={formData.issilentauction}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label>Is Silent Auction</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="enabledispute"
                      checked={formData.enabledispute}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label>Enable Dispute</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="enablenotifications"
                      checked={formData.enablenotifications}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label>Enable Notifications</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="enableanalytics"
                      checked={formData.enableanalytics}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label>Enable Analytics</label>
                  </div>
                  <div>
                    <input
                      type="text"
                      name="qualificationcriteria"
                      value={formData.qualificationcriteria}
                      onChange={handleChange}
                      placeholder="Qualification Criteria (e.g., 'minBid: 100, age: 18')"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="termsandconditions"
                      value={formData.termsandconditions}
                      onChange={handleChange}
                      placeholder="Terms and Conditions (e.g., 'payment: within 24h, returns: no returns')"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
              </fieldset>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? "Creating..." : "Create Listing"}
                </Button>
                {error && <p className="text-red-500 mt-2">{error}</p>}
                {success && <p className="text-green-500 mt-2">{success}</p>}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
