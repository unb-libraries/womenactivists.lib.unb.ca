#!/usr/bin/env bash
docker pull $1
docker-compose build
docker-compose up -d
docker-compose logs -f
