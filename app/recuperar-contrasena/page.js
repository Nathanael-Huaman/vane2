import { ThemeToggle } from "@/components/theme-toggle";
import { PasswordResetRequestForm } from "@/components/password-reset-request-form";

export default function RecuperarContrasenaPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          OBSTEDESIGN
        </h1>
        <p className="mt-2 text-muted-foreground">
          Recupera el acceso a tu cuenta
        </p>
      </div>

      <PasswordResetRequestForm />

      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        El enlace de recuperacion es temporal y esta pensado para restaurar el
        acceso sin exponer informacion sensible del sistema.
      </p>
    </div>
  );
}
