# C-Doc Next.js - 文档批量处理工具 (精简版)

一个基于 Next.js 的现代化 DOCX 文档批量处理工具，专注于简单高效的文档样式统一处理。

## ✨ 主要特性

- **🎯 精简设计**：去除复杂配置，专注模板化处理
- **📝 预设模板**：提供学术论文、公文格式、商务报告等常用模板
- **🔄 批量处理**：支持多文件同时处理
- **⚡ 实时预览**：文档分析和预览功能
- **🎨 自定义模板**：支持创建和保存自定义样式模板
- **📱 响应式设计**：适配各种设备和屏幕尺寸

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用。

## 📖 使用指南

### 1. 文件上传
- 拖拽或点击选择 `.docx` 文件
- 支持多文件批量上传

### 2. 模板选择
- **学术论文**：标题黑体4号居中，正文宋体5号两端对齐
- **公文格式**：标题宋体二号加粗居中，正文仿宋三号
- **商务报告**：标题微软雅黑三号加粗，正文微软雅黑小四
- **简洁文档**：标题宋体小二加粗居中，正文宋体小四
- **自定义模板**：点击"创建新模板"进行个性化配置

### 3. 文件处理
- 选择模板后点击"应用模板处理"
- 支持单文件或批量处理
- 处理完成后可直接下载

### 4. 创建自定义模板
- 访问 `/templates/create` 页面
- 配置标题、作者、正文的字体样式
- 支持实时预览和保存

## 🔧 技术栈

- **前端框架**: Next.js 15.3.2
- **UI 组件**: 自定义组件 + shadcn/ui
- **文档处理**: docx4js + mammoth.js
- **样式**: Tailwind CSS
- **类型检查**: TypeScript

## 📁 项目结构

```
c-doc-nextjs/
├── app/                    # Next.js 应用目录
│   ├── api/               # API 路由
│   │   ├── analyze/       # 文档分析API
│   │   ├── files/         # 文件下载API
│   │   ├── process/       # 文档处理API
│   │   └── upload/        # 文件上传API
│   ├── templates/         # 模板相关页面
│   │   └── create/        # 创建模板页面
│   ├── page.tsx          # 主页面（精简版）
│   └── types.ts          # 类型定义
├── components/            # 可复用组件
│   ├── ui/               # 基础UI组件
│   ├── template-selector.tsx
│   └── upload-progress.tsx
├── lib/                  # 核心功能库
│   ├── docx-processor-integrated.ts  # 文档处理器
│   ├── deep-font-detector.ts         # 字体检测器
│   ├── preset-templates.ts           # 预设模板
│   ├── font-utils.ts                 # 字体工具
│   └── utils.ts                      # 工具函数
├── types/                # 类型声明文件
└── tmp/                  # 临时文件目录
    ├── uploads/          # 上传文件
    └── processed/        # 处理后文件
```

## 🔗 API 端点

- `POST /api/upload` - 文件上传
- `POST /api/analyze/docx` - 文档分析
- `POST /api/process/docx` - 文档处理
- `GET /api/files/processed/[fileName]` - 处理后文件下载

## 🛠️ 开发说明

### 添加新的预设模板

1. 在 `lib/preset-templates.ts` 中添加新模板定义
2. 模板会自动出现在主页面的模板选择器中

### 自定义样式配置

- 支持字体名称、大小、颜色、对齐方式等属性配置
- 支持加粗、斜体、下划线等文本样式
- 支持为标题和作者添加前缀/后缀文本

## 🔒 注意事项

- 仅支持 `.docx` 格式文件
- 如果您有 `.doc` 文件，请先到 [FreeConvert](https://www.freeconvert.com/zh) 转换为 `.docx` 格式后再上传
- 上传的文件会临时存储在服务器上
- 处理后的文件会在一定时间后自动清理
- 建议定期备份重要的自定义模板

## 📝 更新日志

### v2.0.0 (精简版)
- ✅ 精简界面设计，去除复杂配置
- ✅ 引入预设模板系统
- ✅ 优化文档处理流程
- ✅ 改进用户体验
- ✅ 修复多项稳定性问题

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 📄 许可证

本项目采用 MIT 许可证。
