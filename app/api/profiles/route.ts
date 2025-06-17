import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)
export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, accountType } = await request.json();
    console.log("Received:", { email, password, firstName, lastName, accountType });

    if (!email || !password || !firstName || !lastName || !accountType) {
      console.log("Validation failed: Missing fields");
      return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 });
    }
    if (!["buyer", "seller", "both"].includes(accountType)) {
      console.log("Validation failed: Invalid account type");
      return NextResponse.json({ success: false, error: "Invalid account type" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Validation failed: Invalid email");
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 });
    }

    const { data: existingUser, error: existingError } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", email)
      .single();
    if (existingError && existingError.code !== "PGRST116") throw existingError;
    if (existingUser) {
      console.log("Validation failed: Email already registered");
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 });
    }

    console.log("Signing up user with email:", email);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: `${firstName} ${lastName}`, role: accountType, verified: false } },
    });
    if (authError) {
      console.log("Auth error:", authError.message);
      throw authError;
    }

    if (data.user) {
      console.log("Creating profile for user:", data.user.id);
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        role: accountType,
        created_at: new Date().toISOString(),
      });
      if (profileError) {
        console.log("Profile error:", profileError.message);
        throw profileError;
      }
    }

    return NextResponse.json({ success: true, message: "Registration successful. Check your email for verification." }, { status: 201 });
  } catch (error) {
    console.error("Catch error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create profile",
    }, { status: 400 });
  }
}
