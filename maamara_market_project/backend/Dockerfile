# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Keep downloaded wheels in a BuildKit cache so rebuilding dependencies does not
# redownload everything. The cache is shared by services using this Dockerfile.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

RUN chmod +x entrypoint.production.sh

EXPOSE 8000

CMD ["./entrypoint.production.sh"]
