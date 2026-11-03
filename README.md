# JETFALL · 螺旋飞车

原创 3D 汽车特技小游戏：四轮着地加速 → 沿 180° 螺旋导轨翻转 → 车轮朝上倒扣出轨 → 喷气扶正缓冲 → 四轮安全着陆。

↑ / W 加速与喷气，← → / A D 控制空中翻转，E 辅助扶正，P 暂停，R 重试。支持多点触屏、三条赛道、本地最佳成绩和离线缓存。

本地运行：`python3 -m http.server 8765`，在浏览器打开 `http://localhost:8765/`。完整操作见 [使用说明](使用说明.md)。

GitHub Actions 在发布前验证物理流程、WebGL 渲染、完整通关、手机布局与多点触屏。Three.js 0.160.1 使用 MIT 许可证，见 vendor/THREE-LICENSE.txt。非 Tesla 官方产品。
