import React, { useState, useEffect } from "react";
import Filter from "./Filter";
import kuba from "../../../../../assets/products/kuba wall hanging.jpg";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";
import { IonIcon } from "@ionic/react";
import CartIcon from "@mui/icons-material/ShoppingCartOutlined";
import {
  shareOutline,
  heartOutline,
  eyeOutline,
} from "ionicons/icons";

const ITEMS_PER_PAGE = 15;

const ListPage = () => {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Fetch items when filters or currentPage change, only if filters are applied
  useEffect(() => {
    if (filters && Object.keys(filters).length > 0) {
      fetchFilteredItems(filters, currentPage);
    } else {
      // Clear items & pagination if no filters
      setItems([]);
      setHasNext(false);
      setHasPrev(false);
    }
  }, [filters, currentPage]);

  const fetchFilteredItems = async (filterParams, page = 1) => {
    const query = new URLSearchParams();

    Object.entries(filterParams).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });

    query.append("page", page);
    query.append("page_size", ITEMS_PER_PAGE);

    try {
      const res = await fetch(`${baseUrl}/api/filtered-items/?${query.toString()}`);
      const data = await res.json();

      // Expecting Django REST Framework style pagination response
      if (Array.isArray(data.results)) {
        setItems(data.results);
        setHasNext(Boolean(data.next));
        setHasPrev(Boolean(data.previous));
      } else if (Array.isArray(data)) {
        // fallback if API returns array directly
        setItems(data);
        setHasNext(false);
        setHasPrev(false);
      } else {
        setItems([]);
        setHasNext(false);
        setHasPrev(false);
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setItems([]);
      setHasNext(false);
      setHasPrev(false);
    }
  };

  return (
    <div className="px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64 relative">
      {/* CAMPAIGN SECTION */}
      <div className="relative flex flex-col-reverse md:flex-row items-center justify-between bg-gray-100 p-6 rounded-lg mt-6">
        <div className="md:w-1/2 mb-6 md:mb-0">
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-800 mb-4">
            Grab up to 50% off on <br /> selected products
          </h1>
          <button className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-all">
            Buy now
          </button>
        </div>
        <div className="md:w-1/2 h-64 flex items-center justify-center">
          <img
            src={kuba}
            alt="Campaign banner"
            className="object-contain h-full w-full"
          />
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="mt-10">
        <Filter
          onFilterChange={(newFilters) => {
            setCurrentPage(1); // Reset to first page on filter change
            setFilters(newFilters);
          }}
        />
      </div>

      {/* CONDITIONAL ITEMS RENDERING */}
      <div className="trending">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 text-start sectop mt-5">
            <h2 className="title">Filtered Products</h2>
          </div>

          {filters && Object.keys(filters).length > 0 ? (
            <>
              {items.length === 0 ? (
                <p className="text-center text-gray-500 my-8">
                  No items found.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg shadow-sm hover:shadow-md transition duration-300 bg-white"
                    >
                      <div className="relative">
                        <img
                          src={`${baseUrl}${item.image}`}
                          alt={item.name}
                          className="w-full h-52 object-cover rounded-t-lg"
                        />

                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 flex flex-col gap-2">
                          <a href="#">
                            <IonIcon
                              icon={heartOutline}
                              className="text-white bg-red-500 rounded-full p-2 text-sm"
                            />
                          </a>
                          <a href="#">
                            <IonIcon
                              icon={eyeOutline}
                              className="text-white bg-blue-500 rounded-full p-2 text-sm"
                            />
                          </a>
                          <a href="#">
                            <IonIcon
                              icon={shareOutline}
                              className="text-white bg-green-500 rounded-full p-2 text-sm"
                            />
                          </a>
                        </div>

                        {/* Discount Badge */}
                        {item.final_discounted_price > 0 && (
                          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            {item.discount}% OFF
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="text-base font-semibold text-gray-800 mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          ({item.rating} reviews)
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg font-bold text-red-600">
                            KES {item.final_price.toLocaleString()}
                          </span>
                          {item.discount > 0 && (
                            <span className="line-through text-gray-400 text-sm">
                              KES{" "}
                              {(
                                item.price /
                                (1 - item.discount / 100)
                              )
                                .toFixed(0)
                                .toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                          <p>{item.sold} sold</p>
                          <p>{item.in_stock} in stock</p>
                        </div>
                        <button className="w-full flex items-center justify-center gap-2 primary-button text-white py-2 rounded-md hover:bg-indigo-700 transition">
                          <CartIcon fontSize="small" /> Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PAGINATION */}
              {(hasPrev || hasNext) && (
                <div className="flex justify-center mt-6 gap-4">
                  {hasPrev && (
                    <button
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                    >
                      Previous
                    </button>
                  )}
                  {hasNext && (
                    <button
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      Next
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-500 my-8">
              Please apply filters to see items.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListPage;
