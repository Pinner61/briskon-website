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
  productimages?: string[]; // Array of URLs
  productdocuments?: string[]; // Array of URLs
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
  requireddocuments?: string | null;
}

interface AuctionResponse extends Auction {
  timeLeft?: string;
}

interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  productimages: { id: string; url: string }[]; // Array of { id, url } objects
  productdocuments: { id: string; url: string }[]; // Array of { id, url } objects
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
        auctionsubtype,
        requireddocuments,
        targetprice,
        categoryid,
        subcategoryid,
        auctiontype
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    const auction = data as Auction;
    console.log("Raw auction data before processing:", auction);

    const processedAuction: AuctionResponse = {
      ...auction,
      requireddocuments: auction.requireddocuments ? JSON.stringify(auction.requireddocuments) : null,
    };

    console.log("Processed auction data:", processedAuction);

    if (!("timeLeft" in processedAuction)) {
      const start = new Date(processedAuction.scheduledstart || new Date());
      const duration = processedAuction.auctionduration
        ? ((d) =>
            ((d.days || 0) * 86400) +
            ((d.hours || 0) * 3600) +
            ((d.minutes || 0) * 60))(
            typeof processedAuction.auctionduration === "string"
              ? JSON.parse(processedAuction.auctionduration)
              : processedAuction.auctionduration
          )
        : 0;
      const end = new Date(start.getTime() + duration * 1000);
      processedAuction.timeLeft = calculateTimeLeft(end);
    }

    return NextResponse.json({ success: true, data: processedAuction }, { status: 200 });
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

    // Parse the request body (assuming FormData from frontend)
    const formData = await request.formData();
    const user_id = formData.get("user_id") as string;
    const user_email = formData.get("user_email") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const created_at = formData.get("created_at") as string;

    // Collect documents and images from FormData
    const documents: { id: string; url: string }[] = [];
    const images: { id: string; url: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("documents[")) {
        documents.push(JSON.parse(value as string));
      } else if (key.startsWith("images[")) {
        images.push(JSON.parse(value as string));
      }
    }

    // Validate required fields
    if (!user_id || !user_email || isNaN(amount) || !created_at) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for bid" },
        { status: 400 }
      );
    }

    // Fetch current auction data
    const { data: auctionData, error: fetchError } = await supabase
      .from("auctions")
      .select("startprice, currentbid, minimumincrement, percent, bidincrementtype, participants, bidcount, createdby, scheduledstart, auctionduration, auctionsubtype, targetprice")
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

    // Validate bid amount for reverse auction
    const currentBid = auctionData.currentbid || auctionData.startprice || 0;
    const targetPrice = auctionData.targetprice || 0;
    let minimumDecrement = 0;

    if (auctionData.bidincrementtype === "percentage" && auctionData.percent) {
      minimumDecrement = currentBid * (auctionData.percent / 100);
    } else if (auctionData.bidincrementtype === "fixed" && auctionData.minimumincrement) {
      minimumDecrement = auctionData.minimumincrement;
    }

    const minAcceptableBid = currentBid - minimumDecrement;

    if (auctionData.bidcount && auctionData.bidcount > 0) {
      if (targetPrice > minAcceptableBid) {
        // Allow bids between targetPrice and currentBid
        if (amount < targetPrice || amount >= currentBid) {
          return NextResponse.json(
            { success: false, error: `Bid must be between $${targetPrice.toLocaleString()} and less than $${currentBid.toLocaleString()}` },
            { status: 400 }
          );
        }
      } else {
        // Require bid to be at least targetPrice and less than currentBid - minimumDecrement
        if (amount < targetPrice || amount >= minAcceptableBid) {
          return NextResponse.json(
            { success: false, error: `Bid must be between $${targetPrice.toLocaleString()} and less than $${minAcceptableBid.toLocaleString()}` },
            { status: 400 }
          );
        }
      }
    } else {
      // First bid must be at least targetPrice and less than startprice (if defined) or currentBid
      if (amount < targetPrice || (auctionData.startprice && amount >= auctionData.startprice)) {
        return NextResponse.json(
          { success: false, error: `First bid must be between $${targetPrice.toLocaleString()} and less than $${(auctionData.startprice || currentBid).toLocaleString()}` },
          { status: 400 }
        );
      }
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

    // Insert bid into bids table with images and documents
    const { error: bidError } = await supabase
      .from("bids")
      .insert({
        auction_id: id,
        user_id,
        amount,
        created_at,
        productimages: images,
        productdocuments: documents,
      });

    if (bidError) {
      return NextResponse.json({ success: false, error: bidError.message }, { status: 400 });
    }

    // Update auction with new bid details (only URLs for productimages/productdocuments)
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
