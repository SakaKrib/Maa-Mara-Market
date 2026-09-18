import "./ChartBox.css";
import VendorPie from "./PieChart2";

const Pie2 = () =>  {
    return(
        <div className="pie-chart">
            <h1>Sale for Jan-Jun</h1>
            <div className="chart">
                <VendorPie/>
            </div>
        </div>
)
}

export default Pie2;