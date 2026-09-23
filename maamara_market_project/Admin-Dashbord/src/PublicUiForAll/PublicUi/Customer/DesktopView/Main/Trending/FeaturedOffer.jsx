import React from "react";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { IonIcon } from "@ionic/react";
import { heartOutline, eyeOutline, shareOutline } from "ionicons/icons";
import OfferCountdown from "./OfferCountdown";

const FeaturedOffer = ({ item }) => {
  if (!item) return null;
  const image = item.image?.startsWith("http") ? item.image : `${baseUrl || ""}${item.image || ""}`;

  return (
    <article className="bg-gray-100 p-4 rounded-lg mb-10">
      <div className="relative">
        <img src={image} alt={item.name} className="w-full object-cover rounded-lg max-h-[600px]" />
        <div className="absolute top-2 right-2 flex gap-2">
          <IonIcon icon={heartOutline} className="text-white bg-red-500 rounded-full p-2" />
          <IonIcon icon={eyeOutline} className="text-white bg-blue-500 rounded-full p-2" />
          <IonIcon icon={shareOutline} className="text-white bg-green-500 rounded-full p-2" />
        </div>
        <OfferCountdown endDateStr={item.offer?.end_date} />
        {Number(item.offer?.discount_percentage || 0) > 0 && (
          <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            {Number(item.offer.discount_percentage).toFixed(0)}% OFF
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold">{item.name}</h3>
        <p className="text-sm text-gray-600">({item.average_rating ?? 0} reviews)</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xl font-bold text-red-600">
            KES {Number(item.final_discounted_price ?? item.price ?? 0).toLocaleString()}
          </span>
          {Number(item.discount_price || 0) > 0 && (
            <span className="line-through text-gray-500">KES {Number(item.final_price || 0).toLocaleString()}</span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Stock: <strong>{item.in_stock ?? 0}</strong> | Sold: <strong>{item.sold || 0}</strong>
        </p>
      </div>
    </article>
  );
};

export default FeaturedOffer;
