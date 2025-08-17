import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSession, useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import QRCode from "react-qr-code";


const AdminPage: React.FC = () => {
  const { data: session, status } = useSession();
  console.log("AdminPage session:", session);
  const router = useRouter();
  const [otpAuthUrl, setOtpAuthUrl] = useState("");
  const [token, setToken] = useState("");
  const [admin, setAdmin] = useState("");

  useEffect(() => {
    if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
      router.push("/");
    } else if (session && !session.user.twoFA) {
      fetch("/api/2fa/setup")
        .then((res) => res.json())
        .then((data) => {
          if (data.otpAuthUrl) {
            console.log("2FA setup data:", data);
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



  const handleVerify = async (e: React.FormEvent) => {
    if (!session?.user.id) return;
    e.preventDefault();
    
    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: session.user.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Recharger la session pour refléter le changement de twoFA
        window.location.reload();
      } else {
        alert("Code incorrect ! Vérifiez votre Google Authenticator.");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      alert("Erreur lors de la vérification. Veuillez réessayer.");
    }
  };

  if (!session) return <p>Chargement...</p>;

  if (!session.user.twoFA) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Activer la 2FA</h1>
          <div className="text-center mb-6">
            <p className="mb-4">Scannez ce QR Code avec Google Authenticator :</p>
            {otpAuthUrl ? (
              <div className="flex flex-col items-center">
                <QRCode value={otpAuthUrl} size={200} className="mb-4" />
                <p className="text-xs text-gray-500 break-all">
                  URL: {otpAuthUrl}
                </p>
              </div>
            ) : (
              <p>Génération du QR Code...</p>
            )}
          </div>
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Entrez le code à 6 chiffres"
              className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
              pattern="[0-9]{6}"
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={token.length !== 6}
            >
              Vérifier et activer
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Page admin normale
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Administration PixelWar
              </h1>
              <p className="text-sm text-gray-600">
                Gestion et surveillance du serveur
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Retour au Jeu
              </Link>
            </div>
            <p>Ajouter un admin , indiquer son adresse email , attention il faut qu'il se connecte au moins une fois pour que son compte soit créé.</p>
            <input
              type="text"
              value={admin}
              onChange={(e) => setAdmin(e.target.value)}
              placeholder="Ajouter un admin par email"
              className="px-4 py-2 border rounded"
            />
          </div>
        </div>
      </header>
    </div>
  );
};

export default AdminPage;

// SSR
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session || session.user.role !== "ADMIN") {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  return { props: { session } };
};
