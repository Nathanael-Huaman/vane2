import { NextResponse } from "next/server";
import { VIEW_MODE_CLIENTE } from "@/lib/types";
import { getCurrentPersistedSession } from "@/lib/server/auth-session";

export async function GET() {
  try {
    const persistedSessionResult = await getCurrentPersistedSession();
    if (!persistedSessionResult.ok) {
      return NextResponse.json({ viewMode: null });
    }

    return NextResponse.json({
      viewMode: persistedSessionResult.data.viewMode || VIEW_MODE_CLIENTE,
    });
  } catch (error) {
    return NextResponse.json({ viewMode: VIEW_MODE_CLIENTE });
  }
}
