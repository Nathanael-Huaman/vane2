import { NextResponse } from "next/server";
import { registrarUsuario } from "@/lib/server/user/registro";
import { logError } from "@/lib/server/shared";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud invalido" },
      { status: 400 }
    );
  }

  const { email, password, confirmPassword } = body ?? {};

  try {
    const result = await registrarUsuario({ email, password, confirmPassword });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.status }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    logError("POST /api/auth/registro: error inesperado", {
      action: "registro-route",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
