import React from "react";
import "./OffCanvasMenu.css"; // Optional: your styles here

const MobileViewMenu = () => {
  return (
    <aside className="site-off">
      <div className="off-canvas desktop-hide">
        <div className="canvas-head flexitem">
          <div className="logo">
            <a href="#">
              <span className="circle"></span> Maa{" "}
              <span className="it-name">Mara</span>{" "}
              <span className="mkrt">Market</span>
            </a>
          </div>
          <button className="t-close" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="departments">
          {/* You can inject department links or categories here */}
        </div>

        <nav>
          {/* Navigation links go here */}
        </nav>

        <div className="thetop-nav">
          {/* Top navigation content */}
        </div>
      </div>
    </aside>
  );
};

export default MobileViewMenu;
