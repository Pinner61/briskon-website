"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { LoginPrompt } from "@/components/login-prompt"

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
  const [bidAmount, setBidAmount] = useState("")
  const [watchlisted, setWatchlisted] = useState(false)

  const { isAuthenticated, user } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Mock auction data - in real app, fetch based on params.id
  const auction = {
    id: 1,
    title: "E-commerce Platform with Payment Gateway Integration",
    category: "Web Development",
    type: "Forward Auction",
    currentBid: 15000,
    timeLeft: "2d 14h 32m",
    bidders: 8,
    watchers: 24,
    images: [
      "/placeholder.svg?height=400&width=600",
      "/placeholder.svg?height=400&width=600",
      "/placeholder.svg?height=400&width=600",
    ],
    description: `Complete e-commerce solution with modern design and full functionality. This project includes:

• Responsive web design optimized for all devices
• Secure payment gateway integration (Stripe, PayPal)
• Advanced product catalog with search and filtering
• Inventory management system
• Order tracking and management
• Customer account management
• Admin dashboard with analytics
• SEO optimization
• Security features and SSL implementation

The platform will be built using modern technologies including React, Node.js, and MongoDB for optimal performance and scalability.`,
    startingBid: 10000,
    buyNowPrice: 25000,
    seller: {
      name: "Briskon Technologies",
      rating: 4.9,
      completedProjects: 150,
      avatar: "/placeholder.svg?height=60&width=60",
    },
    specifications: {
      Timeline: "8-12 weeks",
      "Technology Stack": "React, Node.js, MongoDB, Stripe API",
      Deliverables: "Source code, documentation, 3 months support",
      Revisions: "3 rounds of revisions included",
      Hosting: "Deployment assistance included",
    },
    bidHistory: [
      { bidder: "TechStartup123", amount: 15000, time: "2 hours ago" },
      { bidder: "DigitalVentures", amount: 14500, time: "4 hours ago" },
      { bidder: "InnovateNow", amount: 14000, time: "6 hours ago" },
      { bidder: "WebSolutions", amount: 13500, time: "8 hours ago" },
      { bidder: "StartupHub", amount: 13000, time: "12 hours ago" },
    ],
    questions: [
      {
        user: "TechStartup123",
        question: "Can you integrate with our existing CRM system?",
        answer: "Yes, we can integrate with most popular CRM systems including Salesforce, HubSpot, and custom APIs.",
        time: "1 day ago",
      },
      {
        user: "DigitalVentures",
        question: "What's included in the 3 months support?",
        answer:
          "Support includes bug fixes, minor feature updates, and technical assistance. Major feature additions would be quoted separately.",
        time: "2 days ago",
      },
    ],
  }

  const handlePlaceBid = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    if (!user?.role || (user.role !== "buyer" && user.role !== "both")) {
      alert("Only buyers can place bids. Please update your account type.")
      return
    }

    // Handle bid placement logic
    console.log("Placing bid:", bidAmount)
    alert(`Bid of $${Number(bidAmount).toLocaleString()} placed successfully!`)
  }

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    if (!user?.role || (user.role !== "buyer" && user.role !== "both")) {
      alert("Only buyers can purchase items. Please update your account type.")
      return
    }

    // Handle buy now logic
    console.log("Buy now clicked")
    alert(`Item purchased for $${auction.buyNowPrice?.toLocaleString()}!`)
  }

  const handleWatchlist = () => {
    setWatchlisted(!watchlisted)
  }

  const getMinimumBid = () => {
    return auction.currentBid + 100 // Minimum increment of $100
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="hover-lift transition-smooth">
              <CardContent className="p-0">
                <Image
                  src={auction.images[0] || "/placeholder.svg"}
                  alt={auction.title}
                  width={600}
                  height={400}
                  className="w-full h-96 object-cover rounded-t-lg transition-smooth hover:scale-105"
                />
                <div className="p-4">
                  <div className="flex gap-2">
                    {auction.images.map((image, index) => (
                      <Image
                        key={index}
                        src={image || "/placeholder.svg"}
                        alt={`${auction.title} ${index + 1}`}
                        width={100}
                        height={80}
                        className="w-20 h-16 object-cover rounded cursor-pointer border-2 border-transparent hover:border-blue-500 transition-smooth hover-lift"
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
                      <Badge variant="secondary">{auction.category}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {auction.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl">{auction.title}</CardTitle>
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
                      <p className="whitespace-pre-line">{auction.description}</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="specifications" className="mt-6">
                    <div className="space-y-4">
                      {Object.entries(auction.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-2 border-b">
                          <span className="font-medium">{key}</span>
                          <span className="text-gray-600 dark:text-gray-300">{value}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="bids" className="mt-6">
                    <div className="space-y-3">
                      {auction.bidHistory.map((bid, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <div>
                            <span className="font-medium">{bid.bidder}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">{bid.time}</span>
                          </div>
                          <span className="font-semibold text-green-600">${bid.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="qa" className="mt-6">
                    <div className="space-y-6">
                      {auction.questions.map((qa, index) => (
                        <div key={index} className="border-b pb-4">
                          <div className="mb-2">
                            <span className="font-medium">{qa.user}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">{qa.time}</span>
                          </div>
                          <div className="mb-2">
                            <MessageSquare className="h-4 w-4 inline mr-2" />
                            <span>{qa.question}</span>
                          </div>
                          <div className="ml-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <CheckCircle className="h-4 w-4 inline mr-2 text-green-600" />
                            <span>{qa.answer}</span>
                          </div>
                        </div>
                      ))}

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
            <Card className="hover-lift transition-smooth card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 animate-bounce-gentle" />
                  Place Your Bid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1 animate-pulse-glow">
                    ${auction.currentBid.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Current Highest Bid</div>
                </div>

                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1 hover-lift">
                    <Clock className="h-4 w-4 text-red-600 animate-bounce-gentle" />
                    <span className="font-semibold text-red-600">{auction.timeLeft}</span>
                  </div>
                  <div className="flex items-center gap-1 hover-lift">
                    <Users className="h-4 w-4" />
                    <span>{auction.bidders} bidders</span>
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
                      className="mt-1 transition-smooth focus:scale-105"
                    />
                  </div>

                  <Button
                    className="w-full transition-smooth hover-lift transform-3d"
                    onClick={handlePlaceBid}
                    disabled={!bidAmount || Number.parseInt(bidAmount) < getMinimumBid()}
                  >
                    Place Bid
                  </Button>

                  {auction.buyNowPrice && (
                    <>
                      <div className="text-center text-sm text-gray-600 dark:text-gray-300">or</div>
                      <Button variant="outline" className="w-full transition-smooth hover-lift" onClick={handleBuyNow}>
                        Buy Now - ${auction.buyNowPrice.toLocaleString()}
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <AlertCircle className="h-4 w-4" />
                  <span>Minimum bid increment: $100</span>
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
                    src={auction.seller.avatar || "/placeholder.svg"}
                    alt={auction.seller.name}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                  <div>
                    <h4 className="font-semibold">{auction.seller.name}</h4>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{auction.seller.rating}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Completed Projects</span>
                    <span className="font-medium">{auction.seller.completedProjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Watchers</span>
                    <span className="font-medium">{auction.watchers}</span>
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
                  <span className="font-medium">${auction.startingBid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Bid</span>
                  <span className="font-medium text-green-600">${auction.currentBid.toLocaleString()}</span>
                </div>
                {auction.buyNowPrice && (
                  <div className="flex justify-between">
                    <span>Buy Now Price</span>
                    <span className="font-medium">${auction.buyNowPrice.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Total Bids</span>
                  <span className="font-medium">{auction.bidders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Remaining</span>
                  <span className="font-medium text-red-600">{auction.timeLeft}</span>
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
          // Optionally refresh the page or update state
          console.log("User logged in successfully")
        }}
      />
    </div>
  )
}
