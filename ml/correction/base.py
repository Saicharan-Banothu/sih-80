"""Base abstract classes for rainfall correction models."""

from __future__ import annotations

import abc
from typing import Any, Dict
import numpy as np


class BaseCorrectionModel(abc.ABC):
    """Abstract base class for rainfall post-processing correction models."""

    @abc.abstractmethod
    def fit(self, *args, **kwargs) -> BaseCorrectionModel:
        pass

    @abc.abstractmethod
    def predict(self, *args, **kwargs) -> Any:
        pass
