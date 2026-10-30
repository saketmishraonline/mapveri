import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mapveriRouter from "./mapveri";
import oauthRouter from "./oauth";
import rewardsRouter from "./rewards";
import organizationRouter from "./organization";
import railradarRouter from "./railradar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mapveriRouter);
router.use(oauthRouter);
router.use(rewardsRouter);
router.use(organizationRouter);
router.use(railradarRouter);

export default router;
