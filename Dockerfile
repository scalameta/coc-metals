FROM debian:10
WORKDIR /work
RUN apt-get update && apt-get install -y po4a
