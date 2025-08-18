import React, { useState } from "react";

const nesPalette = [
  "#7C7C7C",
  "#0000FC",
  "#0000BC",
  "#4428BC",
  "#940084",
  "#A80020",
  "#A81000",
  "#881400",
  "#503000",
  "#007800",
  "#006800",
  "#005800",
  "#004058",
  "#BCBCBC",
  "#F8F8F8",
  "#FCFC00",
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
