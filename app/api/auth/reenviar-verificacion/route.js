import { NextResponse } from "next/server";
import { resendEmailVerification } from "@/lib/server/email-verification";
import { logError } from "@/lib/server/logger";
import { auth } from "@/lib/auth";

export async function POST(request) {
  let payload = null;
  try {
    payload = await request.json().catch(() => null);
  } catch {
    payload = null;
  }

  const email = payload?.email ?? null;

  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const result = await resendEmailVerification({ userId, email });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.status }
      );
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    logError("POST /api/auth/reenviar-verificacion: error inesperado", {
      action: "reenviar-verificacion-route",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

