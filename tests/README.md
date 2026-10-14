# 回归检查

运行 `node tests/run.mjs`（Node.js 22+，无第三方依赖）。输出保存在 `.results/`，不提交。

- 所有运行时 JavaScript 与测试脚本的语法检查。
- `vocabulary-controls.mjs`：实际词库的版本、范围、去重、循环出题、家长范围隔离。
- `navy-controls.mjs`：实际进阶模型的伤害继承、逐关准确率、奖励暂存/结算、坏档与失败回滚。
- `offline-controls.mjs`：实际 Service Worker 在内存 CacheStorage 和可控网络中的失败、超时、续传、Range 与就绪标记。
- `path-regression.mjs`：实际射击寻路/碰撞/移动函数绕过桌子到达目标，仅注入测试输入与读取接口。

这些检查来自 10.13-01 的回归脚本，现已移除开发机器路径。媒体模拟响应不验证音视频解码，VM 不验证 DOM 画面与触控；真实浏览器多页面事件、录音、真机布局和断网实播仍需手动或浏览器集成检查。
