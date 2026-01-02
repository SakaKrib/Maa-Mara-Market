import TopBox from "../Home/TopBox/TopBox";
import ChartBox from "../ChartBox/CharBox";
import CombinedVendorStatsChart from "../ChartBox/PieChart2";
import BarVendor from "../ChartBox/Bar/Bar";
import Activities from "../ChartBox/Bar/RecentActivities/Activities";
import { chartBoxes } from "../ChartBox/ChartData/ChartData";
import useVendorStatsBox from "../../Hooks/ItemStats/ItemStatsHook";
import VendorStatsBox from "../ItemStats/ItemStats";
import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";
import { IonIcon } from "@ionic/react";
import {menuOutline} from "ionicons/icons";
import VendorNotifications from "./notifications/Notifications_vendor";
import { useMonthlySales } from "../ChartBox/ChartData/HomeChartData/SalesReport";
import { useVendorItemGrowthStats } from "../../Hooks/ItemStats/VendorItemStats";
import { useVendorPendingOrdersStats } from "../../Hooks/ItemStats/PendingOrderStat";
import StockSummaryBox from "../Products/Inventory/StockSummary";

const Home = ({ vendor_id }) => {
  const vendorStats = useVendorStatsBox({ vendorId: vendor_id });
  const monthlySales = useMonthlySales();
  const vendorGrowthStats = useVendorItemGrowthStats();
  const Orderstats = useVendorPendingOrdersStats();

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  
  return (
    <div>
      <div className="w-full flex items-center p-2 top-3 relative">
        <span className="text-2xl ml-auto px-4 text-gray-100">
          <VendorNotifications />
        </span>
      </div>

    <div
    className="grid gap-5 p-4 
      grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 
      auto-rows-[minmax(180px,auto)] vendor-home 
      sm:w-[calc(100%-0px)] xxs:w-[calc(100%-80px)]  relative xxs:top-10 sm:top-10 md:top-0 lg:top-0"
    style={{ color: colors.gray[100] }}
  >
   
  
      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 row-span-3 sm:col-span-2 xxs:col-span-2 md:col-span-1 lg:col-span-1 ">
        <div>
        <TopBox />
        </div>
      </div>

      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 sm:col-span-2 xxs:col-span-2 md:col-span-1">
        {vendorStats.loading ? (
          <p>Loading vendor stats...</p>
        ) : vendorStats.error ? (
          <p>{vendorStats.error}</p>
        ) : (
          <ChartBox {...vendorStats} />
        )}
      </div>

      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 sm:grid-cols-2 sm:col-span-2 xxs:col-span-2 md:col-span-1">
        <ChartBox {...monthlySales} />
      </div>

      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 row-span-3 md:row-span-1 md:col-span-1 lg:col-span-1 lg:row-span-3 xxl:row-span-3 sm:col-span-2 xxs:col-span-2  ">
        <BarVendor />
      </div>

        {/* orderstats */}
      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 sm:col-span-2 xxs:col-span-2 md:col-span-1">
        <ChartBox {...Orderstats} />
      </div>

      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 sm:col-span-2 xxs:col-span-2 md:col-span-1">
        <ChartBox {...vendorGrowthStats} />
      </div>

      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 col-span-2 row-span-2 lg:col-span-2 ">
        <Activities />
      </div>

      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 sm:col-span-2 xxs:col-span-2 md:col-span-1">
      <CombinedVendorStatsChart 
        vendorStats={vendorStats} 
        monthlySales={monthlySales} 
        vendorGrowthStats={vendorGrowthStats} 
        orderStats={Orderstats} 
      />

      </div>

      <div className="box p-4 rounded-lg border shadow-custom border-gray-700 sm:col-span-2 xxs:col-span-2 md:col-span-1">
        <StockSummaryBox />
      </div>
     
    </div>
     {/* go to shop */}
      <div className="b-20 p-4" style={{position:"fixed",display:'flex',bottom:'0', justifyContent:'center', alignItems:'center', width:'100%'}}>
        <a href="/"> <button className="bg-white p-2 rounded-full hover:bg-gray-400 hover:text-gray-100 ">Go To Shop</button></a>
      </div>
      </div>
  );
};

export default Home;
