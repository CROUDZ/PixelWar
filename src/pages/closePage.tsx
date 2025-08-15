"use client";
import { useEffect } from "react";
import Loading from "@/components/Loading";

export default function ClosePage() {
  useEffect(() => {
    // Ferme la fenêtre dès que la page est chargée
    window.close();
  }, []);

  return <Loading />;
}
