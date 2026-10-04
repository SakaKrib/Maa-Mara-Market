import React, { useEffect, useRef, useState } from "react";

const SNAP_POINTS = { MID: 60, FULL: 20 };

const MobileBottomSheet = ({ open, onClose, children, title }) => {
  const startY = useRef(0);
  const lastY = useRef(0);
  const startTime = useRef(0);
  const [translateY, setTranslateY] = useState(SNAP_POINTS.FULL);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const preventScroll = (event) => event.preventDefault();
    document.body.style.overflow = "hidden";
    document.addEventListener("touchmove", preventScroll, { passive: false });
    setTranslateY(SNAP_POINTS.FULL);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [open]);

  const handleTouchStart = (event) => {
    const y = event.touches[0].clientY;
    startY.current = y;
    lastY.current = y;
    startTime.current = Date.now();
    setDragging(true);
  };

  const handleTouchMove = (event) => {
    if (!dragging) return;
    event.preventDefault();
    const currentY = event.touches[0].clientY;
    const diff = currentY - startY.current;
    lastY.current = currentY;
    if (diff > 0) setTranslateY(diff);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    const elapsed = Date.now() - startTime.current;
    const distance = lastY.current - startY.current;
    if (distance > 150 && elapsed < 250) {
      onClose?.();
      return;
    }
    if (translateY > 140) onClose?.();
    else if (translateY > 80) setTranslateY(SNAP_POINTS.MID);
    else setTranslateY(SNAP_POINTS.FULL);
  };

  if (!open) return null;

  return (
    <div className="mm-mobile-sheet-layer">
      <button type="button" className="mm-mobile-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="mm-mobile-sheet-wrap">
        <div
          className="mm-mobile-sheet"
          style={{
            transform: `translateY(${translateY}px)`,
            transition: dragging ? "none" : "transform .35s cubic-bezier(.22,1,.36,1)",
          }}
        >
          <div
            className="mm-mobile-sheet-handle"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <span />
          </div>
          {title && <div className="mm-mobile-sheet-title">{title}</div>}
          <div className="mm-mobile-sheet-content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default MobileBottomSheet;