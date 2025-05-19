This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## DOCX 字体检测功能

本项目包含一个强大的DOCX字体检测功能，能够分析Word文档中的各种字体样式。

### 运行测试服务器

我们提供了两个版本的测试服务器：

1. 标准版测试服务器：
```bash
# Unix/Mac/Linux
./run-test-server.sh

# Windows
run-test-server.cmd
```

2. 增强版测试服务器（改进的字体检测）：
```bash
# Unix/Mac/Linux
./run-enhanced-test-server.sh

# Windows
run-enhanced-test-server.cmd
```

3. 深度字体分析测试服务器（最精确的字体检测）：
```bash
# Unix/Mac/Linux
./run-deep-analyzer.sh

# Windows
run-deep-analyzer.cmd
```

4. 集成版测试服务器（结合所有功能的解决方案）：
```bash
# Unix/Mac/Linux
./run-integrated-test-server.sh

# Windows
run-integrated-test-server.cmd
```

增强版测试服务器使用了改进的`docx-processor-enhanced.ts`处理器，它具有以下优势：

- 修复了多个TypeScript错误
- 增强了字体名称提取和清理能力
- 改进了样式收集逻辑，可以收集所有的字体样式
- 添加了更详细的调试日志和样本展示

深度字体分析测试服务器是最精确的字体检测工具，它具有以下特点：

- 直接从DOCX内部XML结构中提取字体信息
- 完整解析文档样式表(Styles)定义
- 识别并处理样式继承关系
- 分析文档中的默认字体设置
- 提供多种视图查看字体信息和样本
- 解决了早期版本检测不到真实字体的问题

访问 [http://localhost:3333](http://localhost:3333) 以使用深度字体分析测试服务器分析DOCX文件的字体。

访问 [http://localhost:3334](http://localhost:3334) 以使用集成版测试服务器，它结合了所有功能的完整解决方案。

## 集成版DOCX处理器

集成版DOCX处理器(`docx-processor-integrated.ts`)是一个完整的解决方案，它结合了增强版处理器的所有功能和深度字体检测能力，提供了以下优势：

- 全面的字体检测 - 能够精确识别文档中的所有字体
- 多层次检测策略 - 深度检测和标准检测相结合
- 优先使用深度检测结果，提高字体识别的准确性
- 保持向后兼容，支持所有原有功能
- 提供专用的字体使用统计和直接访问字体信息的方法

集成版处理器的架构设计保证了即使深度检测出现问题，也能回退到标准方法，确保系统的可靠性。
