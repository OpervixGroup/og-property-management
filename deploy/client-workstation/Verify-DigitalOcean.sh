#!/bin/sh
# READ ONLY. Existing DigitalOcean root console only. Does not install or start anything.
set -eu
command -v docker >/dev/null
command -v systemctl >/dev/null
test "$(docker inspect -f '{{.State.Running}}' opervix-codex)" = true
test "$(docker exec --user node opervix-codex id -u)" = 1000
docker exec --user node --workdir /home/node/opervix-cloud-team-20261021 opervix-codex node verify-package.mjs
systemctl show opervix-company-cycle.timer -p ActiveState -p UnitFileState -p NextElapseUSecRealtime
docker exec --user node opervix-codex node -e 'const fs=require("fs");const r="/home/node/opervix-cloud-team-20261021/";const load=n=>fs.existsSync(r+n)?JSON.parse(fs.readFileSync(r+n,"utf8")):null;const a=load("activation.json"),c=load("last-cycle.json"),l=load("last-client-learning.json");console.log(JSON.stringify({checkedAt:new Date().toISOString(),corporateConfigured:a?.enabled===true,clientLearningConfigured:a?.clientLearningEnabled===true,heldLock:fs.existsSync(r+"cycle.lock"),lastCorporateStatus:c?.status??null,lastClientStatus:l?.status??null,scope:"Metadata only; activation flags are not proof of completed work"}))'
