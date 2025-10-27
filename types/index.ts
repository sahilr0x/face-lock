/**
 * Type definitions for the Face Clock-In System
 */

export interface User {
  id: string;
  name: string;
  email: string;
  faceEmbedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  status: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: Date;
  user?: User;
}

export interface FaceEmbedding {
  embedding: number[];
  confidence?: number;
}

export interface FaceMatch {
  match: boolean;
  similarity: number;
  threshold: number;
}

export interface AttendanceResult {
  success: boolean;
  message: string;
  userId?: string;
  status?: "CLOCK_IN" | "CLOCK_OUT";
  timestamp?: Date;
  similarity?: number;
}

export interface CameraCapture {
  imageData: string; // base64
  timestamp: Date;
  width: number;
  height: number;
}

export interface AttendanceStats {
  totalClockIns: number;
  totalClockOuts: number;
  lastClockIn?: Date;
  lastClockOut?: Date;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface FaceRecognitionConfig {
  similarityThreshold: number;
  maxRetries: number;
  timeout: number;
}

export interface AttendanceLogFilters {
  userId?: string;
  status?: "CLOCK_IN" | "CLOCK_OUT";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface UserRegistrationData {
  name: string;
  email: string;
  faceImage: string; // base64
}

export interface ClockInData {
  faceImage: string; // base64
  userId?: string; // Optional if we want to specify user
}

export interface AttendanceLogResponse {
  logs: AttendanceLog[];
  total: number;
  hasMore: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CameraError {
  code: string;
  message: string;
  details?: any;
}

export interface FaceDetectionError {
  code:
    | "NO_FACE_DETECTED"
    | "MULTIPLE_FACES"
    | "POOR_QUALITY"
    | "EMBEDDING_FAILED";
  message: string;
  details?: any;
}

export interface AttendanceError {
  code:
    | "USER_NOT_FOUND"
    | "FACE_NOT_MATCHED"
    | "ALREADY_CLOCKED_IN"
    | "ALREADY_CLOCKED_OUT"
    | "DATABASE_ERROR";
  message: string;
  details?: any;
}
