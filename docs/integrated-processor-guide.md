# 集成版DocxProcessor使用指南

本文档提供了集成版DocxProcessor的使用方法和最佳实践。集成版处理器结合了增强版处理器的全部功能和深度字体检测能力，为应用程序提供全面且准确的DOCX处理方案。

## 基本用法

### 引入处理器

```typescript
import DocxProcessor from '@/lib/docx-processor-integrated';
```

### 创建处理器实例

```typescript
const processor = new DocxProcessor();
```

## 文档分析

### 基本分析（包含深度字体检测）

默认情况下，文档分析会启用深度字体检测：

```typescript
const analysisResult = await processor.analyzeDocument('path/to/document.docx');
```

### 禁用深度字体检测

如果出于性能考虑需要禁用深度字体检测：

```typescript
const analysisResult = await processor.analyzeDocument('path/to/document.docx', false);
```

### 分析结果结构

分析结果包含文档的各种信息，深度字体检测结果保存在`deepFontAnalysis`属性中：

```typescript
interface DocxAnalysisResult {
  title?: {
    text: string;
    exists: boolean;
    styles: FontInfo[];
  };
  author?: {
    text: string;
    exists: boolean;
    styles: FontInfo[];
  };
  bodyText?: string;
  bodyStyles: FontInfo[];
  paragraphs: {
    text: string;
    index: number;
    isTitle?: boolean;
    isAuthor?: boolean;
    styles?: FontInfo[];
  }[];
  wordCount?: number;
  images?: {
    name: string;
    base64Data?: string;
    paragraphIndex?: number;
  }[];
  deepFontAnalysis?: DeepFontAnalysisResult;
}
```

## 字体使用情况统计

### 获取字体使用情况

集成版处理器提供了专门的方法用于获取文档中的字体使用情况：

```typescript
const fontUsage = await processor.getFontUsage('path/to/document.docx');
```

返回结果是一个Map，其中键是字体名称，值是包含使用次数和样本文本的对象：

```typescript
Map<string, { count: number, samples: string[] }>
```

## 文档字体修改

### 修改文档字体

```typescript
await processor.modifyFonts(
  inputPath, 
  outputPath, 
  titleOptions, 
  bodyOptions, 
  authorOptions
);
```

### 字体修改选项

```typescript
interface FontModificationOptions {
  targetFontName?: string;
  targetFontSize?: number;
  targetIsBold?: boolean;
  targetIsItalic?: boolean;
  targetIsUnderline?: boolean;
  targetColor?: string;
  targetAlignment?: 'left' | 'center' | 'right' | 'justify';
  addPrefix?: string;
  addSuffix?: string;
  modificationRules?: {
    originalStyleKey: string;
    targetFontName?: string;
    targetFontSize?: number;
    targetIsBold?: boolean;
    targetIsItalic?: boolean;
    targetIsUnderline?: boolean;
    targetColor?: string;
    targetAlignment?: 'left' | 'center' | 'right' | 'justify';
  }[];
}
```

## 最佳实践

1. **启用深度字体检测**：默认启用深度字体检测，以获得最准确的字体信息。
2. **处理大型文档**：对于非常大的文档，可以考虑禁用深度字体检测以提高性能。
3. **错误处理**：集成版处理器有内置的错误处理机制，确保即使深度检测失败，也会回退到常规方法。
4. **多样式处理**：使用`modificationRules`实现更精细的样式控制，可以针对不同的原始样式应用不同的修改规则。

## 示例：完整处理流程

```typescript
import DocxProcessor from '@/lib/docx-processor-integrated';

async function processDocument(inputPath, outputPath) {
  try {
    // 创建处理器实例
    const processor = new DocxProcessor();
    
    // 分析文档
    const analysisResult = await processor.analyzeDocument(inputPath);
    console.log(`文档标题: ${analysisResult.title?.text}`);
    console.log(`检测到的字体数: ${analysisResult.deepFontAnalysis?.fonts.size}`);
    
    // 获取字体使用情况
    const fontUsage = await processor.getFontUsage(inputPath);
    console.log(`最常用的字体: ${Array.from(fontUsage.keys())[0]}`);
    
    // 修改文档字体
    const titleOptions = {
      targetFontName: '黑体',
      targetFontSize: 16,
      targetIsBold: true,
      targetAlignment: 'center'
    };
    
    const bodyOptions = {
      targetFontName: '宋体',
      targetFontSize: 12,
      targetIsBold: false,
      targetAlignment: 'left'
    };
    
    await processor.modifyFonts(inputPath, outputPath, titleOptions, bodyOptions);
    console.log(`文档处理完成，已保存到: ${outputPath}`);
    
  } catch (error) {
    console.error('处理文档时出错:', error);
  }
}
```

## 调试与问题排查

- 如果深度字体检测没有返回预期结果，检查`deepFontAnalysis`属性是否存在。
- 如果需要调试，可以使用`console.log()`输出`deepFontAnalysis.fonts`和`deepFontAnalysis.paragraphFonts`的内容。
- 如果遇到性能问题，考虑禁用深度字体检测或优化处理流程。
