import { Box, Toolbar } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { Vendor_info } from "../../data/Vendors_info/Vendors_info";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Header from "../../Header/Header";

const Users = () => {
    const theme = useState();
    const colors = tokens(theme.palette.mode);

    const columns = [{ field: "id", headerName: "ID",}, 
        {
            field: "Name",
            headerName: "Vendor Name",
            flex: .5,
            cellClassName: "name-column--cell",
        },
        {
            field: "RegistrationDate",
            headerName: "Registration Date",
            headerAlign: "left",
            align: "left"
        },
        {
            field: "age",
            headerName: "Age",
            flex: 1,
            
        },
        {
            field: "Phone",
            headerName: "Phone Number",
            flex: 1,

        },
        {
            field: "Email",
            headerName: "Email Addresses",
            flex: 1,
            
        },

        //add address
        {
            field: "address",
            headerName: "Address",
            flex: 1,
            
        },

        {
            field: "city",
            headerName: "City",
            flex: 1,
            
        },
        {
            field: "ZipCode",
            headerName: "ZIP-Code",
            flex: 1,
            
        },
       //access if needed
    ]

    return (
        <Box margin= '1em'>
            <Header title="Users" subtitle='Users Rgistered on site'/>
            <Box
            padding='2em 0 0 0 ' height= '75vh' sx={{
                "& .MuiDataGrid-root":{border:"none" },
                "& .name-column--cell":{color: colors.greenAccent[400] },
                "& .MuiDataGrid-virtualScoller":{backgroundColor: colors.primary [400] },
                "& .MuiDataGrid-columnHeaders":{backgroundColor: colors.primary[100], borderBottom:'none' },
                "& .MuiDataGrid-footerContainer":{borderTop: 'none', backgroundColor: colors.gray [600] },
                "& .MuiDataGrid-cell":{borderBottom:"none" },
                "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
                    color: `${colors.gray[100]} !important`,
                },
            }}>
                <DataGrid 
                    rows={Vendor_info}
                    columns={columns}
                    components= {{ Toolbar: GridToolbar}}
                    />
                </Box>
        </Box>
        
    )
}

export default Users;