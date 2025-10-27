"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import CameraFeed from "@/components/CameraFeed";
import AutomaticClockInButton from "@/components/AutomaticClockInButton";
import ResultCard from "@/components/ResultCard";
import { CameraCapture, AttendanceResult } from "@/types";

export default function ClockInPage() {
  const router = useRouter();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [lastStatus, setLastStatus] = useState<
    "CLOCK_IN" | "CLOCK_OUT" | undefined
  >(undefined);

  const handleCapture = (capture: CameraCapture) => {
    setCapturedImage(capture.imageData);
  };

  const handleClockIn = async (
    capture: CameraCapture
  ): Promise<AttendanceResult> => {
    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/clockin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          faceImage: capture.imageData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result: AttendanceResult = {
          success: true,
          message: data.message,
          userId: data.data.userId,
          status: data.data.status,
          timestamp: new Date(data.data.timestamp),
          similarity: data.data.similarity,
        };

        setLastStatus(data.data.status);
        setResult(result);
        return result;
      } else {
        const result: AttendanceResult = {
          success: false,
          message: data.error || "Clock-in failed",
        };
        setResult(result);
        return result;
      }
    } catch (error) {
      const result: AttendanceResult = {
        success: false,
        message: `Clock-in failed: ${(error as Error).message}`,
      };
      setResult(result);
      return result;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async (
    capture: CameraCapture
  ): Promise<AttendanceResult> => {
    // Clock-out is handled the same way as clock-in
    // The API determines the action based on the last status
    return handleClockIn(capture);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Face Clock-In System
            </h1>
            <p className="text-gray-600">
              Position your face in front of the camera and click the button to
              clock in/out
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Face Recognition
              </h2>
              <CameraFeed
                onCapture={handleCapture}
                width={400}
                height={300}
                className="mb-4"
              />

              {capturedImage && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  <div className="flex items-center space-x-2">
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
                    <span className="font-medium">
                      Image captured successfully!
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Clock-In Section */}
            <div className="flex flex-col justify-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Attendance Action
              </h2>

              <div className="text-center">
                {capturedImage ? (
                  <AutomaticClockInButton
                    onClockIn={handleClockIn}
                    onClockOut={handleClockOut}
                    isProcessing={isProcessing}
                    lastStatus={lastStatus}
                    capturedImage={capturedImage}
                    className="mb-6"
                  />
                ) : (
                  <div className="p-6 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium">
                        Please capture an image first
                      </span>
                    </div>
                  </div>
                )}

                {lastStatus && (
                  <div className="mt-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
                    <div className="flex items-center justify-center space-x-2">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium">
                        Last action:{" "}
                        {lastStatus === "CLOCK_IN"
                          ? "Clocked In"
                          : "Clocked Out"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result Display */}
          {result && (
            <div className="mt-8">
              <ResultCard result={result} />
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to Home
              </button>
              <button
                onClick={() => router.push("/logs")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Attendance Logs →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
