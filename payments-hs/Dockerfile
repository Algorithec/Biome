# ── Build stage ────────────────────────────────────────────────────────────────
FROM haskell:9.4-slim AS builder

WORKDIR /app

# Cache Cabal index + deps
COPY cabal.project deepenk-payments.cabal ./
RUN cabal update && cabal build --only-dependencies -j4

# Build the executable
COPY . .
RUN cabal build -j4 && \
    cp "$(cabal list-bin deepenk-payments)" /usr/local/bin/deepenk-payments

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgmp10 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -r payments && useradd -r -g payments payments

COPY --from=builder /usr/local/bin/deepenk-payments /usr/local/bin/

USER payments

ENV PORT=4010
EXPOSE 4010

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4010/health || exit 1

CMD ["deepenk-payments"]