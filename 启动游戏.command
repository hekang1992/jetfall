#!/bin/zsh
cd "$(dirname "$0")" || exit 1
port=8765
while /usr/sbin/lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; do
  port=$((port + 1))
done
open "http://localhost:$port"
echo "JETFALL 已启动。关闭这个窗口可停止服务。"
python3 -m http.server "$port" --bind 0.0.0.0
