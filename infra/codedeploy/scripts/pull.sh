#!/bin/bash
# AfterInstall: 이번에 배포할 이미지(image.env 의 IMAGE)를 ECR 에서 받는다
set -euo pipefail
source /opt/nansogong/deploy/image.env        # IMAGE=<계정>.dkr.ecr.<리전>.amazonaws.com/nansogong-api:tree-xxxx
source /etc/nansogong/infra.env               # AWS_REGION (EC2 User data 가 작성)

REGISTRY=${IMAGE%%/*}
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY" > /dev/null
docker pull --quiet "$IMAGE"
