import React from "react";
import PixelCanvas from "../components/PixelCanvas";
import dynamic from "next/dynamic";

const Header = dynamic(() => import("../components/Header"), {
  ssr: false,
});

const HomePage: React.FC = () => {
  return (
    <>
      <Header />
      <main className="w-full h-full mx-auto">
        <PixelCanvas pixelWidth={100} pixelHeight={100} />
      </main>
    </>
  );
};

export default HomePage;
