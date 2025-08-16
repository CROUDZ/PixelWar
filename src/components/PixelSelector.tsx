import React, { useState } from "react";

const nesPalette = [
  "#000000",
  "#9D9D9D",
  "#FFFFFF",
  "#BE2633",
  "#E06F8B",
  "#493C2B",
  "#A46422",
  "#EB8931",
  "#F7E26B",
  "#2F484E",
  "#44891A",
  "#A3CE27",
  "#1B2632",
  "#005784",
  "#8A2BE2", // Violet
  "#B2DCEF",
];

interface PixelSelectorProps {
  onSelect: (color: string) => void;
  valide?: boolean;
}

const PixelSelector: React.FC<PixelSelectorProps> = ({
  onSelect,
  valide = false,
}) => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onSelect(color);
  };
  return (
    <div
      className={`bg-white/90 p-2 rounded shadow-lg flex flex-wrap gap-2 max-w-xs 
    sm:max-w-sm md:max-w-none justify-center items-center ${valide ? "flex-row" : "sm:flex-col"}`}
    >
      {nesPalette.map((color) => (
        <button
          key={color}
          style={{
            backgroundColor: color,
          }}
          className={`${color === selectedColor ? "border-3 border-blue-500 scale-105" : ""} w-8 h-8 border-2 border-gray-300 cursor-pointer rounded transition-transform`}
          onClick={() => handleColorSelect(color)}
        />
      ))}
    </div>
  );
};

export default PixelSelector;
