#!/bin/bash
# 📡 GitHub Actions 에서 dev EC2 의 update.sh 를 원격 실행한다 (SSM Run Command, SSH 없이)
#   bash infra/dev/run-remote.sh api tree-abc123
#   필요: 환경변수 DEV_INSTANCE_ID, AWS 자격 증명(dev 배포 역할), aws CLI
#   update.sh 가 끝날 때까지 기다리고, 실패하면 EC2 쪽 출력을 보여 주고 실패한다
set -euo pipefail
COMPONENT=${1:?api · web · ai 중 하나}
TAG=${2:?이미지 태그}
INSTANCE=${DEV_INSTANCE_ID:?DEV_INSTANCE_ID 가 없습니다}
REGION=${AWS_REGION:-ap-northeast-2}

CMD="sudo -iu ec2-user bash /opt/nansogong/infra/dev/update.sh $COMPONENT $TAG"
COMMAND_ID=$(aws ssm send-command --region "$REGION" \
  --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript \
  --comment "nansogong dev $COMPONENT $TAG" \
  --parameters "{\"commands\":[\"$CMD\"],\"executionTimeout\":[\"900\"]}" \
  --query Command.CommandId --output text)
echo "SSM 명령 $COMMAND_ID → $INSTANCE : $CMD"

for i in $(seq 1 90); do
  sleep 10
  STATUS=$(aws ssm get-command-invocation --region "$REGION" --command-id "$COMMAND_ID" --instance-id "$INSTANCE" \
             --query Status --output text 2>/dev/null || echo Pending)
  case "$STATUS" in
    Pending|InProgress|Delayed) echo "진행 중 ($STATUS, ${i}0초)" ;;
    *) break ;;
  esac
done

aws ssm get-command-invocation --region "$REGION" --command-id "$COMMAND_ID" --instance-id "$INSTANCE" \
  --query '[StandardOutputContent, StandardErrorContent]' --output text
[ "$STATUS" = "Success" ] || { echo "🚨 dev 갱신 실패: $STATUS"; exit 1; }
