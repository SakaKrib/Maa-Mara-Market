import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,

  } from "../../../../../../components/ui/sheet";
  import { ScrollArea } from "../../../../../../components/ui/scroll-area";
  import { Button } from "../../../../../../components/ui/button";
  import EditItem from "../EditItem/EditItem";
  import CreateItem from "../CreateItem/CreateItem";
    import { useTheme } from "@mui/material";
  import { tokens } from "../../../../../theme";
import { Margin, WidthFull } from "@mui/icons-material";
  
  const ItemCreateDrawer = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
  
    return(
    <Sheet className="">
      <SheetTrigger className="text-black px-2 py-1 rounded bg-white h-fit">
        <span className="px-1 p-0 rounded">Add Item</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        style={{ backgroundColor: colors.primary[500], maxHeight:'90vh', oveflowY:'auto', top: '100px' , minWidth: '500px', Padding: '1em 1em',zIndex:100}}
        
      >
        <ScrollArea className='h-full w-full px-4 mt-10 absolute left-2'>

        
            
            <SheetHeader>
              <SheetTitle className="mb-4 text-l" style={{ color: colors.blueAccent[100] }}>
                Create Item
              </SheetTitle>
              <SheetDescription>
                Fill in the details below to add a new item to your inventory.
              </SheetDescription>
            </SheetHeader>

            <div className="relative top-10">
              <CreateItem  />
            </div>
      </ScrollArea>

          
        
      </SheetContent>
    </Sheet>
  );
  };
  
  export default ItemCreateDrawer;
  