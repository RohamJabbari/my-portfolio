"use client";
import React, { useEffect, useState } from 'react';

interface CopyAnimationProps {
  copied: boolean;
}

const CopyAnimation: React.FC<CopyAnimationProps> = ({ copied }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (copied) {
      setVisible(true);
      timeout = setTimeout(() => {
        setVisible(false);
      }, 1500);
    } else {
      setVisible(false);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [copied]);

  return (
    <div
      className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 transition-all duration-300 ease-in-out 
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      aria-live="polite"
    >
      <div className="inline-flex items-center space-x-2 bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        <span>Copied!</span>
      </div>
    </div>
  );
};

export default CopyAnimation;
