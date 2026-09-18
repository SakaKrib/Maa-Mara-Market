import React from "react";

import './InfoBar.css';
import { tokens } from "../../../../../src/theme";

import closeIcon from '../../icons/closeIcon.png';
import onlineIcon from '../../icons/onlineIcon.png';
import { useTheme } from "@mui/material";

const InfoBar = ({ roomName }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode) 
    return(
    <div className="infoBar" style={{backgroundColor:colors.gray[900]}}>
        <div className="leftInnerContainer">
            <img src={onlineIcon} alt="online icon" className="onlineIcon" />
            <h3>{roomName}</h3>
        </div>
        <div className="rightInnerContainer">
            <a href="/"><img src={closeIcon} alt="close icon" /></a>
        </div>
    </div>
    );
};

export default InfoBar;
