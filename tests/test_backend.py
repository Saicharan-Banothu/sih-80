"""Unit tests for FastAPI endpoints, operational forecast, district decision support, and verification."""

import pytest
from starlette.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root endpoint provides API navigation information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert data["health_url"] == "/health"
    assert "docs_url" in data


def test_health_check_endpoint():
    """Verify /health returns 200 OK, healthy status, and 6 regimes configured."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["regimes_configured"] == 6
    assert "timestamp" in data
    assert data["service"] == "RegimeRain-AI"


def test_system_status_endpoint():
    """Verify /api/v1/status endpoint exposes data sources and operational state."""
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert len(data["regimes_active"]) == 6
    assert data["thresholds_mm"]["heavy"] == 64.5
    assert data["provenance_policy"] == "ABSOLUTE_INTEGRITY_NO_FABRICATION"


def test_provenance_endpoint():
    """Verify /api/v1/provenance returns registered data sources with licenses."""
    response = client.get("/api/v1/provenance")
    assert response.status_code == 200
    data = response.json()
    assert data["data_policy"] == "ABSOLUTE_INTEGRITY_NO_FABRICATION"
    assert "sources" in data
    assert "nwp_forecast" in data["sources"]
    assert "atmospheric_state" in data["sources"]


def test_model_info_endpoint():
    """Verify /api/v1/model-info provides complete architecture and disclaimer."""
    response = client.get("/api/v1/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "Mixture-of-Experts" in data["architecture"]
    assert len(data["regimes"]) == 6
    assert 0.95 in data["quantiles"]
    assert "human forecaster review" in data["disclaimer"]


def test_regimes_endpoint():
    """Verify /api/v1/regimes lists all 6 operational regimes."""
    response = client.get("/api/v1/regimes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    codes = [r["code"] for r in data]
    assert "AM" in codes
    assert "MDL" in codes
    assert "ORO" in codes


def test_thresholds_endpoint():
    """Verify /api/v1/thresholds lists IMD categories and warning colors."""
    response = client.get("/api/v1/thresholds")
    assert response.status_code == 200
    data = response.json()
    assert "imd_categories" in data
    assert "warnings" in data
    assert data["critical_levels_mm"]["extremely_heavy"] == 204.5


def test_forecast_predict_endpoint():
    """Verify /api/v1/forecast/predict returns real-time inference and alert breakdown."""
    response = client.get("/api/v1/forecast/predict")
    assert response.status_code == 200
    data = response.json()
    assert "dominant_regime" in data
    assert "regime_probabilities" in data
    assert len(data["regime_probabilities"]) == 6
    assert "district_alert_counts" in data
    assert "RED" in data["district_alert_counts"]
    assert "total_districts" in data
    assert data["total_districts"] > 0


def test_forecast_districts_endpoint():
    """Verify /api/v1/forecast/districts returns list of districts with IMD color codes."""
    response = client.get("/api/v1/forecast/districts")
    assert response.status_code == 200
    districts = response.json()
    assert len(districts) > 0
    first = districts[0]
    assert "district_id" in first
    assert "name" in first
    assert "forecast" in first
    assert "advisory" in first
    assert first["advisory"]["color_code"] in ["GREEN", "YELLOW", "ORANGE", "RED"]


def test_forecast_override_and_history_endpoints():
    """Verify POST /api/v1/forecast/override and GET /api/v1/forecast/overrides."""
    override_payload = {
        "district_id": "KL_WAY",
        "forecaster_id": "CHIEF_MET_01",
        "overridden_color": "RED",
        "scaling_multiplier": 1.15,
        "justification_reason": "High-altitude cloudburst observed via Doppler radar",
    }
    response = client.post("/api/v1/forecast/override", json=override_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["updated_advisory"]["advisory"]["color_code"] == "RED"

    # Verify override is recorded in history
    hist_resp = client.get("/api/v1/forecast/overrides")
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert len(hist) > 0
    assert any(h["district_id"] == "KL_WAY" and h["overridden_color"] == "RED" for h in hist)


def test_verification_artifacts_endpoints():
    """Verify verification endpoints serve saved experimental results."""
    # Benchmark
    bench_resp = client.get("/api/v1/verification/benchmark")
    assert bench_resp.status_code == 200
    assert "scientific_verification" in bench_resp.json()

    # Ablation
    abl_resp = client.get("/api/v1/verification/ablation")
    assert abl_resp.status_code == 200
    assert "variants" in abl_resp.json()

    # Leaderboard
    lead_resp = client.get("/api/v1/verification/leaderboard")
    assert lead_resp.status_code == 200
    assert "leaderboard" in lead_resp.json()


def test_auth_login_and_me():
    """Verify demo login with valid credentials and /auth/me endpoint."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "district.officer@demo.regimerain", "password": "demo2026"}
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "token" in data
    assert data["user"]["role"] == "District Officer"
    assert data["user"]["role_key"] == "district_officer"

    # Test me
    me_resp = client.get("/api/v1/auth/me?email=district.officer@demo.regimerain")
    assert me_resp.status_code == 200
    assert me_resp.json()["name"] == "Dr. A. Verma"


def test_watchlist_operations():
    """Verify watchlist get, add, and remove endpoints."""
    # Get initial
    resp = client.get("/api/v1/watchlist?user_email=district.officer@demo.regimerain")
    assert resp.status_code == 200
    data = resp.json()
    assert "watchlist" in data

    # Add district
    add_resp = client.post(
        "/api/v1/watchlist?user_email=district.officer@demo.regimerain",
        json={"district_id": "MH_RAT"}
    )
    assert add_resp.status_code == 200
    assert "MH_RAT" in add_resp.json()["watchlist"]

    # Delete district
    del_resp = client.delete(
        "/api/v1/watchlist/MH_RAT?user_email=district.officer@demo.regimerain"
    )
    assert del_resp.status_code == 200
    assert "MH_RAT" not in del_resp.json()["watchlist"]


def test_alerts_endpoint():
    """Verify operational alerts endpoint returns active alerts and counts."""
    resp = client.get("/api/v1/alerts?lead_hours=24")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_alerts" in data
    assert "alerts" in data
    assert isinstance(data["alerts"], list)
    assert data["lead_hours"] == 24
