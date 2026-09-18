import React from "react";
import img1 from "../../../../../assets/products/Screenshot_20250703_015944_Instagram.jpg";
import img2 from "../../../../../assets/products/placematts.jpg";
import img3 from "../../../../../assets/products/20241126_140823.jpg";
import img4 from "../../../../../assets/products/set buskets.jpg";
import img5 from "../../../../../assets/products/Screenshot_20250703_015956_Instagram.jpg";
import img6 from "../../../../../assets/products/jani soap.jpg";
import img7 from "../../../../../assets/products/afican hut.jpg";
import img8 from "../../../../../assets/products/girrafe lampshade.jpg";
import img9 from "../../../../../assets/products/Screenshot_20250703_020022_Instagram.jpg";
import img10 from "../../../../../assets/products/Screenshot_20250703_020105_Instagram.jpg";
import img11 from "../../../../../assets/products/kuba wall hanging.jpg";
import img12 from "../../../../../assets/products/nativity.jpg";
import img13 from "../../../../../assets/products/baobab.jpg";

const collections = [
  [img4, img4, img1, img5, img6, img4],
  [img4, img7, img8, img2, img9, img10],
  [img11, img12, img3, img2, img13, img1],
];

const Collection = ({ images }) => (
  <div className="flex">
    <h4>Collection</h4>
    <div className="kitchen-dep">
      <div className="product-1">
        {images.slice(0, 2).map((src, index) => <a href="#" key={`a-${index}`}><img src={src} alt="" /></a>)}
      </div>
      <div className="product-3">
        {images.slice(2, 4).map((src, index) => <a href="#" key={`b-${index}`}><img src={src} alt="" /></a>)}
      </div>
      <div className="extra-product">
        {images.slice(4, 6).map((src, index) => <a href="#" key={`c-${index}`}><img src={src} alt="" /></a>)}
      </div>
    </div>
  </div>
);

const MultiCollections = () => (
  <section className="multi-collections container">
    <div className="wrapper flexcol">
      <div className="container-head"><h1>Multi Collections</h1></div>
      {collections.map((images, index) => <Collection key={index} images={images} />)}
    </div>
  </section>
);

export default MultiCollections;
