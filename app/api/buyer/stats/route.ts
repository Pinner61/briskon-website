import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  // Get user email and ID from query parameters (for simplicity; secure in production)
  const url = new URL(request.url);
  const userEmail = url.searchParams.get("email");
  const userId = url.searchParams.get("id");

  // Prioritize userId if available, fall back to userEmail
  const identifier = userId || userEmail;
  if (!identifier) {
    return NextResponse.json({ error: "User ID or email is required" }, { status: 400 });
  }

  try {
    // Fetch active bids (count of auctions where ended is false and user has a bid)
    const { data: bids, error: bidsError } = await supabase
      .from("bids")
      .select("auction_id")
      .eq("user_id", userId); // Use userId if available, else email

    if (bidsError) throw bidsError;

    const auctionIds = bids?.map((bid) => bid.auction_id) || [];
    const { data: auctions, error: auctionsError } = await supabase
      .from("auctions")
      .select("ended, productname") // Include productname for activity
      .in("id", auctionIds);

    if (auctionsError) throw auctionsError;

    const activeBidsCount = auctions?.filter((auction) => !auction.ended).length || 0;

    // Fetch won auctions (count of auctions where currentBidder is the user and ended is true)
    const { data: wonAuctions, error: wonError } = await supabase
      .from("auctions")
      .select("id, productname")
      .eq("currentbidder", userEmail) // Use email for currentBidder
      .eq("ended", true);

    if (wonError) throw wonError;

    const wonAuctionsCount = wonAuctions?.length || 0;

    // Fetch recent activity
    const recentActivities = [];

    // Recent bids (no createdat, use first result as "recent")
    const { data: recentBids, error: recentBidsError } = await supabase
      .from("bids")
      .select("auction_id")
      .eq("user_id", userId || userEmail)
      .limit(1); // Limit to 1 recent bid

    if (recentBidsError) throw recentBidsError;

    if (recentBids?.length) {
      const { data: bidAuction } = await supabase
        .from("auctions")
        .select("productname")
        .eq("id", recentBids[0].auction_id)
        .single();
      if (bidAuction) {
        recentActivities.push(`You placed a bid on "${bidAuction.productname}".`);
      }
    }

    // Recent won auctions (no createdat, use first result as "recent")
    const { data: recentWon, error: recentWonError } = await supabase
      .from("auctions")
      .select("productname")
      .eq("currentbidder", userEmail)
      .eq("ended", true)
      .limit(1); // Limit to 1 recent win

    if (recentWonError) throw recentWonError;

    if (recentWon?.length) {
      recentActivities.push(`Auction "${recentWon[0].productname}" ended, you won!`);
    }

    return NextResponse.json({
      activeBids: activeBidsCount,
      wonAuctions: wonAuctionsCount,
      recentActivities: recentActivities.slice(0, 2), // Limit to 2 items (bid and win)
    });
  } catch (error) {
    console.error("Error fetching buyer stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
