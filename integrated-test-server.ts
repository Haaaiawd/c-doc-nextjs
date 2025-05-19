/**
 * 集成测试服务器
 * 使用集成版DocxProcessor对DOCX文件进行完整分析与处理
 */
import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import DocxProcessor from './lib/docx-processor-integrated';

// 确保临时目录存在
const tempDir = path.join(os.tmpdir(), 'cdoc-integrated-test');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, tempDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });
const app = express();
const port = 3334; // 使用不同端口，避免与其他测试服务器冲突

// 首页 - 上传表单
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>集成版DocxProcessor测试</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        form { margin-bottom: 20px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
        .info-box { background: #e8f4fc; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .feature-list { background: #f0f8ff; padding: 10px 20px; border-radius: 5px; }
        .tab-container { margin-top: 20px; }
        .tab-buttons { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 15px; }
        .tab-button { 
          padding: 10px 15px; 
          background: #f1f1f1; 
          border: none; 
          border-bottom: 2px solid transparent;
          cursor: pointer;
          margin-right: 5px;
        }
        .tab-button.active {
          background: #fff;
          border-bottom: 2px solid #0066cc;
          font-weight: bold;
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
      </style>
      <script>
        function showTab(tabId) {
          // Hide all tab contents
          const tabContents = document.querySelectorAll('.tab-content');
          tabContents.forEach(content => {
            content.classList.remove('active');
          });
          
          // Deactivate all tab buttons
          const tabButtons = document.querySelectorAll('.tab-button');
          tabButtons.forEach(button => {
            button.classList.remove('active');
          });
          
          // Show the selected tab content and activate the button
          document.getElementById(tabId).classList.add('active');
          document.querySelector(\`[onclick="showTab('\${tabId}')"]\`).classList.add('active');
        }
      </script>
    </head>
    <body>
      <h1>集成版DocxProcessor测试工具</h1>
      <div class="info-box">
        <p>此工具使用集成版DocxProcessor，结合了增强版处理器的所有功能和深度字体检测能力。</p>
        <div class="feature-list">
          <h3>主要特点：</h3>
          <ul>
            <li>全面的字体检测 - 能够精确识别文档中的所有字体</li>
            <li>多层次检测策略 - 深度检测和标准检测相结合</li>
            <li>优先使用深度检测结果，提高字体识别的准确性</li>
            <li>保持向后兼容，支持所有原有功能</li>
            <li>提供专用的字体使用统计和直接访问字体信息的方法</li>
          </ul>
        </div>
      </div>

      <div class="tab-container">
        <div class="tab-buttons">
          <button class="tab-button active" onclick="showTab('tab-analyze')">文档分析</button>
          <button class="tab-button" onclick="showTab('tab-fonts')">字体统计</button>
          <button class="tab-button" onclick="showTab('tab-modify')">修改字体</button>
        </div>
        
        <div id="tab-analyze" class="tab-content active">
          <h2>文档分析</h2>
          <form action="/analyze" method="post" enctype="multipart/form-data">
            <p>选择一个 DOCX 文件进行分析:</p>
            <input type="file" name="docfile" accept=".docx" required>
            <button type="submit">分析文档</button>
          </form>
        </div>
        
        <div id="tab-fonts" class="tab-content">
          <h2>字体统计</h2>
          <form action="/font-usage" method="post" enctype="multipart/form-data">
            <p>获取文档中的全部字体使用情况:</p>
            <input type="file" name="docfile" accept=".docx" required>
            <button type="submit">字体统计</button>
          </form>
        </div>
        
        <div id="tab-modify" class="tab-content">
          <h2>修改字体</h2>
          <form action="/modify" method="post" enctype="multipart/form-data">
            <p>选择一个 DOCX 文件进行字体修改:</p>
            <input type="file" name="docfile" accept=".docx" required>
            
            <div style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
              <h3>标题设置</h3>
              <label>字体: <input type="text" name="titleFont" value="黑体"></label><br>
              <label>大小: <input type="number" name="titleSize" value="16"></label><br>
              <label>粗体: <input type="checkbox" name="titleBold" checked></label>
              <label>斜体: <input type="checkbox" name="titleItalic"></label>
              <label>下划线: <input type="checkbox" name="titleUnderline"></label><br>
              <label>对齐: 
                <select name="titleAlign">
                  <option value="center" selected>居中</option>
                  <option value="left">左对齐</option>
                  <option value="right">右对齐</option>
                </select>
              </label>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
              <h3>正文设置</h3>
              <label>字体: <input type="text" name="bodyFont" value="宋体"></label><br>
              <label>大小: <input type="number" name="bodySize" value="12"></label><br>
              <label>粗体: <input type="checkbox" name="bodyBold"></label>
              <label>斜体: <input type="checkbox" name="bodyItalic"></label>
              <label>下划线: <input type="checkbox" name="bodyUnderline"></label><br>
              <label>对齐: 
                <select name="bodyAlign">
                  <option value="left" selected>左对齐</option>
                  <option value="center">居中</option>
                  <option value="right">右对齐</option>
                  <option value="justify">两端对齐</option>
                </select>
              </label>
            </div>
            
            <button type="submit" style="margin-top: 15px;">修改并下载</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 处理文档分析
app.post('/analyze', upload.single('docfile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).send('未上传文件');
      return;
    }

    const filePath = req.file.path;
    console.log(`开始分析文档: ${filePath}`);
    
    // 使用集成版DocxProcessor分析文档
    const processor = new DocxProcessor();
    const analysisResult = await processor.analyzeDocument(filePath);
    
    // 生成HTML响应
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>文档分析结果</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2, h3 { color: #333; }
          .result-section { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .font-item { background: #fff; padding: 10px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid #0066cc; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; max-height: 400px; }
          .back-btn { margin-top: 20px; }
          .highlight { color: #0066cc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>文档分析结果</h1>
        
        <div class="result-section">
          <h2>文档基本信息</h2>
          <p><strong>标题:</strong> ${analysisResult.title?.text || '无标题'}</p>
          <p><strong>作者:</strong> ${analysisResult.author?.text || '未知'}</p>
          <p><strong>字数:</strong> ${analysisResult.wordCount || 0}</p>
          <p><strong>段落数:</strong> ${analysisResult.paragraphs.length}</p>
        </div>
        
        <div class="result-section">
          <h2>字体信息</h2>
          <p class="highlight">使用深度字体检测: ${analysisResult.deepFontAnalysis ? '是' : '否'}</p>
          
          <h3>检测到的字体样式:</h3>
          <div>
            ${analysisResult.bodyStyles.map((style, index) => `
              <div class="font-item">
                <p><strong>样式 ${index + 1}:</strong></p>
                <p>字体: ${style.name || '默认字体'}</p>
                <p>大小: ${style.size || '默认'}</p>
                <p>格式: ${style.isBold ? '粗体 ' : ''}${style.isItalic ? '斜体 ' : ''}${style.isUnderline ? '下划线 ' : ''}</p>
                <p>对齐: ${style.alignment || '默认'}</p>
              </div>
            `).join('')}
          </div>
        </div>
        
        ${analysisResult.deepFontAnalysis ? `
          <div class="result-section">
            <h2>深度字体分析结果</h2>
            <h3>默认字体设置:</h3>
            <p>中文字体 (East Asia): ${analysisResult.deepFontAnalysis.defaultFonts.eastAsia || '未设置'}</p>
            <p>西文字体 (ASCII): ${analysisResult.deepFontAnalysis.defaultFonts.ascii || '未设置'}</p>
            <p>高ANSI字体: ${analysisResult.deepFontAnalysis.defaultFonts.hAnsi || '未设置'}</p>
            
            <h3>字体使用统计:</h3>
            <div>
              ${Array.from(analysisResult.deepFontAnalysis.fonts.entries())
                .sort((a, b) => b[1].count - a[1].count)
                .map(([font, {count, samples}]) => `
                  <div class="font-item">
                    <p><strong>${font}</strong> (出现 ${count} 次)</p>
                    ${samples.length > 0 ? `
                      <p>样本文本:</p>
                      <ul>
                        ${samples.map(sample => `<li>${sample}</li>`).join('')}
                      </ul>
                    ` : '<p>无样本文本</p>'}
                  </div>
                `).join('')}
            </div>
          </div>
        ` : ''}
        
        <a href="/" class="back-btn">返回上传页面</a>
      </body>
      </html>
    `);
    
    // 删除临时文件
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn('删除临时文件失败:', err);
    }
  } catch (error) {
    console.error('处理失败:', error);
    res.status(500).send(`处理失败: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// 处理字体统计
app.post('/font-usage', upload.single('docfile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).send('未上传文件');
      return;
    }

    const filePath = req.file.path;
    console.log(`开始分析字体使用情况: ${filePath}`);
    
    // 使用集成版DocxProcessor分析字体使用情况
    const processor = new DocxProcessor();
    const fontUsage = await processor.getFontUsage(filePath);
    
    // 生成HTML响应
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>字体使用统计</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2, h3 { color: #333; }
          .result-section { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .font-item { background: #fff; padding: 10px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid #0066cc; }
          .back-btn { margin-top: 20px; }
          .chart-container { height: 300px; margin-bottom: 20px; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <h1>字体使用统计</h1>
        
        <div class="result-section">
          <h2>统计摘要</h2>
          <p><strong>检测到的字体总数:</strong> ${fontUsage.size}</p>
        </div>
        
        <div class="result-section">
          <h2>字体分布</h2>
          <div class="chart-container">
            <canvas id="fontChart"></canvas>
          </div>
          <script>
            const ctx = document.getElementById('fontChart').getContext('2d');
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: [${Array.from(fontUsage.keys()).map(font => `'${font}'`).join(', ')}],
                datasets: [{
                  label: '使用次数',
                  data: [${Array.from(fontUsage.values()).map(data => data.count).join(', ')}],
                  backgroundColor: 'rgba(54, 162, 235, 0.5)',
                  borderColor: 'rgba(54, 162, 235, 1)',
                  borderWidth: 1
                }]
              },
              options: {
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }
            });
          </script>
        </div>
        
        <div class="result-section">
          <h2>详细字体信息</h2>
          ${Array.from(fontUsage.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .map(([font, {count, samples}]) => `
              <div class="font-item">
                <h3>${font}</h3>
                <p><strong>出现次数:</strong> ${count}</p>
                <p><strong>样本文本:</strong></p>
                <ul>
                  ${samples.map(sample => `<li>${sample}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
        </div>
        
        <a href="/" class="back-btn">返回上传页面</a>
      </body>
      </html>
    `);
    
    // 删除临时文件
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn('删除临时文件失败:', err);
    }
  } catch (error) {
    console.error('处理失败:', error);
    res.status(500).send(`处理失败: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// 处理字体修改
app.post('/modify', upload.single('docfile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).send('未上传文件');
      return;
    }

    const filePath = req.file.path;
    const outputFileName = `modified_${Date.now()}_${req.file.originalname}`;
    const outputPath = path.join(tempDir, outputFileName);
    
    console.log(`开始修改文档字体: ${filePath} -> ${outputPath}`);
    
    // 获取表单数据
    const {
      titleFont, titleSize, titleBold, titleItalic, titleUnderline, titleAlign,
      bodyFont, bodySize, bodyBold, bodyItalic, bodyUnderline, bodyAlign
    } = req.body;
    
    // 创建样式选项对象
    const titleOptions = {
      targetFontName: titleFont,
      targetFontSize: parseInt(titleSize, 10),
      targetIsBold: !!titleBold,
      targetIsItalic: !!titleItalic,
      targetIsUnderline: !!titleUnderline,
      targetAlignment: titleAlign
    };
    
    const bodyOptions = {
      targetFontName: bodyFont,
      targetFontSize: parseInt(bodySize, 10),
      targetIsBold: !!bodyBold,
      targetIsItalic: !!bodyItalic,
      targetIsUnderline: !!bodyUnderline,
      targetAlignment: bodyAlign
    };
    
    // 使用集成版DocxProcessor修改字体
    const processor = new DocxProcessor();
    await processor.modifyFonts(filePath, outputPath, titleOptions, bodyOptions);
    
    // 设置文件下载
    res.download(outputPath, outputFileName, (err) => {
      if (err) {
        console.error('文件下载失败:', err);
      }
      
      // 删除临时文件
      try {
        fs.unlinkSync(filePath);
        fs.unlinkSync(outputPath);
      } catch (err) {
        console.warn('删除临时文件失败:', err);
      }
    });
  } catch (error) {
    console.error('处理失败:', error);
    res.status(500).send(`处理失败: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`集成版DocxProcessor测试服务器运行在 http://localhost:${port}`);
  console.log(`使用集成版DocxProcessor，结合深度字体检测与标准处理能力`);
});
