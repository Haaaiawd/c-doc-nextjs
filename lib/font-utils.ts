// filepath: g:\PROJECTALL\c-doc-nextjs\lib\font-utils.ts
/**
 * 中文字号与磅值（pt）的映射表
 * 用于将中文传统字号转换为文档处理库需要的磅值
 */
export const chineseFontSizeMap: Record<string, number> = {
  '初号': 42,
  '小初': 36,
  '一号': 26,
  '小一': 24,
  '二号': 22,
  '小二': 18,
  '三号': 16,
  '小三': 15,
  '四号': 14,
  '小四': 12,
  '五号': 10.5,
  '小五': 9,
  '六号': 7.5,
  '小六': 6.5,
  '七号': 5.5,
  '八号': 5
};

/**
 * 常用中文字体名称列表 
 */
export const commonChineseFonts = [
  '宋体',
  '黑体',
  '微软雅黑',
  '楷体',
  '仿宋',
  '华文宋体',
  '华文楷体',
  '华文隶书',
  '幼圆',
  '方正姚体',
  '方正舒体',
  '新宋体',
  '华文细黑',
  '华文中宋'
];

/**
 * 将中文字号转换为磅值
 * @param chineseFontSize 中文字号字符串，如"小四"
 * @returns 对应的磅值，如果不是有效的中文字号则返回原值（可能是数字）
 */
export function convertChineseFontSize(chineseFontSize: string): number | undefined {
  // 检查是否是中文字号
  if (chineseFontSize in chineseFontSizeMap) {
    return chineseFontSizeMap[chineseFontSize];
  }
  
  // 尝试解析为数字
  const numericSize = parseFloat(chineseFontSize);
  if (!isNaN(numericSize)) {
    return numericSize;
  }
  
  return undefined;
}

/**
 * 获取所有中文字号选项，用于下拉选择
 * @returns 格式化后的字号选项数组
 */
export function getChineseFontSizeOptions(): {value: string, label: string}[] {
  return Object.entries(chineseFontSizeMap).map(([name, size]) => ({
    value: name,
    label: `${name} (${size}磅)`
  }));
}
