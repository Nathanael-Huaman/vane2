import { NextResponse } from "next/server";
import { VIEW_MODE_CLIENTE } from "@/lib/types";
import { getOptionalPersistedSession } from "@/lib/server/auth";

export async function GET() {
  try {
    const persistedSession = await getOptionalPersistedSession();
    if (!persistedSession) {
      return NextResponse.json({ viewMode: null });
    }

    return NextResponse.json({
      viewMode: persistedSession.viewMode || VIEW_MODE_CLIENTE,
    });
  } catch (error) {
    return NextResponse.json({ viewMode: VIEW_MODE_CLIENTE });
  }
}
