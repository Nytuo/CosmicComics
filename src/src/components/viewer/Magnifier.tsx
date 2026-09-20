import React, { useState } from 'react';
import '@/css/base.css';

interface MagnifierProps {
  zoomFactor: number;
  children: React.ReactNode;
}

const Magnifier: React.FC<MagnifierProps> = ({ zoomFactor, children }) => {
  const [isMagnified, setIsMagnified] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsMagnified(true);
  };

  const handleMouseLeave = () => {
    setIsMagnified(false);
  };

  const transformValue = isMagnified
    ? `translate(${-position.x * (zoomFactor - 1)}px, ${
        -position.y * (zoomFactor - 1)
      }px) scale(${zoomFactor})`
    : 'scale(1)';

  return (
    <div
      className="magnifier-container"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="magnifier-content" style={{ transform: transformValue }}>
        {children}
      </div>
    </div>
  );
};

export default Magnifier;
