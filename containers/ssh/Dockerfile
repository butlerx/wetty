ARG TARGETPLATFORM
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then ARCHITECTURE=amd64; \
    elif [ "$TARGETPLATFORM" = "linux/arm/v7" ]; then ARCHITECTURE=arm; \
    elif [ "$TARGETPLATFORM" = "linux/arm/v8" ]; then ARCHITECTURE=arm64v8; \
    elif [ "$TARGETPLATFORM" = "linux/arm64" ]; then ARCHITECTURE=aarch64; \
    else ARCHITECTURE=amd64; \
    fi
FROM ${ARCHITECTURE}/alpine:latest
RUN adduser -D -h /home/term -s /bin/sh term && \
    ( echo "term:term" | chpasswd )
