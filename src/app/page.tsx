"use client";

import { useEffect, useRef, useState } from "react";
import ResumeBody from "@/app/components/ResumeBody";
import GracefullNodeNetwork from "@/app/components/GracefullNodeNetwork";
import { downloadHardcodedResumePdf } from "@/app/utilities/DownloadPdf";
import resume from "@/app/data/resume.json";

export default function Page() {
  const [showGraceful, setShowGraceful] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false); // < 920px
  const prevShowGraceful = useRef(false);
  const prevIsNarrow = useRef<null | boolean>(null);

  useEffect(() => {
    const update = () => {
      const narrow = window.innerWidth < 920;
      setIsNarrow(narrow);
      if (prevIsNarrow.current === null) {
        // first run
        if (narrow) {
          prevShowGraceful.current = showGraceful;
          setShowGraceful(true);
        }
      } else if (prevIsNarrow.current !== narrow) {
        if (narrow) {
          prevShowGraceful.current = showGraceful;
          setShowGraceful(true);
        } else {
          setShowGraceful(prevShowGraceful.current);
        }
      }
      prevIsNarrow.current = narrow;
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [showGraceful]);

  return (
    <div className="relative min-h-screen bg-gray-900 overflow-hidden px-0 max-[920px]:px-2.5 fixed inset-0 flex flex-col">
      {showGraceful && (
        <div className="fixed inset-0 z-10">
          <GracefullNodeNetwork />
        </div>
      )}
      {!isNarrow && (
        <div className="absolute top-4 right-4 z-30 flex flex-col items-center space-y-2">
          <button
            className="p-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            onClick={() => setShowGraceful(!showGraceful)}
            aria-label="Toggle gracefulNodes"
          >
            {/* network icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="19" cy="19" r="2" />
              <line x1="7" y1="12" x2="17" y2="6" />
              <line x1="7" y1="12" x2="17" y2="18" />
            </svg>
          </button>
          <button
            className="p-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            onClick={() => downloadHardcodedResumePdf({ filename: resume.filename, background: "hsl(0,0%,95%)", paddingPx: 16 })}
            aria-label="Download PDF"
          >
            {/* pdf/download icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 9l5 5 5-5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v10" />
            </svg>
          </button>
        </div>
      )}
      <div className="bg-[hsl(0,0%,95%)] shadow-none rounded-lg p-0 max-w-3xl w-full mx-auto mt-8 mb-8 relative z-20 overflow-y-auto max-h-[calc(100vh-4rem)]">
        <ResumeBody />
      </div>
    </div>
  );
}
