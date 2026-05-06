import { checkDatabaseStatus } from "@/lib/actions/db-status";
import SetupClient from "./setup-client";

export const metadata = {
  title: "Obstedesign - Estado de la base de datos",
  description: "Verifica la conexion y el motor de persistencia configurado.",
};

export default async function SetupPage() {
  const initial = await checkDatabaseStatus();

  return <SetupClient initial={initial} />;
}
