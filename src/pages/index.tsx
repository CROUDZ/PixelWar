import React from "react";
import PixelCanvas from "../components/pixel/PixelCanvas";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

const Header = dynamic(() => import("../components/Header"), {
  ssr: false,
});
const PixelInformations = dynamic(
  () => import("../components/pixel/PixelInformations"),
  {
    ssr: false,
  },
);
const PixelSelector = dynamic(
  () => import("@/components/pixel/PixelSelector"),
  {
    ssr: false,
  },
);

const HomePage: React.FC = () => {
  const { data: session } = useSession();
  const [selectedColor, setSelectedColor] = React.useState<string>("");

  console.log("Session data:", session);
  return (
    <>
      <Header />
      <main className="w-full h-full mx-auto grid grid-cols-6 grid-rows-1 bg-gray-100">
        <div className="col-span-1 flex justify-start items-center">
          <PixelSelector onSelect={setSelectedColor} />
        </div>
        <div className="col-span-4 flex justify-center items-center">
          <PixelCanvas
            pixelWidth={100}
            pixelHeight={100}
            selectedColor={selectedColor}
          />
        </div>
        <div className="col-span-1 flex justify-end items-center">
          <PixelInformations />
        </div>
      </main>
    </>
  );
};

export default HomePage;
