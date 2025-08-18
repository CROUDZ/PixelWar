"use client";

import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Loading from "@/components/Loading";

const DiscordRedirectPage: React.FC = () => {
  const { status, data: session } = useSession();
  const [currentStep, setCurrentStep] = useState("Initialisation...");

  useEffect(() => {
    if (status === "loading") {
      setCurrentStep("Vérification de la session...");
      return;
    }

    if (status === "authenticated" && !session?.user?.linked) {
      setCurrentStep("Redirection vers la liaison...");
      setTimeout(() => {
        window.location.href = window.location.origin + "/link";
      }, 1000);
    } else if (status === "authenticated" && session?.user?.linked) {
      setCurrentStep("Connexion réussie ! Redirection...");
      setTimeout(() => {
        window.location.href = window.location.origin + "/close";
      }, 1000);
    } else {
      setCurrentStep("Connexion à Discord...");
      signIn("discord", {
        callbackUrl: window.location.origin + "/auth/discord-redirect",
      });
    }
  }, [status, session?.user?.linked]);

  return <Loading message={currentStep} />;
};

export default DiscordRedirectPage;
