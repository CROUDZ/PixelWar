import React from "react";
import PixelCanvas from "../components/PixelCanvas";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

const Header = dynamic(() => import("../components/Header"), {
  ssr: false,
});
const PixelInformations = dynamic(
  () => import("../components/PixelInformations"),
  {
    ssr: false,
  },
);

const HomePage: React.FC = () => {
  const { data: session } = useSession();

  console.log("Session data:", session);
  return (
    <>
      <Header />
      <main className="w-full h-full mx-auto">
        <PixelCanvas pixelWidth={100} pixelHeight={100} />
      </main>
      <PixelInformations />
    </>
  );
};

export default HomePage;
