import React from 'react';
import { RiCloseLine } from 'react-icons/ri';

const OffCanvasMenu = ({ onClose }) => {
  return (
    <aside className="site-off">
      <div className="off-canvas desktop-hide">
        {/* Header */}
        <div className="canvas-head flexitem">
          <div className="logo">
            <a href="#">
              <span className="circle"></span> Maa <span className="it-name">Mara</span>{' '}
              <span className="mkrt">Market</span>
            </a>
          </div>
          <button
            type="button"
            className="t-close"
            onClick={onClose} // pass a function from parent to close the menu
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Departments container */}
        <div className="departments"></div>

        {/* Navigation */}
        <nav></nav>

        {/* Top navigation wrapper */}
        <div className="thetop-nav"></div>
      </div>
    </aside>
  );
};

export default OffCanvasMenu;
