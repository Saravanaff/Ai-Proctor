import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

const STORAGE_RECORDINGS_PATH = path.join(
  __dirname,
  "..", 
  "..", 
  "storage", 
  "src", 
  "recordings"
);

const CONVERTED_VIDEOS_PATH = path.join(
  __dirname,
  "..", 
  "..", 
  "storage", 
  "src", 
  "converted"
);

if (!fs.existsSync(CONVERTED_VIDEOS_PATH)) {
  fs.mkdirSync(CONVERTED_VIDEOS_PATH, { recursive: true });
}

const findVideoFile = (baseFileName: string, directory: string): string | null => {
  const supportedExtensions = ['.webm', '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4v', '.mpeg', '.mpg'];
  
  for (const ext of supportedExtensions) {
    const filePath = path.join(directory, baseFileName + ext);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  
  return null;
};

const getFileExtension = (filePath: string): string => {
  return path.extname(filePath).toLowerCase();
};

const convertToMP4 = (inputPath: string, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(outputPath)) {
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      
      if (outputStats.mtime > inputStats.mtime) {
        console.log(`MP4 already exists and is up to date: ${outputPath}`);
        return resolve();
      }
    }

    const inputExt = getFileExtension(inputPath);
    console.log(`🔄 Converting ${inputExt} to MP4: ${path.basename(inputPath)}`);

    const ffmpeg = spawn("ffmpeg", [
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y",
      outputPath
    ]);

    ffmpeg.stderr.on("data", (data) => {
      const output = data.toString();
      if (output.includes("time=")) {
        process.stdout.write(`\r${output.trim()}`);
      }
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log(`\nConversion complete: ${path.basename(outputPath)}`);
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
};

export const getCandidateVideos = async (req: Request, res: Response) => {
  try {
    const { user_id, exam_id } = req.params;

    if (!user_id || !exam_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and exam_id are required",
      });
    }

    const faceCameraBaseName = `${user_id}_${exam_id}_face_camera`;
    const screenRecordingBaseName = `${user_id}_${exam_id}_screen_recording`;
    const thirdEyeBaseName = `${user_id}_${exam_id}_third_eye`;

    const faceCameraPath = findVideoFile(faceCameraBaseName, STORAGE_RECORDINGS_PATH);
    const screenRecordingPath = findVideoFile(screenRecordingBaseName, STORAGE_RECORDINGS_PATH);
    const thirdEyePath = findVideoFile(thirdEyeBaseName, STORAGE_RECORDINGS_PATH);

    const faceCameraExists = faceCameraPath !== null;
    const screenRecordingExists = screenRecordingPath !== null;
    const thirdEyeExists = thirdEyePath !== null;

    let faceCameraStats = null;
    let screenRecordingStats = null;
    let thirdEyeStats = null;
    let faceCameraFileName = null;
    let screenRecordingFileName = null;
    let thirdEyeFileName = null;

    if (faceCameraExists && faceCameraPath) {
      faceCameraStats = fs.statSync(faceCameraPath);
      faceCameraFileName = path.basename(faceCameraPath);
    }

    if (screenRecordingExists && screenRecordingPath) {
      screenRecordingStats = fs.statSync(screenRecordingPath);
      screenRecordingFileName = path.basename(screenRecordingPath);
    }

    if (thirdEyeExists && thirdEyePath) {
      thirdEyeStats = fs.statSync(thirdEyePath);
      thirdEyeFileName = path.basename(thirdEyePath);
    }

    return res.status(200).json({
      success: true,
      data: {
        user_id,
        exam_id,
        face_camera: {
          available: faceCameraExists,
          fileName: faceCameraFileName,
          mp4_fileName: `${faceCameraBaseName}.mp4`,
          size: faceCameraStats ? faceCameraStats.size : 0,
          created_at: faceCameraStats ? faceCameraStats.birthtime : null,
          stream_url: faceCameraExists 
            ? `/api/video/stream/${user_id}/${exam_id}/face_camera` 
            : null,
          download_url: faceCameraExists 
            ? `/api/video/download/${user_id}/${exam_id}/face_camera` 
            : null,
        },
        screen_recording: {
          available: screenRecordingExists,
          fileName: screenRecordingFileName,
          mp4_fileName: `${screenRecordingBaseName}.mp4`,
          size: screenRecordingStats ? screenRecordingStats.size : 0,
          created_at: screenRecordingStats ? screenRecordingStats.birthtime : null,
          stream_url: screenRecordingExists 
            ? `/api/video/stream/${user_id}/${exam_id}/screen_recording` 
            : null,
          download_url: screenRecordingExists 
            ? `/api/video/download/${user_id}/${exam_id}/screen_recording` 
            : null,
        },
        third_eye: {
          available: thirdEyeExists,
          fileName: thirdEyeFileName,
          mp4_fileName: `${thirdEyeBaseName}.mp4`,
          size: thirdEyeStats ? thirdEyeStats.size : 0,
          created_at: thirdEyeStats ? thirdEyeStats.birthtime : null,
          stream_url: thirdEyeExists 
            ? `/api/video/stream/${user_id}/${exam_id}/third_eye` 
            : null,
          download_url: thirdEyeExists 
            ? `/api/video/download/${user_id}/${exam_id}/third_eye` 
            : null,
        },
      },
    });
  } catch (error: any) {
    console.error("Error getting candidate videos:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving videos",
      error: error.message,
    });
  }
};

export const streamVideo = async (req: Request, res: Response) => {
  try {
    const { user_id, exam_id, category } = req.params;

    if (!user_id || !exam_id || !category) {
      return res.status(400).json({
        success: false,
        message: "user_id, exam_id, and category are required",
      });
    }

    if (category !== "face_camera" && category !== "screen_recording" && category !== "third_eye") {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Must be 'face_camera', 'screen_recording', or 'third_eye'",
      });
    }

    const baseFileName = `${user_id}_${exam_id}_${category}`;
    const videoPath = findVideoFile(baseFileName, STORAGE_RECORDINGS_PATH);
    console.log(`Looking for video: ${baseFileName} -> ${videoPath || 'NOT FOUND'}`);

    if (!videoPath) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // ✅ Determine the correct MIME type based on file extension
    const fileExt = getFileExtension(videoPath);
    let contentType = "video/webm";
    
    if (fileExt === ".mp4" || fileExt === ".m4v") {
      contentType = "video/mp4";
    } else if (fileExt === ".webm") {
      contentType = "video/webm";
    } else if (fileExt === ".avi") {
      contentType = "video/x-msvideo";
    } else if (fileExt === ".mov") {
      contentType = "video/quicktime";
    } else if (fileExt === ".mkv") {
      contentType = "video/x-matroska";
    }

    console.log(`📹 Streaming video: ${path.basename(videoPath)} (${contentType})`);

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
      });

      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      });

      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error: any) {
    console.error("Error streaming video:", error);
    return res.status(500).json({
      success: false,
      message: "Error streaming video",
      error: error.message,
    });
  }
};

export const downloadVideo = async (req: Request, res: Response) => {
  try {
    const { user_id, exam_id, category } = req.params;

    if (!user_id || !exam_id || !category) {
      return res.status(400).json({
        success: false,
        message: "user_id, exam_id, and category are required",
      });
    }

    if (category !== "face_camera" && category !== "screen_recording" && category !== "third_eye") {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Must be 'face_camera', 'screen_recording', or 'third_eye'",
      });
    }

    const baseFileName = `${user_id}_${exam_id}_${category}`;
    const videoPath = findVideoFile(baseFileName, STORAGE_RECORDINGS_PATH);

    if (!videoPath) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // ✅ Determine the correct MIME type and filename based on file extension
    const fileExt = getFileExtension(videoPath);
    const fileName = path.basename(videoPath);
    let contentType = "video/webm";
    
    if (fileExt === ".mp4" || fileExt === ".m4v") {
      contentType = "video/mp4";
    } else if (fileExt === ".webm") {
      contentType = "video/webm";
    } else if (fileExt === ".avi") {
      contentType = "video/x-msvideo";
    } else if (fileExt === ".mov") {
      contentType = "video/quicktime";
    } else if (fileExt === ".mkv") {
      contentType = "video/x-matroska";
    }

    console.log(`📥 Downloading video: ${fileName} (${contentType})`);

    const stat = fs.statSync(videoPath);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stream = fs.createReadStream(videoPath);
    stream.pipe(res);

    stream.on("error", (error) => {
      console.error("Error reading video file:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error downloading video",
        });
      }
    });
  } catch (error: any) {
    console.error("Error downloading video:", error);
    return res.status(500).json({
      success: false,
      message: "Error downloading video",
      error: error.message,
    });
  }
};

export const getExamVideos = async (req: Request, res: Response) => {
  try {
    const { exam_id } = req.params;

    if (!exam_id) {
      return res.status(400).json({
        success: false,
        message: "exam_id is required",
      });
    }

    if (!fs.existsSync(STORAGE_RECORDINGS_PATH)) {
      return res.status(200).json({
        success: true,
        data: {
          exam_id,
          videos: [],
          message: "No recordings found",
        },
      });
    }

    const files = fs.readdirSync(STORAGE_RECORDINGS_PATH);

    const videoExtensions = '(webm|mp4|avi|mov|mkv|flv|wmv|m4v|mpeg|mpg)';
    const examVideos = files
      .filter((file) => {
        const pattern = new RegExp(`^\\d+_${exam_id}_(face_camera|screen_recording)\\.${videoExtensions}$`, 'i');
        return pattern.test(file);
      })
      .map((file) => {
        const filePath = path.join(STORAGE_RECORDINGS_PATH, file);
        const stats = fs.statSync(filePath);
        const fileExt = getFileExtension(file);
        const baseName = file.replace(fileExt, '');
        const parts = baseName.split("_");
        const user_id = parts[0];
        const category = parts.slice(2).join("_");

        return {
          user_id,
          exam_id,
          category,
          fileName: file,
          fileFormat: fileExt.replace('.', '').toLowerCase(),
          mp4_fileName: `${baseName}.mp4`,
          size: stats.size,
          created_at: stats.birthtime,
          stream_url: `/api/video/stream/${user_id}/${exam_id}/${category}`,
          download_url: `/api/video/download/${user_id}/${exam_id}/${category}`,
        };
      });

    const groupedByUser: any = {};
    examVideos.forEach((video) => {
      if (!groupedByUser[video.user_id]) {
        groupedByUser[video.user_id] = {
          user_id: video.user_id,
          exam_id: video.exam_id,
          face_camera: null,
          screen_recording: null,
        };
      }
      groupedByUser[video.user_id][video.category] = video;
    });

    return res.status(200).json({
      success: true,
      data: {
        exam_id,
        total_candidates: Object.keys(groupedByUser).length,
        total_videos: examVideos.length,
        candidates: Object.values(groupedByUser),
      },
    });
  } catch (error: any) {
    console.error("Error getting exam videos:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving exam videos",
      error: error.message,
    });
  }
};
