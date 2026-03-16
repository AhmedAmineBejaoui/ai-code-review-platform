from __future__ import annotations

import re
from pathlib import Path

_SNAKE_CASE_RE = re.compile(r"^[a-z_][a-z0-9_]*$")
_CAMEL_CASE_RE = re.compile(r"^[a-z][A-Za-z0-9]*$")
_PASCAL_CASE_RE = re.compile(r"^[A-Z][A-Za-z0-9]*$")
_UPPER_SNAKE_CASE_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")

ALLOWED_SHORT_NAMES = {"i", "j", "k", "id", "db", "ui"}
GENERIC_NAMES = {"data", "value", "tmp", "item"}
KNOWN_CODE_SUFFIXES = {
    ".py",
    ".pyi",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".go",
    ".java",
    ".kt",
    ".rs",
    ".rb",
    ".php",
    ".cs",
    ".swift",
}

_LANGUAGE_BY_SUFFIX = {
    ".py": "python",
    ".pyi": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".java": "java",
    ".kt": "kotlin",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".cs": "csharp",
    ".swift": "swift",
}

_COMMENT_PREFIXES = {
    "python": ("#",),
    "javascript": ("//",),
    "typescript": ("//",),
    "go": ("//",),
    "java": ("//",),
    "kotlin": ("//",),
    "rust": ("//",),
    "ruby": ("#",),
    "php": ("//", "#"),
    "csharp": ("//",),
    "swift": ("//",),
    "text": ("#", "//"),
}

_TEST_PATH_HINTS = ("tests/", "test/", "__tests__/", "spec/", "/tests/", "/test/", ".spec.", ".test.", "_test.")


def detect_language(relative_path: str) -> str:
    return _LANGUAGE_BY_SUFFIX.get(Path(relative_path).suffix.lower(), "text")


def comment_prefixes_for_language(language: str) -> tuple[str, ...]:
    return _COMMENT_PREFIXES.get(language, _COMMENT_PREFIXES["text"])


def is_test_path(relative_path: str) -> bool:
    lowered = relative_path.replace("\\", "/").lower()
    return any(hint in lowered for hint in _TEST_PATH_HINTS)


def is_valid_name(
    name: str,
    *,
    symbol_kind: str,
    language: str,
    relative_path: str,
    is_constant: bool = False,
) -> tuple[bool, str]:
    if symbol_kind in {"class", "component"}:
        return bool(_PASCAL_CASE_RE.match(name)), "PascalCase"
    if symbol_kind == "constant" or is_constant:
        return bool(_UPPER_SNAKE_CASE_RE.match(name)), "UPPER_SNAKE_CASE"
    if language == "python":
        return bool(_SNAKE_CASE_RE.match(name)), "snake_case"
    if Path(relative_path).suffix.lower() in {".tsx", ".jsx"} and _PASCAL_CASE_RE.match(name):
        return True, "camelCase or PascalCase"
    return bool(_CAMEL_CASE_RE.match(name)), "camelCase"
