"""Feature engineering package for regime-aware forecast correction."""

from ml.features.builder import FeatureBuilder, FeatureMatrix
from ml.features.normalization import FeatureNormalizer
from ml.features.leakage_audit import LeakageAuditor, DataLeakageError

__all__ = [
    "FeatureBuilder",
    "FeatureMatrix",
    "FeatureNormalizer",
    "LeakageAuditor",
    "DataLeakageError",
]
