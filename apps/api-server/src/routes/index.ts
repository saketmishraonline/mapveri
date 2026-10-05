import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mapveriRouter from "./mapveri";
import oauthRouter from "./oauth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mapveriRouter);
router.use(oauthRouter);

export default router;
