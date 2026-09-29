import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mapveriRouter from "./mapveri";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mapveriRouter);

export default router;
