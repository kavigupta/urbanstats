#!/bin/bash

protoc -I=. --python_out=urbanstats/protobuf/ ./data_files.proto