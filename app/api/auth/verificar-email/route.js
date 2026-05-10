import { NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/server/email-verification";
import { logError } from "@/lib/server/logger";

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  try {
    const result = await verifyEmailWithToken(token);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.status }
      );
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    logError("GET /api/auth/verificar-email: error inesperado", {
      action: "verificar-email-route",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

