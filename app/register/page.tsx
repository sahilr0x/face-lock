"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import CameraFeed from "@/components/CameraFeed";
import ResultCard from "@/components/ResultCard";
import { CameraCapture, AttendanceResult, UserRegistrationData } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCapture = (capture: CameraCapture) => {
    setCapturedImage(capture.imageData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!capturedImage) {
      alert("Please capture an image first");
      return;
    }

    if (!formData.name || !formData.email) {
      alert("Please fill in all fields");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const registrationData: UserRegistrationData = {
        name: formData.name,
        email: formData.email,
        faceImage: capturedImage,
      };

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: "User registered successfully!",
          userId: data.data.id,
        });

        // Reset form after successful registration
        setTimeout(() => {
          setFormData({ name: "", email: "" });
          setCapturedImage(null);
          setResult(null);
        }, 3000);
      } else {
        setResult({
          success: false,
          message: data.error || "Registration failed",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Registration failed: ${(error as Error).message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Register Your Face
            </h1>
            <p className="text-gray-600">
              Capture your face and provide your details to register for the
              clock-in system
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Face Capture
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

            {/* Form Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Personal Information
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={!capturedImage || isProcessing}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? "Registering..." : "Register User"}
                  </button>
                </div>
              </form>
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
                onClick={() => router.push("/clockin")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Go to Clock-In →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
