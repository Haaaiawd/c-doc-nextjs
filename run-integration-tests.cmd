@echo off
echo 运行集成版DocxProcessor功能测试...
echo 请确保test-files目录中包含测试用的DOCX文件

if not exist test-files mkdir test-files
if not exist test-results mkdir test-results

echo 测试将开始，结果将输出到控制台...
npx ts-node test-integrated-processor.ts

echo.
echo 测试完成！
pause
