import { Request, Response } from "express";
import { generateFileName } from "../utils/utils";
import path from "path";
import fs from "fs";

export const streamVideo = async (req: Request, res: Response) => {
  try {
    const { user_id, exam_id, category } = req.params;

    if (!user_id || !exam_id) {
      return res.status(400).json({
        error: "Missing required parameters: userId and examId",
      });
    }

    const fileName = generateFileName(user_id, exam_id, category);

    // Try different video formats
    const possibleExtensions = ["mp4", "webm", "mkv", "avi"];
    let filePath: string = "";
    let contentType: string = "";

    for (const ext of possibleExtensions) {
      const testPath = path.join(
        __dirname,
        "../recordings",
        `${fileName}.${ext}`
      );
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        // Set proper MIME types with codec information
        switch (ext) {
          case "mp4":
            contentType = "video/mp4; codecs=avc1.64001e";
            break;
          case "webm":
            contentType = "video/webm; codecs=vp8,vorbis";
            break;
          case "mkv":
            contentType = "video/x-matroska";
            break;
          case "avi":
            contentType = "video/x-msvideo";
            break;
          default:
            contentType = "video/mp4";
        }
        break;
      }
    }

    // If no file found with any extension, return 404
    if (!filePath) {
      return res.status(404).json({
        error: "Video file not found",
        fileName: `${fileName}.*`,
        searchedExtensions: possibleExtensions,
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;

    // Handle range requests for video seeking
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0] || "0", 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSizeInBytes - 1;
      const chunksize = end - start + 1;

      // Set partial content headers
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSizeInBytes}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type, Authorization",
        "Access-Control-Expose-Headers":
          "Content-Range, Content-Length, Accept-Ranges",
      });

      // Create read stream with range
      const readStream = fs.createReadStream(filePath, { start, end });
      readStream.pipe(res);

      readStream.on("error", (error) => {
        console.error("Error streaming video range:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming video file" });
        }
      });
    } else {
      // No range header, stream entire file
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileSizeInBytes,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type, Authorization",
        "Access-Control-Expose-Headers":
          "Content-Range, Content-Length, Accept-Ranges",
      });

      // Create read stream and pipe to response
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);

      readStream.on("error", (error) => {
        console.error("Error streaming video:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming video file" });
        }
      });
    }
  } catch (error) {
    console.error("Stream video error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

export const downloadVideo = async (req: Request, res: Response) => {
  try {
    const { user_id, exam_id, category } = req.params;

    if (!user_id || !exam_id) {
      return res.status(400).json({
        error: "Missing required parameters: userId and examId",
      });
    }

    const fileName = generateFileName(user_id, exam_id, category);

    // Try different video formats
    const possibleExtensions = ["webm", "mp4", "mkv", "avi"];
    let filePath: string = "";
    let contentType: string = "";
    let fileExtension: string = "";

    for (const ext of possibleExtensions) {
      const testPath = path.join(
        __dirname,
        "../recordings",
        `${fileName}.${ext}`
      );
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        fileExtension = ext;
        contentType = `video/${
          ext === "webm" ? "webm" : ext === "mp4" ? "mp4" : "mp4"
        }`; // Default to mp4 for unknown
        break;
      }
    }

    // If no file found with any extension, return 404
    if (!filePath) {
      return res.status(404).json({
        error: "Video file not found",
        fileName: `${fileName}.*`,
        searchedExtensions: possibleExtensions,
      });
    }

    // Get file stats for Content-Length header
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;

    // Set appropriate headers for video download
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": fileSizeInBytes,
      "Content-Disposition": `attachment; filename="${fileName}.${fileExtension}"`,
      "Accept-Ranges": "bytes",
    });

    // Create read stream and pipe to response
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);

    readStream.on("error", (error) => {
      console.error("Error streaming video:", error);
      if (!res.headersSent) {
        console.log("Error streaming video file");
        res.status(500).json({ error: "Error streaming video file" });
      }
    });
  } catch (error) {
    console.error("Download video error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
