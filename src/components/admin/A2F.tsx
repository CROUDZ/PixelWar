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
    <main className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-3xl p-8">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Authentification 2FA
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sécurisez votre accès administrateur
            </p>
          </div>

          {/* QR Code */}
          <div className="text-center mb-8">
            <div className="bg-white rounded-2xl p-6 mb-4 inline-block">
              {otpAuthUrl ? (
                <QRCode value={otpAuthUrl} size={200} />
              ) : (
                <div className="w-[200px] h-[200px] loading-shimmer rounded-xl"></div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Scannez avec Google Authenticator
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                placeholder="Code à 6 chiffres"
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 text-center text-xl font-mono tracking-wider"
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={token.length !== 6 || isLoading}
              className="w-full glass-button py-3 rounded-xl font-semibold text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

          {message && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-300">
                {message}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default A2F;
