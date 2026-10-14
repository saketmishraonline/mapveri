import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mapveriRouter from "./mapveri";
import oauthRouter from "./oauth";
import rewardsRouter from "./rewards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mapveriRouter);
router.use(oauthRouter);
router.use(rewardsRouter);

export default router;
