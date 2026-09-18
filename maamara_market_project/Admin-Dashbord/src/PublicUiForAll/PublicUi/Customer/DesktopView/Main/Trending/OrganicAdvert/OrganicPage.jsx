import React, { useEffect, useState } from "react";
import api from "../../../../../../../Services/Api";
import { useNavigate } from "react-router-dom";
import Maamara from "../../../../../../../assets/Logo/Maamara.jpg";
import SearchBar from "../../../../../../../PublicUiForAll/PublicUi/Navigations/Search/Search";

const OrganicPage = () => {
  const [organicItems, setOrganicItems] = useState([]);
  const [isFixed, setIsFixed] = useState(false);
  const navigate = useNavigate();

  // Fetch organic items
  useEffect(() => {
    const fetchOrganicItems = async () => {
      try {
        const res = await api.get("/api/items/");
        const data = res.data?.results || res.data;

        // Filter items: any product that is organic
        const filtered = data.filter((item) => item.is_organic === true);

        console.log("All items:", data);
        console.log("Filtered organic items:", filtered);

        setOrganicItems(filtered);
      } catch (err) {
        console.error("Error fetching organic items:", err);
      }
    };

    fetchOrganicItems();
  }, []);

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsFixed(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full">
      {/* Header */}
      <div
        className={`w-full fixed top-0 left-0 z-50 transition-all duration-500 ${
          isFixed ? "bg-transparent shadow-custom" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto">
          <div className="flex items-center justify-between w-full gap-4 mt-10 p-2">
            {/* Logo */}
            <div className="flex gap-2 items-center border-b p-2 border-1">
              <img
                src={Maamara}
                alt="maamara-logo"
                className={`rounded-full ring p-1 ring-1 ring-green-500 transition-all duration-500 ${
                  isFixed ? "w-[40px] h-[40px]" : "w-[50px] h-[50px]"
                }`}
              />

              <div className="logo transition-colors duration-500">
                <a
                  href="#"
                  className={`text-lg font-bold ${
                    isFixed ? "text-gray-800" : "text-white"
                  }`}
                >
                  <span className="text-gray-600">Maa</span>{" "}
                  <span className="it-name">Mara</span>{" "}
                  <span className="mkrt">Market</span>
                </a>
              </div>
            </div>

            {isFixed && (
              <div className="transition-all duration-300 w-full p-4">
                <SearchBar />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative w-full h-[80vh] md:h-[90vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-800 to-white flex flex-col justify-center items-center text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            Welcome to the <em>MaaMara</em> Organic Ecosystem 🌱
          </h1>
          <p className="max-w-2xl text-lg md:text-xl mb-6">
            Discover fresh, chemical-free, and sustainable products from trusted
            farmers. Together, we grow a healthier planet.
          </p>
        </div>
      </div>

      {/* Organic Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">
          Our Organic Products
        </h2>

        {organicItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {organicItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
                onClick={() => navigate(`/item/${item.id}`)}
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <h3 className="text-sm md:text-base font-semibold text-gray-700 line-clamp-2">
                    {item.name}
                  </h3>

                  <div className="text-green-600 font-bold">
                    KES {item.final_discounted_price || item.final_price}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {item.is_organic && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Organic 🌱
                      </span>
                    )}
                    {item.is_fresh_food && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        Food 🍎
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-10">
            No organic products available yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default OrganicPage;