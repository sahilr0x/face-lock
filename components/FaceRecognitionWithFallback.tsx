"use client";

import React, { useState, useEffect } from "react";
import { CameraCapture, AttendanceResult } from "@/types";

interface User {
  id: string;
  name: string;
  email: string;
}

interface FaceRecognitionWithFallbackProps {
  onClockIn: (
    capture: CameraCapture,
    userId?: string
  ) => Promise<AttendanceResult>;
  onClockOut: (
    capture: CameraCapture,
    userId?: string
  ) => Promise<AttendanceResult>;
  isProcessing: boolean;
  lastStatus?: "CLOCK_IN" | "CLOCK_OUT";
  capturedImage?: string;
  className?: string;
}

export default function FaceRecognitionWithFallback({
  onClockIn,
  onClockOut,
  isProcessing,
  lastStatus,
  capturedImage,
  className = "",
}: FaceRecognitionWithFallbackProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (showUserSelection) {
      fetchUsers();
    }
  }, [showUserSelection]);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch("/api/users");
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleClockIn = async (capture: CameraCapture, userId?: string) => {
    if (userId) {
      return await onClockIn(capture, userId);
    } else {
      return await onClockIn(capture);
    }
  };

  const handleClockOut = async (capture: CameraCapture, userId?: string) => {
    if (userId) {
      return await onClockOut(capture, userId);
    } else {
      return await onClockOut(capture);
    }
  };

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

    try {
      // Try automatic face recognition first
      let result;
      if (lastStatus === "CLOCK_IN") {
        result = await handleClockOut(capture);
      } else {
        result = await handleClockIn(capture);
      }

      // Check if the result indicates failure
      if (
        !result.success &&
        result.message.includes("No matching user found")
      ) {
        console.log("Automatic recognition failed, showing user selection");
        setShowUserSelection(true);
      }
    } catch (error) {
      // If automatic recognition fails, show user selection
      console.log("Automatic recognition failed, showing user selection");
      setShowUserSelection(true);
    }
  };

  const handleUserSelection = async (userId: string) => {
    if (!capturedImage) return;

    const capture: CameraCapture = {
      imageData: capturedImage,
      timestamp: new Date(),
      width: 640,
      height: 480,
    };

    try {
      if (lastStatus === "CLOCK_IN") {
        await handleClockOut(capture, userId);
      } else {
        await handleClockIn(capture, userId);
      }
      setShowUserSelection(false);
      setSelectedUserId(null);
    } catch (error) {
      console.error("Error with user selection:", error);
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

  if (showUserSelection) {
    return (
      <div className={`face-recognition-fallback ${className}`}>
        <div className="space-y-4">
          <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="font-semibold">Face recognition failed</p>
            <p className="text-sm">Please select your user account:</p>
          </div>

          {isLoadingUsers ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelection(user.id)}
                  className="w-full p-3 text-left rounded-lg border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={() => setShowUserSelection(false)}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded"
            >
              ← Back to automatic recognition
            </button>
            <button
              onClick={() => {
                // Try automatic recognition again
                const capture: CameraCapture = {
                  imageData: capturedImage!,
                  timestamp: new Date(),
                  width: 640,
                  height: 480,
                };
                if (lastStatus === "CLOCK_IN") {
                  handleClockOut(capture);
                } else {
                  handleClockIn(capture);
                }
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try Automatic Recognition
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`face-recognition-fallback ${className}`}>
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
