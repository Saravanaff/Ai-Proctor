import { Request, Response } from "express";
import axios from "axios";
import https from "https";

export const streamVideo = async (req: Request, res: Response) => {
  try {
    const { user_id, exam_id, category } = req.params;

    console.log(
      `Video stream request: user_id=${user_id}, exam_id=${exam_id}, category=${category}`
    );
    console.log(`Request headers:`, req.headers);
    console.log(`Request query:`, req.query);

    if (!user_id || !exam_id || !category) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: user_id, exam_id, and category",
      });
    }

    // Get storage server URL from environment variables
    const storageServerUrl =
      process.env.STORAGE_SERVER_URL || "https://localhost:3003";
    const streamUrl = `${storageServerUrl}/stream/${user_id}/${exam_id}/${category}`;

    try {
      // Handle range requests for video seeking
      const rangeHeader = req.headers.range;

      // Make request to storage server with range header if present
      const response = await axios({
        method: "GET",
        url: streamUrl,
        responseType: "stream",
        timeout: 30000, // 30 seconds timeout
        headers: rangeHeader ? { Range: rangeHeader } : {},
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // for development, should be removed in production
        }),
      });

      // Forward the headers from storage server
      const contentType = response.headers["content-type"];
      // Clean up content type - remove any problematic codec specifications
      let cleanContentType = contentType || "video/mp4";

      // If the content type has codec specification that might be problematic, simplify it
      if (cleanContentType.includes("codecs=")) {
        if (cleanContentType.includes("video/mp4")) {
          cleanContentType = "video/mp4";
        } else if (cleanContentType.includes("video/webm")) {
          cleanContentType = "video/webm";
        }
      }

      res.setHeader("Content-Type", cleanContentType);

      // Handle range responses for video seeking
      if (response.status === 206) {
        res.status(206);
        res.setHeader("Content-Range", response.headers["content-range"]);
        res.setHeader("Content-Length", response.headers["content-length"]);
      } else {
        res.setHeader("Content-Length", response.headers["content-length"]);
      }

      res.setHeader(
        "Accept-Ranges",
        response.headers["accept-ranges"] || "bytes"
      );
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Range, Content-Type, Authorization"
      );
      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Range, Content-Length, Accept-Ranges"
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
          detail:
            "The requested video may not have been recorded for this exam session",
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
        detail: storageError.message,
      });
    }
  } catch (error) {
    console.error("Stream video controller error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

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
      process.env.STORAGE_SERVER_URL || "https://localhost:3003";
    const downloadUrl = `${storageServerUrl}/download/${user_id}/${exam_id}/${category}`;

    try {
      // Make request to storage server
      const response = await axios({
        method: "GET",
        url: downloadUrl,
        responseType: "stream",
        timeout: 30000, // 30 seconds timeout
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // for development should be removed in production
        }),
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
        err: storageError,
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
