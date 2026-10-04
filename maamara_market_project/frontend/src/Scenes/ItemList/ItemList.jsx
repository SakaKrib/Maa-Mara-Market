import { Typography } from "@mui/material";
import DataTable from "../../cmponents/DataTable/DataTable";
import "./ItemList.css"

const Items = ( ) => {
    return (
        <div className="itemList">
            <div className="Info">
                <Typography variant="h4"fontWeight={600}>
                    Item List
                </Typography>
            </div>
            <DataTable/>
        </div>
    )
}

export default Items;