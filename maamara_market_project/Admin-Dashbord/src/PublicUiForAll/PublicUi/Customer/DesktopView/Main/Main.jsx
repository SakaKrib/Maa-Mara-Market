import React, {useEffect} from 'react';
import "../../../../PublicUi/maamara.css";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/thumbs";
import "swiper/css/free-mode";
import {Swiper, SwiperSlide} from 'swiper/react';
import { Pagination } from 'swiper/modules';
import GiraffeLampshade from "../../../../../assets/products/girrafe lampshade.jpg";
import Furniture from "../../../../../assets/products/Screenshot_20250703_015956_Instagram.jpg";
import Ornaments from "../../../../../assets/products/Screenshot_20250703_020105_Instagram.jpg";

//import filters
import ListPage from './ListPage';


// Imports (assuming the path is src/assets/products/...)
import img1 from '../../../../../assets/products/Screenshot_20250703_015944_Instagram.jpg';
import img2 from '../../../../../assets/products/placematts.jpg';
import img3 from '../../../../../assets/products/20241126_140823.jpg';
import img4 from '../../../../../assets/products/set buskets.jpg';
import img5 from '../../../../../assets/products/Screenshot_20250703_015956_Instagram.jpg';
import img6 from '../../../../../assets/products/jani soap.jpg';
import img7 from '../../../../../assets/products/afican hut.jpg';
import img8 from '../../../../../assets/products/girrafe lampshade.jpg';
import img9 from '../../../../../assets/products/Screenshot_20250703_020022_Instagram.jpg';
import img10 from '../../../../../assets/products/Screenshot_20250703_020105_Instagram.jpg';
import img11 from '../../../../../assets/products/kuba wall hanging.jpg';
import img12 from '../../../../../assets/products/nativity.jpg';
import img13 from '../../../../../assets/products/baobab.jpg';
import TrendingProducts from './Trending/Product';
import "../../../../../index.css";
import BrandList from './Trending/Brands';
import Banners from './Trending/Banner';
import CategoryWithItems from './Trending/Category/CategoryWithItemList';
import AdvertBlogs from '../../../../../cmponents/Hooks/BlogHooksNew/BlogAdvert';
import OrganicSlideshow from './Trending/OrganicAdvert/OrganicDvert';



const brandList = [
  'Shanga Na Kanga',
  'Jabali',
  'Sandstorm',
  'Jani',
  'Maa Mara',
  'Jager Nuts',
];




const Main = () => {

   
  return (
    <main>

        
        {/* header middle */}
    
    <div className="header-middle">
      <div className="container-full">
        <div className="wrapper">
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            loop={true}
            className="myslider"
          >
            <SwiperSlide>
              <div className="item">
                <div className="image object-cover">
                  <img src={img8} alt="Giraffe Lampshade" />
                </div>
                <div className="container relative top-10">
                  <h2>
                    <span className='text-5xl text-gray-100 relative top-10'>Come and Get it!</span>
                    <br />
                    <span className='text-6xl top-10 relative text-gray-900'>Made with love and beads</span>
                  </h2>
                  <h4 className='mt-2'>Giraffe Lampshade</h4>
                  <a href="#" className="ring-3 primary-button p-4 hover:bg-black rounded-full hover:text-gray-100 font-semibold relative top-10">Buy Now</a>
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="item">
                <div className="image object-cover">
                  <img src={Furniture} alt="Handmade" />
                </div>
                <div className="container relative top-10">
                  <h2>
                    <span className='text-5xl text-gray-100 relative top-10'>Come and Get it!</span>
                    <br />
                    <span className='text-6xl top-10 relative text-gray-900'>High quality African handmade</span>
                  </h2>
                  <h4>Giraffe Lampshade</h4>
                  <a href="#" className="ring-3 primary-button p-4 hover:bg-black rounded-full hover:text-gray-100 font-semibold relative top-10">Buy Now</a>
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="item">
                <div className="image object-cover">
                  <img src={Ornaments} alt="Unique Stuff" />
                </div>
                <div className="container relative top-10">
                  <h2>
                    <span className='text-5xl text-gray-100 relative top-10'>Don't wait — you can use vouchers!</span>
                    <br />
                    <span className='text-6xl top-10 relative text-gray-900'>Find Unique and Quality Stuff</span>
                  </h2>
                  <h4>Giraffe Lampshade</h4>
                  <a href="#" className="ring-3 primary-button p-4 hover:bg-black rounded-full hover:text-gray-100 font-semibold relative top-10">Buy Now</a>
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="item">
                <div className="image object-cover">
                  <img src={img12} alt="Adventure" />
                </div>
                <div className="container relative top-10">
                  <h2>
                    <span className='text-5xl text-gray-100 relative top-10'>Buy it now!</span>
                    <br />
                    <span className='text-6xl top-10 relative text-gray-900'>Dive into the core of Africa's </span>
                  </h2>
                  <h4>Giraffe Lampshade</h4>
                  <a href="#" className="ring-3 primary-button p-4 hover:bg-black rounded-full hover:text-gray-100 font-semibold relative top-10">Buy Now</a>
                </div>
              </div>
            </SwiperSlide>
          </Swiper>
        </div>
      </div>
    </div>


    {/* category box row */}

    <div className="category-collections">
  {/* Category Selector */}
  <div className="category-cont">
    <div className="containers">
      <div className="wrappe">
        <div className="">
          {/* category component */}
          <CategoryWithItems/>
        </div>
      </div>
    </div>
  </div>

  {/* Multi Collections Section */}
  <div className="multi-collections container">
    <div className="wrapper flexcol">
      <div className="container-head">
        <h1>Multi Collections</h1>
      </div>
      <div className="flex">
        <h4>Collection</h4>
        <div className="kitchen-dep">
          <div className="product-1">
            <a href="#"><img src={img4} alt="" /></a>
            <a href="#"><img src={img4} alt="" /></a>
          </div>

          <div className="product-3">
            <a href="#"><img src={img1} alt="" /></a>
            <a href="#"><img src={img5} alt="" /></a>
          </div>

          <div className="extra-product">
            <a href="#"><img src={img6} alt="" /></a>
            <a href="#"><img src={img4} alt="" /></a>
          </div>
        </div>
      </div>

      {/* Bed and Blankets Collection */}
      <div className="flex">
        <h4>Collection</h4>
        <div className="kitchen-dep">
          <div className="product-1">
            <a href="#"><img src={img4} alt="" /></a>
            <a href="#"><img src={img7} alt="" /></a>
          </div>

          <div className="product-3">
            <a href="#"><img src={img8} alt="" /></a>
            <a href="#"><img src={img2} alt="" /></a>
          </div>

          <div className="extra-product">
            <a href="#"><img src={img9} alt="" /></a>
            <a href="#"><img src={img10} alt="" /></a>
          </div>
        </div>
      </div>

      {/* Organic Substances Collection */}
      <div className="container">
        <div className="flex">
          <h4>Collection</h4>
          <div className="kitchen-dep">
            <div className="product-1">
              <a href="#"><img src={img11} alt="" /></a>
              <a href="#"><img src={img12} alt="" /></a>
            </div>

            <div className="product-3">
              <a href="#"><img src={img3} alt="" /></a>
              <a href="#"><img src={img2} alt="" /></a>
            </div>

            <div className="extra-product">
              <a href="#"><img src={img13} alt="" /></a>
              <a href="#"><img src={img1} alt="" /></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


    {/* companies and brands */}
    <div className="">
      <BrandList/>
      
    </div>



    {/* listpage */}
    
    <div>
      <ListPage/>
    </div>

    {/* Organic Advert */}

    <div>
      <OrganicSlideshow/>
    </div>


    {/* trending */}

    <div>
      <TrendingProducts/>
    </div>
    




      {/* banners */}
      <div>
        <Banners/>
      </div>

      {/* popular blog advert */}
      <div>
        <AdvertBlogs/>
      </div>


    </main>

    // 
  );
};

export default Main;
