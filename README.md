# 个人每日打卡

无需安装依赖的静态网站，包含今日打卡、连续天数、累计天数、月历和最近七条记录。

记录存在浏览器 localStorage 中。同一天重复点击不会增加记录，日期按设备时区计算。不同设备、浏览器和网站地址之间不会同步数据，清除网站数据会删除记录。

## 本地预览

在此目录运行 `python -m http.server 8765 --bind 127.0.0.1`，打开 http://127.0.0.1:8765。

## 发布到 GitHub Pages

1. 创建公开的 GitHub 仓库。
2. 将本目录中的 `index.html` 上传到仓库根目录。
3. 打开仓库 Settings → Pages。
4. Source 选择 Deploy from a branch，Branch 选择 main，目录选择 / (root)，点击 Save。
5. 等待发布完成，访问 Pages 页面显示的网址。

此版本没有登录、数据库或服务器，不需要 API 密钥。在线地址与本地预览各自保存独立记录。

