---
name: MapVeri coordinate storage
description: MapVeri's development database coordinate and proximity tradeoff
---

MapVeri stores latitude and longitude as fixed-precision numeric columns and uses the Haversine formula for nearby-pin checks. This keeps the app runnable against the managed PostgreSQL setup without requiring PostGIS extensions.

**Why:** The product brief named PostGIS, but the shared workspace database is easier to provision reliably with portable numeric columns; the user-facing nearby behavior remains the same.

**How to apply:** Keep input validation bounded to valid latitude/longitude ranges and convert database numeric strings to numbers at the API response boundary.