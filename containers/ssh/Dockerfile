FROM alpine
#FROM --platform=$BUILDPLATFORM alpine AS build
RUN adduser -D -h /home/term -s /bin/sh term && \
    ( echo "term:term" | chpasswd )
