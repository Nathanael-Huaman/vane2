import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { VIEW_MODE_CLIENTE } from "@/lib/types";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ viewMode: null });
    }

    const viewMode = session.user.viewMode || VIEW_MODE_CLIENTE;

    return NextResponse.json({ viewMode });
  } catch (error) {
    return NextResponse.json({ viewMode: VIEW_MODE_CLIENTE });
  }
}
