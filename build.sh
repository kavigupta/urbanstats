#!/bin/bash

protoc -I=. --python_out=urbanstats/protobuf/ ./data_files.proto
black urbanstats/protobuf/data_files_pb2.py

cd react
npx -- pbjs -t static-module -w commonjs -o src/utils/protos.js ../data_files.proto
