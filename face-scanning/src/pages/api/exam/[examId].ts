// pages/api/exam/[examId].ts
import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { examId } = req.query;
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Forward the request to your backend using axios
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const response = await axios.get(`${backendUrl}/api/exam/${examId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching exam details:", error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || "Internal server error";
      return res.status(status).json({ message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
}
