"use client";

import React from "react";
import { AttendanceResult } from "@/types";

interface ResultCardProps {
  result: AttendanceResult;
  onClose?: () => void;
  className?: string;
}

export default function ResultCard({
  result,
  onClose,
  className = "",
}: ResultCardProps) {
  const getStatusIcon = () => {
    if (result.success) {
      return (
        <div className="shrink-0">
          <svg
            className="w-8 h-8 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="shrink-0">
          <svg
            className="w-8 h-8 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }
  };

  const getStatusColor = () => {
    if (result.success) {
      return "bg-green-50 border-green-200";
    } else {
      return "bg-red-50 border-red-200";
    }
  };

  const getStatusText = () => {
    if (result.success) {
      return result.status === "CLOCK_IN"
        ? "Successfully Clocked In"
        : "Successfully Clocked Out";
    } else {
      return "Operation Failed";
    }
  };

  return (
    <div className={`result-card ${className}`}>
      <div
        className={`
        max-w-md mx-auto p-6 rounded-lg border-2 shadow-lg
        ${getStatusColor()}
        animate-in slide-in-from-top-2 duration-300
      `}
      >
        <div className="flex items-start space-x-4">
          {getStatusIcon()}

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {getStatusText()}
            </h3>

            <p className="text-sm text-gray-600 mb-4">{result.message}</p>

            {result.similarity && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Face Similarity:</span>
                  <span className="font-medium">
                    {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      result.similarity >= 0.8
                        ? "bg-green-500"
                        : result.similarity >= 0.6
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${result.similarity * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {result.timestamp && (
              <div className="text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{new Date(result.timestamp).toLocaleString()}</span>
                </div>
              </div>
            )}

            {result.userId && (
              <div className="text-sm text-gray-500">
                <span className="font-medium">User ID:</span> {result.userId}
              </div>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {result.success && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">Attendance Recorded</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
