"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Users,
  Gavel,
  TrendingUp,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle,
  Star,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { LoginPrompt } from "@/components/login-prompt";

// Dummy calculateTimeLeft function (replace with actual implementation if needed)
const calculateTimeLeft = (endDate: Date): string => {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  if (diff <= 0) return "Auction ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
};

// Updated Auction interface
interface Auction {
  id: string;
  productname?: string;
  title?: string;
  categoryid?: string;
  auctiontype: "forward" | "reverse";
  currentbid?: number;
  bidincrementtype?: "fixed" | "percentage";
  minimumincrement?: number;
  startprice?: number;
  scheduledstart?: string;
  auctionduration?: { days?: number; hours?: number; minutes?: number };
  bidders?: number;
  watchers?: number;
  productimages?: string[];
  productdocuments?: string[];
  productdescription?: string;
  specifications?: string;
  buyNowPrice?: number;
  participants?: string[]; // Array of user IDs (UUIDs), parsed from jsonb
  bidcount?: number;
  createdby?: string; // Email of the user who created the auction
  timeLeft?: string;
  questions?: { user: string; question: string; answer?: string; time: string }[];
  issilentauction?: boolean; // New field to indicate silent auction
  currentbidder?: string; // New field for current highest bidder email
  percent?: number; // New field for percentage increment (if applicable)
}

// Bid interface
interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export default function AuctionDetailPage() {
  const params = useParams<{ id: string }>();
  const auctionId = params.id;

  const [bidAmount, setBidAmount] = useState("");
  const [watchlisted, setWatchlisted] = useState(false);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bidHistory, setBidHistory] = useState<{ bidder: string; amount: number; time: string }[]>([]);

  const { isAuthenticated, user } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    const fetchAuctionDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/auctions/${auctionId}`);
        const json = await res.json();
        console.log("Auction API Response (Raw):", json);
        if (!json.success) throw new Error(json.error || "Failed to fetch auction");
        const participants = Array.isArray(json.data.participants) ? json.data.participants : [];
        const updatedAuction = { ...json.data, participants };
        console.log("Processed Auction Data:", updatedAuction);
        setAuction(updatedAuction);

        const bidRes = await fetch(`/api/bids/${auctionId}`);
        const bidJson = await bidRes.json();
        console.log("Bid API Response (Raw):", bidJson);
        if (bidJson.success) {
          const bids = bidJson.data || [];
          console.log("Fetched Bids (Raw):", bids);
          const historyPromises = bids.map(async (bid: Bid) => {
            const profileRes = await fetch(`/api/profiles/${bid.user_id}`);
            const profileJson = await profileRes.json();
            console.log("Profile API Response for user_id", bid.user_id, " (Raw):", profileJson);
            const bidderName = profileJson.success
              ? `${profileJson.data.fname || ""} ${profileJson.data.lname || ""}`.trim() || profileJson.data.email || bid.user_id
              : `User ${bid.user_id} (Profile not found)`;
            return {
              bidder: bidderName,
              amount: bid.amount,
              time: new Date(bid.created_at).toLocaleString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" }),
            };
          });
          const history = await Promise.all(historyPromises);
          console.log("Processed Bid History (Raw):", history);
          setBidHistory(history);
        } else {
          console.log("No bid data available from API:", bidJson);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctionDetails();
  }, [auctionId]);

  const handlePlaceBid = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      alert("Please log in to place a bid.");
      return;
    }

    if (!user?.role || (user.role !== "buyer" && user.role !== "both")) {
      alert("Only buyers can place bids. Please update your account type.");
      return;
    }

    const amount = Number(bidAmount);
    if (isNaN(amount)) {
      alert("Please enter a valid bid amount.");
      return;
    }

    // Calculate minimum bid for alert
    let minimumIncrementValue = 0;
    if (auction?.bidincrementtype === "fixed" && auction?.minimumincrement) {
      minimumIncrementValue = auction.minimumincrement;
    } else if (auction?.bidincrementtype === "percentage" && auction?.percent && auction?.currentbid) {
      minimumIncrementValue = auction.currentbid * (auction.percent / 100);
    }
    const incrementType = auction?.bidincrementtype || "unknown";
    if (amount < getMinimumBid()) {
      alert(`Bid must be at least $${getMinimumBid().toLocaleString()}. Minimum increment is $${minimumIncrementValue.toLocaleString()} (${incrementType} increment).`);
      return;
    }

    try {
      console.log("Placing bid:", { auctionId, userId: user.id, amount });
      const bidRes = await fetch(`/api/auctions/${auctionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email,
          amount,
          created_at: new Date().toISOString(),
        }),
      });
      const bidJson = await bidRes.json();
      if (!bidJson.success) throw new Error(bidJson.error || "Failed to record bid");

      const auctionRes = await fetch(`/api/auctions/${auctionId}`); // Refresh auction data
      const auctionJson = await auctionRes.json();
      if (!auctionJson.success) throw new Error(auctionJson.error || "Failed to fetch updated auction");

      const start = new Date(auctionJson.data.scheduledstart || "");
      const duration = auctionJson.data.auctionduration
        ? ((d) => ((d.days || 0) * 24 * 60 * 60) + ((d.hours || 0) * 60 * 60) + ((d.minutes || 0) * 60))(
            auctionJson.data.auctionduration
          )
        : 0;
      const end = new Date(start.getTime() + duration * 1000);
      const timeLeft = calculateTimeLeft(end);

      setAuction({ ...auctionJson.data, timeLeft });
      setBidAmount("");
      alert(`Bid of $${amount.toLocaleString()} placed successfully!`);
    } catch (err) {
      console.error("Bid placement error:", err);
      alert(err instanceof Error ? err.message : "An error occurred while placing bid");
    }
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    if (!user?.role || (user.role !== "buyer" && user.role !== "both")) {
      alert("Only buyers can purchase items. Please update your account type.");
      return;
    }

    console.log("Buy now clicked");
    alert(`Item purchased for $${auction?.buyNowPrice?.toLocaleString() || "N/A"}!`);
  };

  const handleWatchlist = () => {
    setWatchlisted(!watchlisted);
    console.log("Watchlist toggled:", !watchlisted);
  };

  const getMinimumBid = () => {
    let minimumBid = auction?.startprice || 0;
    if (auction?.bidcount && auction?.bidcount > 0 && auction?.currentbid) {
      if (auction.bidincrementtype === "percentage" && auction.percent) {
        minimumBid = auction.currentbid * (1 + auction.percent / 100);
      } else if (auction.bidincrementtype === "fixed" && auction.minimumincrement) {
        minimumBid = auction.currentbid + auction.minimumincrement;
      }
    }
    return Math.max(minimumBid, auction?.startprice || 0);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? (auction?.productimages?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === (auction?.productimages?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;
  if (!auction) return <div className="text-center py-20">Auction not found</div>;

  // Calculate auction status
  const now = new Date();
  const start = new Date(auction.scheduledstart || now);
  const duration = auction.auctionduration
    ? ((d) => ((d.days || 0) * 24 * 60 * 60) + ((d.hours || 0) * 60 * 60) + ((d.minutes || 0) * 60))(
        auction.auctionduration
      )
    : 0;
  const end = new Date(start.getTime() + duration * 1000);
  const isAuctionNotStarted = now < start;
  const isAuctionEnded = now > end;

  // Update isButtonDisabled to include auction status
  const isButtonDisabled = !bidAmount || isNaN(Number(bidAmount)) || Number(bidAmount) < getMinimumBid() || 
    (user?.email === auction?.createdby) || isAuctionNotStarted || isAuctionEnded;

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="hover-lift transition-smooth">
              <CardContent className="p-0 relative">
                <Image
                  src={auction.productimages?.[currentImageIndex] || "/placeholder.svg"}
                  alt={auction.productname || auction.title || "Auction Item"}
                  width={600}
                  height={400}
                  className="w-full h-96 object-cover rounded-t-lg transition-smooth hover:scale-105"
                />
                {/* Image Count */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {`${currentImageIndex + 1}/${auction.productimages?.length || 1}`}
                </div>
                {/* Navigation Arrows */}
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-smooth"
                >
                  ←
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-smooth"
                >
                  →
                </button>
                <div className="p-4">
                  <div className="flex gap-2">
                    {auction.productimages?.map((image: string, index: number) => (
                      <Image
                        key={index}
                        src={image || "/placeholder.svg"}
                        alt={`${auction.productname || auction.title} ${index + 1}`}
                        width={100}
                        height={80}
                        className="w-20 h-16 object-cover rounded cursor-pointer border-2 border-transparent hover:border-blue-500 transition-smooth hover-lift"
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auction Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{auction.categoryid || "Uncategorized"}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {auction.auctiontype === "forward" ? "Forward Auction" : "Reverse Auction"}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl">{auction.productname || auction.title || "Untitled Auction"}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWatchlist}
                      className={watchlisted ? "text-red-600" : ""}
                    >
                      <Heart className={`h-4 w-4 ${watchlisted ? "fill-current" : ""}`} />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="specifications">Specs</TabsTrigger>
                    <TabsTrigger value="bids">Bid History</TabsTrigger>
                    <TabsTrigger value="qa">Q&A</TabsTrigger>
                  </TabsList>

                  <TabsContent value="description" className="mt-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-line">
                        {auction.productdescription || "No description available"}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="specifications" className="mt-6">
                    <div className="space-y-4">
                      {auction.specifications ? (
                        Object.entries(JSON.parse(auction.specifications)).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-2 border-b">
                            <span className="font-medium">{key}</span>
                            <span className="text-gray-600 dark:text-gray-300">{value as string}</span>
                          </div>
                        ))
                      ) : (
                        <p>No specifications available</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="bids" className="mt-6">
                    <div className="space-y-3">
                      {bidHistory.length > 0 && !auction.issilentauction ? (
                        bidHistory.map((bid, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded"
                          >
                            <div>
                              <span className="font-medium">{bid.bidder}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                                {bid.time}
                              </span>
                            </div>
                            <span className="font-semibold text-green-600">${bid.amount.toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p>{auction?.issilentauction ? "Bid history hidden for silent auction" : "No bid history available"}</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="qa" className="mt-6">
                    <div className="space-y-6">
                      {auction.questions?.length ? (
                        auction.questions.map((qa: { user: string; question: string; answer?: string; time: string }, index: number) => (
                          <div key={index} className="border-b pb-4">
                            <div className="mb-2">
                              <span className="font-medium">{qa.user}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                                {new Date(qa.time).toLocaleString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className="mb-2">
                              <MessageSquare className="h-4 w-4 inline mr-2" />
                              <span>{qa.question}</span>
                            </div>
                            {qa.answer && (
                              <div className="ml-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <CheckCircle className="h-4 w-4 inline mr-2 text-green-600" />
                                <span>{qa.answer}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p>No questions available</p>
                      )}

                      <div className="mt-6">
                        <h4 className="font-semibold mb-3">Ask a Question</h4>
                        <Textarea placeholder="Type your question here..." className="mb-3" />
                        <Button>Submit Question</Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bidding Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 animate-bounce-gentle" />
                  Place Your Bid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1 animate-pulse-glow">
                    ${auction.bidcount && auction.bidcount > 0 ? auction.currentbid?.toLocaleString() || "N/A" : auction.startprice?.toLocaleString() || "N/A"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {auction.bidcount && auction.bidcount > 0 ? "Current Highest Bid" : "Starting Price"}
                  </div>
                  {auction.currentbidder && auction.bidcount && auction.bidcount > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      By: {auction.currentbidder}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1 hover-lift">
                    <Clock className="h-4 w-4 text-red-600 animate-bounce-gentle" />
                    <span className="font-semibold text-red-600">{auction.timeLeft || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1 hover-lift">
                    <Users className="h-4 w-4" />
                    <span>{auction.bidcount || 0} bidders</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Your Bid Amount</label>
                    <Input
                      type="number"
                      placeholder={`Minimum: $${getMinimumBid().toLocaleString()}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="mt-1 transition-smooth"
                      disabled={isAuctionNotStarted || isAuctionEnded}
                    />
                  </div>
                  <div style={{ width: '100%', display: 'block', position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
                    <Button
                      className="w-full transition-smooth hover-lift transform-3d"
                      onClick={handlePlaceBid}
                      disabled={isButtonDisabled}
                      style={{ display: "block", width: "100%", padding: "0.5rem", boxSizing: 'border-box', position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
                    >
                      Place Bid
                    </Button>
                    {(isAuctionNotStarted || isAuctionEnded) && (
                      <p className="text-sm text-red-600 mt-2">
                        {isAuctionNotStarted ? "Auction has not started yet" : "Auction has ended"}
                      </p>
                    )}
                  </div>
                  {auction.buyNowPrice && (
                    <>
                      <div className="text-center text-sm text-gray-600 dark:text-gray-300">or</div>
                      <Button
                        variant="outline"
                        className="w-full transition-smooth hover-lift"
                        onClick={handleBuyNow}
                        disabled={isAuctionNotStarted || isAuctionEnded}
                      >
                        Buy Now - ${auction.buyNowPrice.toLocaleString()}
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    Minimum bid increment: $
                    {auction.bidincrementtype === "percentage" && auction.percent && auction.currentbid
                      ? (auction.currentbid * (auction.percent / 100)).toLocaleString()
                      : auction.minimumincrement?.toLocaleString() || "100"}
                    {" ("}
                    {auction.bidincrementtype || "unknown"}
                    {" increment)"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src="/placeholder.svg" // Placeholder since no avatar is provided
                    alt={auction.createdby || "Seller"}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                  <div>
                    <h4 className="font-semibold">{auction.createdby || "Unknown Seller"}</h4>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">0</span> {/* No rating data, default to 0 */}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Completed Projects</span>
                    <span className="font-medium">0</span> {/* No disabledProjects data, default to 0 */}
                  </div>
                  <div className="flex justify-between">
                    <span>Watchers</span>
                    <span className="font-medium">{auction.watchers || 0}</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4">
                  View Seller Profile
                </Button>
              </CardContent>
            </Card>

            {/* Auction Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Auction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Starting Bid</span>
                  <span className="font-medium">${auction.startprice?.toLocaleString() || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Bid</span>
                  <span className="font-medium text-green-600">${auction.currentbid?.toLocaleString() || "N/A"}</span>
                </div>
                {auction.buyNowPrice && (
                  <div className="flex justify-between">
                    <span>Buy Now Price</span>
                    <span className="font-medium">${auction.buyNowPrice.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Total Bids</span>
                  <span className="font-medium">{auction.bidcount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Remaining</span>
                  <span className="font-medium text-red-600">{auction.timeLeft || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <LoginPrompt
        open={showLoginPrompt}
        onOpenChange={setShowLoginPrompt}
        title="Sign in to place your bid"
        description="Join the auction and start bidding on this exclusive item"
        onSuccess={() => {
          console.log("User logged in successfully");
        }}
      />
    </div>
  );
}
