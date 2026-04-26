# syntax=docker/dockerfile:1
# Base: ai-review-ml-base (contains torch + sentence-transformers, built once)
# Build base first: docker build -f Dockerfile.ml-base -t ai-review-ml-base:latest .
FROM ai-review-ml-base:latest

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=1000
ENV PIP_RETRIES=10
ENV CUDA_VISIBLE_DEVICES=""
ENV TORCH_CUDA_ARCH_LIST=""
ENV FORCE_CUDA=0

# System tools (apt cache mount avoids re-download on retry)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        curl \
        nodejs \
        npm \
        ruby \
        ruby-dev \
        build-essential

# Node.js static analysis tools
RUN --mount=type=cache,target=/root/.npm \
    npm install -g \
        eslint@^8 \
        @eslint/js \
        stylelint \
        stylelint-config-standard

# Ruby static analysis: RuboCop
RUN --mount=type=cache,target=/root/.gem \
    gem install rubocop --no-document

# Go staticcheck
RUN curl -sSfL \
        https://github.com/dominikh/go-tools/releases/latest/download/staticcheck_linux_amd64.tar.gz \
    | tar -xzf - -C /usr/local/bin --strip-components=1 staticcheck/staticcheck \
    && chmod +x /usr/local/bin/staticcheck

ENV PATH="/usr/local/bin:${PATH}"

COPY requirements.txt /app/

# Install all Python deps EXCEPT torch/cuda (already in base image)
# Cache mount: interrupted build = resume from cache, not re-download
RUN --mount=type=cache,target=/root/.cache/pip \
    grep -vE "^(torch==|torchvision==|torchaudio==|cuda-|sentence-transformers==|transformers==)" requirements.txt \
        > /tmp/reqs-no-ml.txt \
    && pip install -r /tmp/reqs-no-ml.txt

COPY . /app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
