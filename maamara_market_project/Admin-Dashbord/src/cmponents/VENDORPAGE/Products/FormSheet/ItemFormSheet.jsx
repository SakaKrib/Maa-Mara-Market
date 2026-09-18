import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../../../components/ui/sheet";
import VendorItemForm from "../Forms/ItemForms"; // adjust path as needed
import { Button } from "../../../../../components/ui/button";
import "../../../../index.css";
import "../../../../main.css";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";




const ItemFormSheet = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode)
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow">
            Add Item
          </Button>
        </SheetTrigger>
  
        <SheetContent
          side="right"
          className="w-full max-w-md p-6 shadow-lg border-l h-screen overflow-y-auto border-gray-200 mt-20 t-20" style={{backgroundColor:colors.primary[500], scrollY}}
        >
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold text-gray-800">
              Post New Item
            </SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              Fill in the details below to add a new item to your inventory.
            </SheetDescription>
          </SheetHeader>
  
          <div className="mt-6">
            <VendorItemForm />
          </div>
        </SheetContent>
      </Sheet>
    );
  };
  
  export default ItemFormSheet;

