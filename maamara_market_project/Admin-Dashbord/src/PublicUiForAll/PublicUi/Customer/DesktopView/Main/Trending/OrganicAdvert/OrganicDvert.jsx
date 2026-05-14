import React, { useState, useEffect, useRef } from "react";
import Kales from "../../../../../../../assets/organicFood/kales.jpeg";
import Chocolate from "../../../../../../../assets/organicFood/chocolate.jpeg";
import Fruits from "../../../../../../../assets/organicFood/fruits.jpeg";
import Coffee from "../../../../../../../assets/organicFood/coffee.jpeg";
import { useNavigate } from "react-router-dom";

const images = [
  Kales,
  Chocolate,
  Fruits,
  Coffee,
];

const slideDuration = 6000; // 6 seconds

export default function OrganicSlideshow() {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, slideDuration);

    return () => clearTimeout(timeoutRef.current);
  }, [current]);

  return (
    <div className="max-w-7xl mx-auto mt-8 overflow-hidden rounded-md shadow-lg relative w-full h-[500px]">
      {images.map((src, index) => (
        <div
          key={index}
          className={`group absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <img
            src={src}
            alt={`Organic slide ${index + 1}`}
            className="w-full h-full object-cover animate-zoomIn select-none"
            draggable={false}
          />

          {/* Button appears on hover */}
          <button
            onClick={() => navigate("/organic")}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-green-700 text-white px-6 py-2 rounded shadow-lg hover:bg-green-800"
          >
            Shop Organic
          </button>
        </div>
      ))}

      {/* Dots navigation */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-3 h-3 rounded-full ${
              idx === current ? "bg-green-700" : "bg-green-300"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
