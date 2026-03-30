# Ikarugo 🐙

A pixel octopus desktop pet for Windows. Made by River & Claude & Codex.

灵感来源：《全职猎人》里的伊加路哥，奇犽的好伙伴。

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/ikarugo.git
cd ikarugo

# 2. Install dependencies
npm install

# 3. Run
npm start
```

> 如果在中国大陆/台湾地区，npm install 时建议设置镜像：
>
> ```bash
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm install
> ```

## Build（打包成 .exe）

```bash
# 需要管理员身份运行 CMD
npm run build
```

打包好的 `Ikarugo 2.0.0.exe` 会出现在 `dist/` 目录下，直接运行即可，不需要安装。

## Features

- 👁 眼睛跟随鼠标
- 🖱 拖拽移动，拖到屏幕左右边缘自动挂墙 `Peek!`，鼠标长按可抓取
- 👆 点击有反应，连点 5 下哭 `(╥_╥)`
- 🫁 呼吸动画 + 自然眨眼
- 😴 60 秒无操作自动入睡，鼠标移动唤醒
- 🖱 右键退出，喷墨说 `Bye~`
- 闲置动画（随机轮换）：
  - 💦 水枪 `Pew pew!`
  - 🦑 喷墨传送：原地消失，从屏幕另一头冒出来
  - 🪨 搬石头堆门，堆完摆出得意表情

## Notes

- 纯本地运行，不需要任何 API key
- Build 时需要**管理员身份**运行 CMD（创建符号链接权限）
- 图标文件在 `assets/icon.ico`，可以自己换
- 任何安装过程中的问题可以打包问Claude
