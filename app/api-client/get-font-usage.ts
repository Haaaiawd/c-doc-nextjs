// 获取文档的字体使用情况
export async function getFontUsage(fileId: string) {
  try {
    const formData = new FormData();
    formData.append('fileId', fileId);
    
    const response = await fetch('/api/font-usage', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '获取字体使用情况失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取字体使用情况出错:', error);
    throw error;
  }
}
