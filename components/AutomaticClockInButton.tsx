"use client";

import React from "react";
import { CameraCapture, AttendanceResult } from "@/types";

interface AutomaticClockInButtonProps {
  onClockIn: (capture: CameraCapture) => Promise<AttendanceResult>;
  onClockOut: (capture: CameraCapture) => Promise<AttendanceResult>;
  isProcessing: boolean;
  lastStatus?: "CLOCK_IN" | "CLOCK_OUT";
  capturedImage?: string;
  className?: string;
}

export default function AutomaticClockInButton({
  onClockIn,
  onClockOut,
  isProcessing,
  lastStatus,
  capturedImage,
  className = "",
}: AutomaticClockInButtonProps) {
  const handleClick = async () => {
    if (!capturedImage) {
      return;
    }

    const capture: CameraCapture = {
      imageData: capturedImage,
      timestamp: new Date(),
      width: 640,
      height: 480,
    };

    // Try automatic face recognition
    if (lastStatus === "CLOCK_IN") {
      await onClockOut(capture);
    } else {
      await onClockIn(capture);
    }
  };

  const getButtonText = () => {
    if (isProcessing) {
      return "Processing...";
    }
    if (lastStatus === "CLOCK_IN") {
      return "Clock Out";
    }
    return "Clock In";
  };

  const getButtonColor = () => {
    if (isProcessing) {
      return "bg-gray-500";
    }
    if (lastStatus === "CLOCK_IN") {
      return "bg-red-600 hover:bg-red-700";
    }
    return "bg-green-600 hover:bg-green-700";
  };

  return (
    <div className={`automatic-clock-in-button ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className={`
            px-8 py-4 text-lg font-semibold text-white rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-2
            transition-all duration-200 transform hover:scale-105
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            ${getButtonColor()}
            ${isProcessing ? "animate-pulse" : ""}
          `}
        >
          {getButtonText()}
        </button>

        {isProcessing && (
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span>Processing face recognition...</span>
          </div>
        )}
      </div>
    </div>
  );
}

