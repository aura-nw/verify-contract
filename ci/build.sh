#!/bin/sh
set -xe

#Login to registry
echo $REGISTRY_PASSWORD | docker login ghcr.io -u $REGISTRY_USERNAME --password-stdin
#Build and push image
docker build -t ${CONTAINER_RELEASE_IMAGE} -f Dockerfile .
docker push ${CONTAINER_RELEASE_IMAGE}
