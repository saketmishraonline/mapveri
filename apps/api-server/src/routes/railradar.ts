import { Router, type IRouter } from "express";
import { railRadarAdapter } from "../lib/railradar-adapter";

const router: IRouter = Router();

// GET /api/transit/railradar/trains - Return all active corridor trains with live telemetry
router.get("/transit/railradar/trains", async (req, res) => {
  try {
    const trains = await railRadarAdapter.getAllTrains();
    res.json({
      success: true,
      count: trains.length,
      trains,
      attribution: railRadarAdapter.attribution.attributionText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch RailRadar trains", error: String(error) });
  }
});

// GET /api/transit/railradar/trains/:trainId - Single train telemetry
router.get("/transit/railradar/trains/:trainId", async (req, res) => {
  try {
    const { trainId } = req.params;
    const train = await railRadarAdapter.getTrainStatus(trainId);
    res.json({ success: true, train });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch train status", error: String(error) });
  }
});

// GET /api/transit/railradar/stations/:stationName - Live station departures & arrivals board
router.get("/transit/railradar/stations/:stationName", async (req, res) => {
  try {
    const { stationName } = req.params;
    const schedule = await railRadarAdapter.getStationSchedule(decodeURIComponent(stationName));
    res.json({ success: true, ...schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch station schedule", error: String(error) });
  }
});

// GET /api/transit/railradar/health - Integration health test
router.get("/transit/railradar/health", async (req, res) => {
  try {
    const health = await railRadarAdapter.runHealthTest();
    res.json({ success: true, health });
  } catch (error) {
    res.status(500).json({ success: false, message: "RailRadar health check failed", error: String(error) });
  }
});

// POST /api/transit/railradar/ingest - Ingest verified train status
router.post("/transit/railradar/ingest", async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.trainId || !body.trainNumber) {
      res.status(400).json({ success: false, message: "trainId and trainNumber are required" });
      return;
    }
    railRadarAdapter.ingestVerifiedTrainStatus({
      ...body,
      dataFreshnessTimestamp: body.dataFreshnessTimestamp || new Date().toISOString(),
    });
    res.json({ success: true, message: `Telemetry recorded for train ${body.trainNumber}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to ingest telemetry", error: String(error) });
  }
});

export default router;
