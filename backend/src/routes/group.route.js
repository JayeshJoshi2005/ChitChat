import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createGroup, getMyGroups } from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getMyGroups);

export default router;
