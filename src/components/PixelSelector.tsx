import React from "react";

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
  "#31A2F2",
  "#B2DCEF",
];

interface PixelSelectorProps {
  onSelect: (color: string) => void;
}

const PixelSelector: React.FC<PixelSelectorProps> = ({ onSelect }) => {
  return (
    <div className="bg-white/90 p-2 rounded shadow-lg sm:flex-col flex flex-wrap gap-2 max-w-xs sm:max-w-sm md:max-w-none justify-center items-center">
      {nesPalette.map((color) => (
        <button
          key={color}
          style={{
            backgroundColor: color,
          }}
          className="w-8 h-8 border-2 border-gray-300 cursor-pointer rounded hover:scale-110 transition-transform"
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );
};

export default PixelSelector;
