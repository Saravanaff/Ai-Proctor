import express from "express";
import { getExamLogs, storeExamLog } from "../controllers/LogController";

const router = express.Router();



router.post("/storeLogs", storeExamLog);


router.get("/getLogs", getExamLogs);

export default router;
