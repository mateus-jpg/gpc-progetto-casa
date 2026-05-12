import Logo from "@/components/Logo";
import { LoginForm } from "@/components/login/LoginForm";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top safe area spacer for notched phones */}
      <div className="pt-[env(safe-area-inset-top)]" />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-md">
            <Logo size={36} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Quadro Sociale</h1>
            
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>

      {/* Footer + bottom safe area */}
      <p className="pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 text-center text-xs text-muted-foreground">
        Progetto Casa — Portale Operatori
      </p>
    </div>
  );
}
