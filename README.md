<p align="center">
  <img height="100px" src="./public/logo.svg" center />
</p>

# [Online-MD](https://github.com/taxayd/online-md)

Self-hosted Markdown编辑器，使用腾讯云云开发相关资源（具体用到云存储，云函数，云数据库，静态网站托管）

## 开发者信息

本应用由 [taxayd](https://github.com/taxayd) 开发提供

## 使用

一键部署完成后，在腾讯云云开发控制台找到静态网站地址，直接访问使用即可。

## 部署

本项目基于腾讯开源项目 [CloudBase Framework](https://github.com/Tencent/cloudbase-framework) [![star](https://img.shields.io/github/stars/Tencent/cloudbase-framework?style=social)](https://github.com/Tencent/cloudbase-framework) 开发部署，支持一键云端部署

[![](https://main.qcloudimg.com/raw/95b6b680ef97026ae10809dbd6516117.svg)](https://console.cloud.tencent.com/tcb/env/index?action=CreateAndDeployCloudBaseProject&appUrl=https%3A%2F%2Fgithub.com%2Ftaxayd%2Fonline-md&branch=master)

### 配置

一键部署过程中，需按提示输入以下环境变量

- PASSWORD 访问密码（以避免他人滥用你的资源，访问你的文档）

## 开发

你也可以下载项目后，使用 [CloudBase CLI](https://docs.cloudbase.net/cli-v1/intro.html) 在终端中一键部署。

```
npx @cloudbase/cli framework deploy -e 环境id
```

## 注意事项

1. 目前同步算法尚不完善，不能同步得太快

## 文档

- [CloudBase Framework 文档](https://docs.cloudbase.net/framework/)

## Licence

开源协议文档请参阅 [LICENSE](./LICENSE)
