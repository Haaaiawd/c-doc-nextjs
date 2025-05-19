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
 * @param chineseFontSize 中文字号字符串，如"小四"，或者直接是数字
 * @returns 对应的磅值，如果不是有效的中文字号则返回原值（可能是数字）
 */
export function convertChineseFontSize(chineseFontSize: string | number): number | undefined {
  // 如果已经是数字，直接返回
  if (typeof chineseFontSize === 'number') {
    return chineseFontSize;
  }
  
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

/**
 * 根据磅值查找最接近的中文字号名称
 * @param pointSize 磅值大小
 * @param tolerance 容差值，默认为0.5磅
 * @returns 匹配的中文字号名称，如果没有匹配则返回undefined
 */
export function getChineseFontSizeName(pointSize: number, tolerance: number = 0.5): string | undefined {
  // 创建包含名称和差值的对象数组
  const differences = Object.entries(chineseFontSizeMap).map(([name, size]) => ({
    name,
    diff: Math.abs(size - pointSize)
  }));
  
  // 找到差值最小且在容差范围内的中文字号
  const closestMatch = differences.sort((a, b) => a.diff - b.diff)[0];
  
  if (closestMatch && closestMatch.diff <= tolerance) {
    return closestMatch.name;
  }
  
  return undefined;
}

/**
 * 将数字磅值转换为带中文字号名称的显示格式
 * @param pointSize 磅值大小
 * @returns 格式化后的字符串，如"12磅 (小四)"或"13.5磅"
 */
export function formatFontSizeWithChineseName(pointSize: number | undefined): string {
  if (pointSize === undefined) {
    return '默认';
  }
  
  const chineseName = getChineseFontSizeName(pointSize);
  if (chineseName) {
    return `${pointSize}磅 (${chineseName})`;
  }
  
  return `${pointSize}磅`;
}
