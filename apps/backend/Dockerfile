FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        curl \
        nodejs \
        npm \
        ruby \
        ruby-dev \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Node.js static analysis tools: ESLint (JS/TS) + Stylelint (CSS/SCSS)
RUN npm install -g \
        eslint@^8 \
        @eslint/js \
        stylelint \
        stylelint-config-standard \
    && npm cache clean --force

# Ruby static analysis: RuboCop (disabled by default, enable via STATIC_ANALYSIS_RUBOCOP_ENABLED=true)
RUN gem install rubocop --no-document

# Go staticcheck binary (for STATIC_ANALYSIS_STATICCHECK_ENABLED=true)
RUN curl -sSfL \
        https://github.com/dominikh/go-tools/releases/latest/download/staticcheck_linux_amd64.tar.gz \
    | tar -xzf - -C /usr/local/bin --strip-components=1 staticcheck/staticcheck \
    && chmod +x /usr/local/bin/staticcheck

# Ensure Python console scripts installed by Poetry are resolvable in worker/API
# runtime shells (semgrep, ruff, sqlfluff, etc.).
ENV PATH="/usr/local/bin:${PATH}"

COPY pyproject.toml /app/pyproject.toml
RUN pip install --no-cache-dir poetry \
    && poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

COPY . /app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
