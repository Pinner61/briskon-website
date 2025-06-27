import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define interfaces
interface Auction {
  id: string;
  productname?: string;
  productdescription?: string;
  productimages?: string[];
  startprice?: number;
  currentbid?: number;
  minimumincrement?: number;
  percent?: number;
  bidincrementtype?: "fixed" | "percentage";
  auctionduration?: { days?: number; hours?: number; minutes?: number };
  scheduledstart?: string;
  bidcount?: number;
  participants?: string[];
  issilentauction?: boolean;
  currentbidder?: string;
  createdby?: string;
  auctionsubtype?: string;
}

interface AuctionResponse extends Auction {
  timeLeft?: string;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    const { data, error } = await supabase
      .from("auctions")
      .select(`
        id,
        productname,
        productdescription,
        productimages,
        productdocuments,
        startprice,
        currentbid,
        minimumincrement,
        percent,
        bidincrementtype,
        auctionduration,
        scheduledstart,
        bidcount,
        participants,
        issilentauction,
        currentbidder,
        createdby,
        attributes,
        sku,
        brand,
        model,
        reserveprice,
        auctionsubtype
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    const auction = data as Auction;

    if (auction && !("timeLeft" in auction)) {
      const start = new Date(auction.scheduledstart || new Date());
      const duration = auction.auctionduration
        ? ((d) => ((d.days || 0) * 86400) + ((d.hours || 0) * 3600) + ((d.minutes || 0) * 60))(
            auction.auctionduration
          )
        : 0;
      const end = new Date(start.getTime() + duration * 1000);
      (auction as AuctionResponse).timeLeft = calculateTimeLeft(end);
    }

    return NextResponse.json({ success: true, data: auction as AuctionResponse }, { status: 200 });
  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params; // Await params to handle promise
    const { id } = params;
    const body = await request.json();
    const { user_id, user_email, amount, created_at } = body;

    // Validate required fields
    if (!user_id || !user_email || !amount || !created_at) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for bid" },
        { status: 400 }
      );
    }

    // Fetch current auction data
    const { data: auctionData, error: fetchError } = await supabase
      .from("auctions")
      .select("startprice, currentbid, minimumincrement, percent, bidincrementtype, participants, bidcount, createdby, scheduledstart, auctionduration, auctionsubtype")
      .eq("id", id)
      .single();

    if (fetchError || !auctionData) {
      return NextResponse.json(
        { success: false, error: fetchError?.message || "Auction not found" },
        { status: 404 }
      );
    }

    // Check auction status
    const now = new Date();
    const start = new Date(auctionData.scheduledstart || now);
    const duration = auctionData.auctionduration
      ? ((d) => ((d.days || 0) * 86400) + ((d.hours || 0) * 3600) + ((d.minutes || 0) * 60))(
          auctionData.auctionduration
        )
      : 0;
    const end = new Date(start.getTime() + duration * 1000);

    if (now < start) {
      return NextResponse.json(
        { success: false, error: "Auction has not started yet" },
        { status: 400 }
      );
    }
    if (now > end) {
      return NextResponse.json(
        { success: false, error: "Auction has ended" },
        { status: 400 }
      );
    }

    // Validate bid amount based on auction type
    let minimumBid = auctionData.startprice || 0;
    if (auctionData.auctionsubtype !== "sealed") {
      if (auctionData.bidcount && auctionData.bidcount > 0 && auctionData.currentbid) {
        if (auctionData.bidincrementtype === "percentage" && auctionData.percent) {
          minimumBid = auctionData.currentbid * (1 + auctionData.percent / 100);
        } else if (auctionData.bidincrementtype === "fixed" && auctionData.minimumincrement) {
          minimumBid = auctionData.currentbid + auctionData.minimumincrement;
        }
      }
      minimumBid = Math.max(minimumBid, auctionData.startprice || 0);
    }

    if (amount < minimumBid) {
      return NextResponse.json(
        { success: false, error: `Bid must be at least $${minimumBid.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Check if user is the auction creator
    if (user_email === auctionData.createdby) {
      return NextResponse.json(
        { success: false, error: "You cannot bid on your own auction" },
        { status: 400 }
      );
    }

    // Determine if this is the user's first bid (only restrict for sealed auctions)
    const isFirstBid = auctionData.auctionsubtype !== "sealed" || !auctionData.participants?.includes(user_id);
    const updatedParticipants = isFirstBid
      ? [...(auctionData.participants || []), user_id]
      : auctionData.participants;
    const updatedBidCount = isFirstBid ? (auctionData.bidcount || 0) + 1 : auctionData.bidcount;

    // Insert bid into bids table
    const { error: bidError } = await supabase
      .from("bids")
      .insert({ auction_id: id, user_id, amount, created_at });

    if (bidError) {
      return NextResponse.json({ success: false, error: bidError.message }, { status: 400 });
    }

    // Update auction with new bid details
    const { data, error: updateError } = await supabase
      .from("auctions")
      .update({
        currentbid: amount,
        currentbidder: user_email,
        participants: updatedParticipants,
        bidcount: updatedBidCount,
      })
      .eq("id", id)
      .select();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data[0] }, { status: 200 });
  } catch (error) {
    console.error("Bid update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to calculate time left
function calculateTimeLeft(endDate: Date): string {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  if (diff <= 0) return "Auction ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
}
