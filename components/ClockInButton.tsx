"use client";

import React, { useState } from "react";
import { CameraCapture, AttendanceResult } from "@/types";

interface ClockInButtonProps {
  onClockIn: (capture: CameraCapture) => Promise<AttendanceResult>;
  onClockOut: (capture: CameraCapture) => Promise<AttendanceResult>;
  isProcessing?: boolean;
  lastStatus?: "CLOCK_IN" | "CLOCK_OUT";
  capturedImage?: string;
  className?: string;
}

export default function ClockInButton({
  onClockIn,
  onClockOut,
  isProcessing = false,
  lastStatus,
  capturedImage,
  className = "",
}: ClockInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);

  const handleClockIn = async (capture: CameraCapture) => {
    setIsLoading(true);
    setResult(null);

    try {
      const result = await onClockIn(capture);
      setResult(result);
    } catch (error) {
      setResult({
        success: false,
        message: `Clock-in failed: ${(error as Error).message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async (capture: CameraCapture) => {
    setIsLoading(true);
    setResult(null);

    try {
      const result = await onClockOut(capture);
      setResult(result);
    } catch (error) {
      setResult({
        success: false,
        message: `Clock-out failed: ${(error as Error).message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading || isProcessing) {
      return "Processing...";
    }

    if (lastStatus === "CLOCK_IN") {
      return "Clock Out";
    }

    return "Clock In";
  };

  const getButtonColor = () => {
    if (isLoading || isProcessing) {
      return "bg-gray-500";
    }

    if (lastStatus === "CLOCK_IN") {
      return "bg-red-600 hover:bg-red-700";
    }

    return "bg-green-600 hover:bg-green-700";
  };

  const handleClick = () => {
    if (!capturedImage) {
      setResult({
        success: false,
        message: "No image captured. Please capture an image first.",
      });
      return;
    }

    const capture: CameraCapture = {
      imageData: capturedImage,
      timestamp: new Date(),
      width: 640, // Default values
      height: 480,
    };

    if (lastStatus === "CLOCK_IN") {
      handleClockOut(capture);
    } else {
      handleClockIn(capture);
    }
  };

  return (
    <div className={`clock-in-button ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleClick}
          disabled={isLoading || isProcessing}
          className={`
            px-8 py-4 text-lg font-semibold text-white rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-2
            transition-all duration-200 transform hover:scale-105
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            ${getButtonColor()}
            ${isLoading || isProcessing ? "animate-pulse" : ""}
          `}
        >
          {getButtonText()}
        </button>

        {result && (
          <div
            className={`
            p-4 rounded-lg border-2 max-w-md w-full text-center
            ${
              result.success
                ? "bg-green-100 border-green-400 text-green-700"
                : "bg-red-100 border-red-400 text-red-700"
            }
          `}
          >
            <div className="flex items-center justify-center space-x-2">
              {result.success ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="font-medium">{result.message}</span>
            </div>

            {result.similarity && (
              <div className="mt-2 text-sm">
                Similarity: {(result.similarity * 100).toFixed(1)}%
              </div>
            )}

            {result.timestamp && (
              <div className="mt-2 text-sm text-gray-600">
                {new Date(result.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span>Processing face recognition...</span>
          </div>
        )}
      </div>
    </div>
  );
}
