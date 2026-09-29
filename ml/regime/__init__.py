"""Module A: Probabilistic Weather Regime Classification Package."""

from ml.regime.labels import REGIME_IDS, REGIME_METADATA, get_regime_name, get_regime_id
from ml.regime.mapping import RegimeTaxonomyMapper
from ml.regime.model import ProbabilisticRegimeClassifier, ClimaXInterface, ResidualAtmosphericEncoder
from ml.regime.calibration import TemperatureScaler, compute_expected_calibration_error, compute_brier_score
from ml.regime.inference import RegimeInferenceEngine
from ml.regime.evaluation import evaluate_regime_predictions

__all__ = [
    "REGIME_IDS",
    "REGIME_METADATA",
    "get_regime_name",
    "get_regime_id",
    "RegimeTaxonomyMapper",
    "ProbabilisticRegimeClassifier",
    "ClimaXInterface",
    "ResidualAtmosphericEncoder",
    "TemperatureScaler",
    "compute_expected_calibration_error",
    "compute_brier_score",
    "RegimeInferenceEngine",
    "evaluate_regime_predictions",
]
