import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const A2F: React.FC = ({}) => {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [otpAuthUrl, setOtpAuthUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
      router.push("/");
    } else if (session && !session.user.twoFA) {
      fetch("/api/2fa/setup")
        .then((res) => res.json())
        .then((data) => {
          if (data.otpAuthUrl) {
            setOtpAuthUrl(data.otpAuthUrl);
          } else {
            console.error("Failed to setup 2FA:", data);
          }
        })
        .catch((error) => {
          console.error("Error setting up 2FA:", error);
        });
    }
  }, [status, session, router]);

  const [message, setMessage] = React.useState<string | null>(null);
  const handleVerify = async (e: React.FormEvent) => {
    if (!session?.user.id) return;
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: session.user.id }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.reload();
      } else {
        setMessage("Code incorrect ! Vérifiez votre Google Authenticator.");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      setMessage("Erreur lors de la vérification. Veuillez réessayer.");
    }
    setIsLoading(false);
  };

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6 bg-background">
      <div className="w-full max-w-md">
        {/* Container principal avec effet glass */}
        <div className="relative backdrop-blur-md bg-glass-primary border border-glass-200 rounded-3xl p-8 shadow-glass">
          {/* Fond dégradé subtil */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-50/20 via-transparent to-accent-100/10 rounded-3xl"></div>

          {/* Contenu */}
          <div className="relative z-10">
            {/* En-tête */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Authentification 2FA
              </h1>
              <p className="text-text-secondary">
                Sécurisez votre accès administrateur
              </p>
            </div>

            {/* QR Code */}
            <div className="text-center mb-8">
              <div className="bg-white rounded-2xl p-6 mb-4 border border-border-primary shadow-md inline-block">
                {otpAuthUrl ? (
                  <QRCode value={otpAuthUrl} size={200} />
                ) : (
                  <div className="w-[200px] h-[200px] bg-gradient-to-r from-surface-secondary via-surface-tertiary to-surface-secondary bg-shimmer rounded-xl animate-shimmer"></div>
                )}
              </div>
              <p className="text-sm text-text-muted">
                Scannez avec Google Authenticator
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  Code à 6 chiffres
                </label>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-surface-primary border border-border-primary rounded-xl focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 text-center text-xl font-mono tracking-wider text-text-primary transition-all duration-200"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                disabled={token.length !== 6 || isLoading}
                className="w-full bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-hover hover:to-accent-600 text-white font-semibold py-3 px-6 
                rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                disabled:transform-none hover:shadow-glow"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Vérification...
                  </div>
                ) : (
                  "Vérifier et Activer"
                )}
              </button>
            </form>

            {/* Message d'erreur */}
            {message && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-700 dark:text-red-300 text-center">
                  {message}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default A2F;
