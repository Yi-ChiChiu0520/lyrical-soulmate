import React from "react"
import LyricalIcon from "../images/LyricalIcon.png";

const Footer = () => {

    return (
        <div className="@container bg-[#3d3547] text-white px-4 py-3 flex items-center justify-end">
            <div className="flex items-center">
                <img src={LyricalIcon} alt="Logo" className="h-4 m-1" />
                <div className="font-bold text-xs text-white mr-4">Let's Get Lyrical</div>
                <div className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Team 28</div>
            </div>
        </div>
    );
};

export default Footer;
