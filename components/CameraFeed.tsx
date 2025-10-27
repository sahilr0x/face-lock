"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { CameraError, CameraCapture } from "@/types";

interface CameraFeedProps {
  onCapture: (capture: CameraCapture) => void;
  onError?: (error: CameraError) => void;
  width?: number;
  height?: number;
  className?: string;
}

export default function CameraFeed({
  onCapture,
  onError,
  width = 640,
  height = 480,
  className = "",
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<CameraError | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        setHasPermission(true);
      }
    } catch (err: unknown) {
      const cameraError: CameraError = {
        code: "CAMERA_ACCESS_DENIED",
        message: "Failed to access camera",
        details: err instanceof Error ? err.message : String(err),
      };
      setError(cameraError);
      onError?.(cameraError);
      setHasPermission(false);
    }
  }, [width, height, onError]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      const cameraError: CameraError = {
        code: "CAPTURE_FAILED",
        message: "Camera or canvas not available",
      };
      setError(cameraError);
      onError?.(cameraError);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      const cameraError: CameraError = {
        code: "CAPTURE_FAILED",
        message: "Canvas context not available",
      };
      setError(cameraError);
      onError?.(cameraError);
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    const base64Data = imageData.split(",")[1];

    const capture: CameraCapture = {
      imageData: base64Data,
      timestamp: new Date(),
      width: canvas.width,
      height: canvas.height,
    };

    onCapture(capture);
  }, [onCapture, onError]);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  return (
    <div className={`camera-feed ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          width={width}
          height={height}
          className="rounded-lg border-2 border-gray-300"
          onLoadedMetadata={handleVideoLoaded}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="hidden"
          width={width}
          height={height}
        />
      </div>

      {hasPermission === false && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Camera Access Denied</p>
          <p className="text-sm">
            Please allow camera access to use face recognition.
          </p>
          <button
            onClick={startCamera}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p className="font-semibold">Camera Error</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {isStreaming && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={captureImage}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Capture Image
          </button>
        </div>
      )}

      {!isStreaming && hasPermission === true && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Start Camera
          </button>
        </div>
      )}
    </div>
  );
}
