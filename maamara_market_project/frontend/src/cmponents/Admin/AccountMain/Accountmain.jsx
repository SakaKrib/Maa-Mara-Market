import React from "react";
import CryptoChart from "../AdminAccounts/Reports/LineGrahReactChart";
import PaymentsOverview from "../AdminAccounts/AdminCards";
import FastPayment from "../AdminAccounts/Reports/PaymentHistory";
import Header from "../../../Header/Header";
import { useTheme, Box } from "@mui/material";
import { tokens } from "../../../theme";
import useDashboardData from "../../Hooks/AccountSummary/AccountSummaryHook";

const AdminAccounts = () => {
    //  color varriables
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { data, loading, error } = useDashboardData();
    console.log("Dashboard API data:", data);


    const monthlySummary = data.monthly_summary || [];

    return(
        <div >
            <Box className="p-4 " sx={{borderBottom:{
                md:'none',
                lg: `1px solid ${colors.tealAccent[500]}`
            }}}>
            <Header title={'Accounts'} />
            </Box>
            <PaymentsOverview/>
            <FastPayment/>
            <CryptoChart  monthlySummary={monthlySummary}/>
            
        </div>
    )
}
export default AdminAccounts;