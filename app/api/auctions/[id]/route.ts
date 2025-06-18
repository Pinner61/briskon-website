import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateTimeLeft } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const start = new Date(data.scheduledstart);
    const duration = data.auctionduration
      ? ((d) => ((d.days || 0) * 24 * 60 * 60) + ((d.hours || 0) * 60 * 60) + ((d.minutes || 0) * 60))(data.auctionduration)
      : 0;
    const end = new Date(start.getTime() + duration * 1000);
    const timeLeft = calculateTimeLeft(end);

    const auction = {
      ...data,
      timeLeft,
      participants: data.participants || [], // Ensure participants is an array
    };

    return NextResponse.json({ success: true, data: auction }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { currentbid, participants, bidcount } = await request.json();
    const { data, error } = await supabase
      .from("auctions")
      .update({ currentbid, participants, bidcount })
      .eq("id", params.id)
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Recalculate timeLeft for the updated auction
    const start = new Date(data[0].scheduledstart);
    const duration = data[0].auctionduration
      ? ((d) => ((d.days || 0) * 24 * 60 * 60) + ((d.hours || 0) * 60 * 60) + ((d.minutes || 0) * 60))(data[0].auctionduration)
      : 0;
    const end = new Date(start.getTime() + duration * 1000);
    const timeLeft = calculateTimeLeft(end);

    const updatedAuction = {
      ...data[0],
      timeLeft,
      participants: data[0].participants || [],
    };

    return NextResponse.json({ success: true, data: updatedAuction }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
