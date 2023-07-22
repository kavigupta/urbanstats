#!/bin/bash

protoc -I=. --python_out=urbanstats/protobuf/ ./data_files.proto
black urbanstats/protobuf/data_files_pb2.py