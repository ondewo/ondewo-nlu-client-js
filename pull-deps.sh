#!/bin/sh

NLU_VERSION=1.1.0
SIP_VERSION=release/1.1.0

CWD=$(pwd)

cd /tmp

wget "https://raw.githubusercontent.com/ondewo/ondewo-nlu-api/$NLU_VERSION/ondewo/nlu/context.proto"
mkdir -p "$CWD/src/ondewo-vtsi-api/ondewo/nlu"
mv context.proto "$CWD/src/ondewo-vtsi-api/ondewo/nlu"

wget "https://raw.githubusercontent.com/ondewo/ondewo-sip-api/$SIP_VERSION/ondewo/sip/sip.proto"
mkdir -p "$CWD/src/ondewo-vtsi-api/ondewo/sip"
mv sip.proto "$CWD/src/ondewo-vtsi-api/ondewo/sip"

mkdir -p "$CWD/src/ondewo-vtsi-api/googleapis"
mkdir -p "$CWD/src/ondewo-vtsi-api/googleapis/google/api"

wget "https://raw.githubusercontent.com/ondewo/ondewo-nlu-api/master/googleapis/google/api/annotations.proto"
wget "https://raw.githubusercontent.com/ondewo/ondewo-nlu-api/master/googleapis/google/api/http.proto"

mv annotations.proto "$CWD/src/ondewo-vtsi-api/googleapis/google/api"
mv http.proto "$CWD/src/ondewo-vtsi-api/googleapis/google/api"

cd "$CWD"