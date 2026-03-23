from __future__ import annotations

import sys
from pathlib import Path

from fastapi import APIRouter, Depends

from app.api.errors import ApiError
from app.api.middleware.auth import AuthenticatedPrincipal, require_permission

_REPO_ROOT = Path(__file__).resolve().parents[5]
if str(_REPO_ROOT) not in sys.path:
    sys.path.append(str(_REPO_ROOT))

from analysis_engine.dispatcher import detect_language, get_parser
from analysis_engine.models import AnalysisRequest, AnalysisResult
from analysis_engine.rules.bugs.null_return import NullReturnRule
from analysis_engine.rules.complexity.cyclomatic import CyclomaticComplexityRule
from analysis_engine.rules.security.hardcoded_secret import HardcodedSecretRule
from analysis_engine.rules.smells.long_function import LongFunctionRule
from analysis_engine.scorer import build_summary, compute_score

router = APIRouter(prefix="/v1/internal/analysis-engine", tags=["internal-analysis-engine"])

ALL_RULES = [
    NullReturnRule(),
    LongFunctionRule(),
    HardcodedSecretRule(),
    CyclomaticComplexityRule(),
]


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_with_internal_engine(
    req: AnalysisRequest,
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.write")),
) -> AnalysisResult:
    language = detect_language(req.filename)
    if language == "unknown":
        raise ApiError(
            status_code=400,
            code="ANALYSIS_ENGINE_UNSUPPORTED_LANGUAGE",
            message="Unsupported language",
            details={"filename": req.filename},
        )

    parser = get_parser(language)
    try:
        tree = parser.parse(req.code)
    except Exception as exc:
        raise ApiError(
            status_code=422,
            code="ANALYSIS_ENGINE_PARSE_ERROR",
            message="Unable to parse source code",
            details={"error": str(exc), "language": language},
        ) from exc

    issues = []
    for rule in ALL_RULES:
        issues.extend(rule.check(tree, req.code, language))

    return AnalysisResult(
        filename=req.filename,
        language=language,
        issues=issues,
        score=compute_score(issues),
        summary=build_summary(issues),
    )


@router.get("/health")
async def internal_analysis_engine_health(
    _principal: AuthenticatedPrincipal | None = Depends(require_permission("analyses.read")),
) -> dict[str, str]:
    return {"status": "ok"}
