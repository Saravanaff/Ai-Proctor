import { Request, Response } from "express";
import axios from "axios";

export const downloadVideo = async (req: Request, res: Response) => {
  try {
    const { user_id, exam_id, category } = req.params;

    if (!user_id || !exam_id || !category) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: user_id, exam_id, and category",
      });
    }

    // Get storage server URL from environment variables
    const storageServerUrl =
      process.env.STORAGE_SERVER_URL || "http://localhost:3003";
    const downloadUrl = `${storageServerUrl}/download/${user_id}/${exam_id}/${category}`;

    try {
      // Make request to storage server
      const response = await axios({
        method: "GET",
        url: downloadUrl,
        responseType: "stream",
        timeout: 30000, // 30 seconds timeout
      });

      // Forward the headers from storage server
      res.setHeader(
        "Content-Type",
        response.headers["content-type"] || "video/mp4"
      );
      res.setHeader("Content-Length", response.headers["content-length"]);
      res.setHeader(
        "Content-Disposition",
        response.headers["content-disposition"] ||
          `attachment; filename="video_${user_id}_${exam_id}_${category}.mp4"`
      );
      res.setHeader(
        "Accept-Ranges",
        response.headers["accept-ranges"] || "bytes"
      );

      // Pipe the video stream from storage server to client
      response.data.pipe(res);

      // Handle stream errors
      response.data.on("error", (error: any) => {
        console.error("Error streaming video from storage server:", error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Error streaming video file",
          });
        }
      });
    } catch (storageError: any) {
      console.error("Storage server request failed:", storageError.message);

      if (storageError.response?.status === 404) {
        return res.status(404).json({
          success: false,
          message: "Video file not found",
        });
      }

      if (storageError.code === "ECONNREFUSED") {
        return res.status(503).json({
          success: false,
          message: "Storage server is unavailable",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve video from storage server",
      });
    }
  } catch (error) {
    console.error("Download video controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
