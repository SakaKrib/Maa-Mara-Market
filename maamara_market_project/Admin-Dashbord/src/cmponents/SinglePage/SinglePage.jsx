import './SinglePage.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import useVendors from '../Hooks/Vendor_hook/VendorHook';
import { useParams } from 'react-router-dom';
import { useTheme } from '@mui/material';
import { tokens } from '../../theme';
import { useAuth } from '../Auth/AuthContext/Context';
import { Progress } from '../../../components/ui/progress';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../../components/ui/hover-card';
import { IonIcon } from '@ionic/react';
import { Button } from "../../../components/ui/button"; 
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../components/ui/sheet";
import {
  shieldCheckmarkSharp,
  personCircleSharp,
  starSharp,
  storefrontSharp,
  chatbubbleEllipsesSharp,
  timeSharp
} from "ionicons/icons";

// Sample chart data
const data = [
  { name: 'Page A', uv: 4000, pv: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398 },
  { name: 'Page C', uv: 2000, pv: 9800 },
  { name: 'Page D', uv: 2780, pv: 3908 },
  { name: 'Page E', uv: 1890, pv: 4800 },
  { name: 'Page F', uv: 2390, pv: 3800 },
  { name: 'Page G', uv: 3490, pv: 4300 },
];

const Single = () => {
  const { vendors } = useVendors();
  const { vendorId } = useParams(); 
  const vendor = vendors.find(v => v.id.toString() === vendorId);

  const hasMissingFields = !vendor?.brand?.name || !vendor?.company || !vendor?.address;


  console.log(vendor)

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const user = useAuth();

  return (
    <div className="flex  gap-6 p-4 w-[100%]">
      {/* LEFT SIDE (User Info + Chart) */}
      <div className=" flex w-[50%] flex-col gap-6">
        
        {/* Top section (image + badges + info) */}
        <div className="flex flex-col lg:flex-col gap-6">
          
          {/* Image + Badges */}
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Vendor Image */}
            <div className="flex justify-center md:justify-start">
              <img
                src={vendor?.image}
                alt={vendor?.name}
                className="w-28 h-64 md:w-96 md:h-64 object-cover rounded-[5px]"
              />
            </div>

            {/* Vendor Badges */}
            <div
              className="p-4 rounded-lg w-full md:w-2/3 lg-full md:mt-0 h-fit lg:mt-auto"
              style={{ backgroundColor: colors.primary[600] }}
            >
              <h1 className="font-semibold text-lg md:text-xl sm-text-lg " style={{ color: colors.gray[100] }}>
                Vendor Badges
              </h1>
              <div
                className="flex sm:flex-wrap gap-3 sm:gap-4 mt-4 justify-center sm:justify-start w-full"
                style={{ color: colors.gray[100] }}
              >
                {/* Identity Verified */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={shieldCheckmarkSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.blueAccent[500],
                        border: `1px solid ${colors.blueAccent[900]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Identity Verified</h1>
                    <p className="text-sm px-3 text-white">
                      This vendor’s identity has been verified by admin.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Profile Completed */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={personCircleSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.greenAccent[500],
                        border: `1px solid ${colors.greenAccent[900]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Profile Completed</h1>
                    <p className="text-sm px-3 text-white">
                      This vendor has completed their profile details.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Active Vendor */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={storefrontSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.redAccent[500],
                        border: `1px solid ${colors.redAccent[900]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Active Vendor</h1>
                    <p className="text-sm px-3 text-white">
                      This vendor has listed active products.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Top Rated Vendor */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={starSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.yellowAccent[400],
                        border: `1px solid ${colors.yellowAccent[900]}`,
                        color: colors.gray[800],
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Top Rated Vendor</h1>
                    <p className="text-sm px-3 text-white">
                      Highly rated by customers for quality and service.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Fast Responder */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={chatbubbleEllipsesSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.tealAccent[500],
                        border: `1px solid ${colors.tealAccent[900]}`,
                        color: colors.gray[800],
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Fast Responder</h1>
                    <p className="text-sm px-3 text-white">
                      Vendor responds quickly to customer inquiries.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Long-term Vendor */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={timeSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.blueAccent[400],
                        color: colors.gray[800],
                        border: `1px solid ${colors.blueAccent[700]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Long-term Vendor</h1>
                    <p className="text-sm px-3 text-white">
                      Selling with us since{" "}
                      {vendor?.regDate ? new Date(vendor.regDate).getFullYear() : "N/A"}.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          </div>

          {/* Vendor Info */}
          <div
            className="space-y-4 p-4 rounded-md w-full md:w-fill"
            style={{ color: colors.gray[100], backgroundColor: colors.primary[600] }}
          >
            <div className="flex justify-between items-center">
              <h1 className="text-lg md:text-xl">{vendor?.role} Information</h1>
              {/* Edit Profile Sheet */}
              <Sheet>
  <SheetTrigger asChild>
    <button className="bg-white px-4 py-1 text-black rounded-md hover:bg-gray-200">
      Edit
    </button>
  </SheetTrigger>
  <SheetContent className="w-[400px] sm:w-[540px]">
    <SheetHeader>
      <SheetTitle>Complete Your Profile</SheetTitle>
      <SheetDescription>
        {hasMissingFields
          ? "Some required fields are missing. Please complete your profile."
          : "Update your vendor information here."}
      </SheetDescription>
    </SheetHeader>

    {/* Example form inside */}
    <div className="space-y-4 mt-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Company Name</span>
        <input
          type="text"
          defaultValue={vendor?.company}
          className="border p-2 rounded-md"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Brand Name</span>
        <input
          type="text"
          defaultValue={vendor?.brand?.name}
          className="border p-2 rounded-md"
        />
      </label>
    </div>
  </SheetContent>
</Sheet>

            </div>

            {/* Profile Completion */}
            <div className="flex flex-col gap-2 mb-6">
              <p className="text-sm md:text-lg text-muted-foreground">Profile Completion</p>
              <Progress value={33} />
            </div>

            {(!vendor?.brand?.name || !vendor?.company || !vendor?.address) && (
            <div className="bg-red-500 text-white p-3 rounded-md mb-4">
              ⚠️ Your profile is incomplete. Please complete your vendor details and brand info.
              <button className="ml-4 bg-white text-black px-3 py-1 rounded hover:bg-gray-200">
                Complete Profile
              </button>
            </div>
          )}

            {/* Vendor Details */}
            <div className="flex flex-col gap-2 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <span className="font-bold">Name:</span>
                <span>{vendor?.name}, {vendor?.last_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Username:</span>
                <span>{vendor?.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Email:</span>
                <span>{vendor?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Contact:</span>
                <span>{vendor?.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Location:</span>
                <span>{vendor?.address}, {vendor?.city}, {vendor?.country}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Company:</span>
                <span>{vendor?.company}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Role:</span>
                <span className="p-1 bg-white rounded-md" style={{ color: colors.gray[900] }}>
                  {vendor?.role}
                </span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="font-bold">Joined on:</span>
                <span className="p-1 rounded-md" style={{ color: colors.gray[400] }}>
                  {vendor?.regDate ? new Date(vendor.regDate).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-64 md:h-96 p-4 rounded-md shadow" style={{backgroundColor:colors.gray[800]}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RIGHT SIDE (Activities) */}
      <div className="activities p-4 rounded-md  w-[50%] " style={{color:colors.gray[100], backgroundColor:colors.primary[600]}}>
        <h4 className="font-semibold mb-4 text-lg">Latest Activities</h4>
        <ul className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <li key={i} className="border-b border-gray-200 dark:border-gray-700 pb-2 border-l relative">
              <span className='absolute w-3 h-3 -left-1 hidden top-15 rounded-full' style={{backgroundColor:colors.yellowAccent[500]}}></span> 
              <div className="activity text-sm flex flex-col gap-1">
                <p className='relative'>Johnathan Duke purchased a giraffe lampshade – KES 45,000</p>
                <time className="text-gray-400">3 days ago</time>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Single;
