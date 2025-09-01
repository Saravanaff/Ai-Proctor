import { Router } from "express";
import {
  getScoreInPercent,
  putScoreInPercent,
} from "../controllers/ScoresController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.post("/getScore", getScoreInPercent);

router.put("/saveScore", putScoreInPercent);

export default router;
