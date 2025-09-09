import { Router } from "express";
import { downloadVideo } from "../controllers/downloadController";


const router = Router();

router.get("download/:userId/:examId",downloadVideo)

export default router;