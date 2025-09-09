import { Request, Response } from "express";
import { generateFileName } from "../utils/utils";
import path from "path";
import fs from "fs";

export const downloadVideo = async (req: Request, res: Response) => {
  try {
    const {  user_id, exam_id, category } = req.params;

    if (!user_id || !exam_id) {
      return res.status(400).json({
        error: "Missing required parameters: userId and examId",
      });
    }

    const fileName = generateFileName(user_id, exam_id, category);
    const filePath = path.join(__dirname, "../recordings", `${fileName}.mp4`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "Video file not found",
        fileName: `${fileName}.mp4`,
      });
    }

    // Get file stats for Content-Length header
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;

    // Set appropriate headers for video download
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Length": fileSizeInBytes,
      "Content-Disposition": `attachment; filename="${fileName}.mp4"`,
      "Accept-Ranges": "bytes",
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
  } catch (error) {
    console.error("Download video error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
