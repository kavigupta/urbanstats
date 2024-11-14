#!/bin/bash

python -m grpc_tools.protoc -I=. --experimental_allow_proto3_optional --python_out=urbanstats/protobuf/ --pyi_out=urbanstats/protobuf/  ./data_files.proto
isort urbanstats/protobuf/data_files_pb2.*
black urbanstats/protobuf/data_files_pb2.*
# add #pylint: skip-file to the top of the generated files
for file in urbanstats/protobuf/data_files_pb2.*; do
    sed -i '1s/^/#pylint: skip-file\n/' $file
done

cd react
npx -- pbjs -t static-module -w commonjs -o src/utils/protos.js ../data_files.proto
npx pbts -o src/utils/protos.d.ts src/utils/protos.js
