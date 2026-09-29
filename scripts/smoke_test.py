"""Phase 0 System and Acceptance Smoke Test Script."""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import settings
from backend.main import app
from starlette.testclient import TestClient

def run_smoke_test():
    print("=" * 60)
    print("SIH-80 PHASE 0 SYSTEM HEALTH & ACCEPTANCE CHECK")
    print("=" * 60)

    # 1. Configuration Check
    print("[1/5] Verifying System Configuration & Regimes...")
    assert len(settings.regimes) == 6, f"Expected 6 regimes, got {len(settings.regimes)}"
    for r in settings.regimes:
        print(f"      - Regime [{r['code']}]: {r['name']}")
    
    thresh = settings.critical_thresholds
    assert thresh["heavy"] == 64.5
    assert thresh["very_heavy"] == 115.6
    assert thresh["extremely_heavy"] == 204.5
    print(f"      * IMD Thresholds: Heavy={thresh['heavy']}mm, VeryHeavy={thresh['very_heavy']}mm, Extreme={thresh['extremely_heavy']}mm")
    print("      -> Configuration Check: PASS")

    # 2. Source Registry Check
    print("\n[2/5] Verifying Source Registry & Fallbacks...")
    sources = settings.source_registry.get("sources", {})
    assert "nwp_forecast" in sources
    assert sources["nwp_forecast"]["fallback"]["name"] == "NOAA-GFS"
    assert sources["atmospheric_state"]["fallback"]["name"] == "ERA5"
    policy = settings.source_registry.get("data_policy")
    assert policy == "ABSOLUTE_INTEGRITY_NO_FABRICATION"
    print(f"      * Data Integrity Policy: {policy}")
    print(f"      * NWP Primary: {sources['nwp_forecast']['primary']['name']} | Fallback: {sources['nwp_forecast']['fallback']['name']}")
    print(f"      * Reanalysis Primary: {sources['atmospheric_state']['primary']['name']} | Fallback: {sources['atmospheric_state']['fallback']['name']}")
    print("      -> Registry Check: PASS")

    # 3. Backend Health & API Endpoints Check
    print("\n[3/5] Verifying Backend Application & Endpoints...")
    client = TestClient(app)

    health_resp = client.get("/health")
    assert health_resp.status_code == 200, f"/health returned {health_resp.status_code}"
    health_data = health_resp.json()
    assert health_data["status"] == "healthy"
    assert health_data["regimes_configured"] == 6
    print(f"      * GET /health: 200 OK | status={health_data['status']}, regimes={health_data['regimes_configured']}")

    status_resp = client.get("/api/v1/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "OPERATIONAL"
    print(f"      * GET /api/v1/status: 200 OK | status={status_data['status']}, NWP={status_data['nwp_source']}")

    prov_resp = client.get("/api/v1/provenance")
    assert prov_resp.status_code == 200
    print(f"      * GET /api/v1/provenance: 200 OK | sources_count={len(prov_resp.json()['sources'])}")

    model_resp = client.get("/api/v1/model-info")
    assert model_resp.status_code == 200
    print(f"      * GET /api/v1/model-info: 200 OK | arch={model_resp.json()['architecture'][:35]}...")
    print("      -> Backend Check: PASS")

    # 4. Frontend Build Asset Check
    print("\n[4/5] Verifying Frontend Production Build...")
    frontend_dist = PROJECT_ROOT / "frontend" / "dist" / "index.html"
    assert frontend_dist.is_file(), "Frontend dist/index.html was not found"
    print(f"      * Frontend index.html exists ({frontend_dist.stat().st_size} bytes)")
    print("      -> Frontend Build Check: PASS")

    # 5. Documentation & Audit Check
    print("\n[5/5] Verifying Documentation & Architecture Audit...")
    audit_file = PROJECT_ROOT / "docs" / "ARCHITECTURE_AUDIT.md"
    assert audit_file.is_file(), "docs/ARCHITECTURE_AUDIT.md not found"
    print(f"      * Architecture Audit: {audit_file.stat().st_size} bytes")
    print("      -> Documentation Check: PASS")

    print("\n" + "=" * 60)
    print("ALL PHASE 0 SYSTEM HEALTH & ACCEPTANCE CHECKS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    run_smoke_test()
