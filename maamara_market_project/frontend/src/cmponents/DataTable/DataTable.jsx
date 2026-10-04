import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import "./DataTable.css";
import { Pagination, useTheme } from "@mui/material";
import { ItemData } from "../../data/ItemData/ItemData";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import ViewIcon from "@mui/icons-material/ViewModuleOutlined"
import { tokens } from "../../theme";





const DataTable = ({
  rows,
  pageSize = 5,
  checkboxSelection = true,
  height = 500,
  
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode)
  const columns =[
    {
      field: 'id', headerName: 'ID',width: 90
    },
    {
      field: 'image', headerName: 'Item Image', flex: '1',minWidth: 100,
      renderCell: (params) => {
        const imgSrc = params.row.image;
        return (
          <img
            src={imgSrc}
            alt="Product"
            style={{
              width: 50,
              height: 50,
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
        );
      },
    },
    {
      field: 'name', headerName: 'name', flex: '1',minWidth: 200, cellClassName: 'capitalize-text',
    },
    { field: 'description', headerName: 'Item Description', flex: 1, minWidth: 250,  cellClassName: 'capitalize-text',

     },
    {
      field: 'price', headerName: 'Price', flex: '1',minWidth: 200
    },
    {
      field: 'discount', headerName: 'Discount', flex: '1',minWidth: 200
    },
    {
      field: 'SKU', headerName: 'SKU number', flex: '1',minWidth: 200
    },
    {
      field: 'stock', headerName: 'In stock', flex: '1',minWidth: 200
    },
    {
      field: 'actions', headerName: 'Actions',minWidth: 200,
      renderCell: (params) => {
        return <div className="action">
          <div className="view">
            <ViewIcon/>
          </div>
          <div className="edit">
            <EditIcon/>
          </div>
          <div className="delete">
            <DeleteIcon/>
          </div>

        </div>
      }
    },
    
  ]
    return (
      <div className="dataTable" style={{ height: 400, width: "100%" }}
      sx={{
        "& .MuiDataGrid-root": { border: "none" },
        "& .MuiDataGrid-row": {backgroundColor: colors.gray[500]},
        "& .name-column--cell": { color: colors.greenAccent[400] },
        "& .MuiDataGrid-virtualScroller": {
          backgroundColor: colors.primary[400],
        },
        "& .select_row":{opacity:'1'},
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: colors.primary[100],
          borderBottom: "none",
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: "none",
          backgroundColor: colors.gray[600],
        },
        "& .MuiDataGrid-cell": { borderBottom: "none" },
      }}>
        <DataGrid className="DataGrid"
          rows={ItemData}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5 },
            },
          }}
          pageSizeOptions={[5]}
          checkboxSelection = {checkboxSelection}
          disableRowSelectionOnClick
          slots={{
            toolbar: GridToolbar, // 👈 Add this to show the toolbar
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true, // 👈 Enables the search box
              quickFilterProps: { debounceMs: 300 }, // Optional: adds debounce
            },
        }}
        />
      </div>
    );
  };
  
  export default DataTable;