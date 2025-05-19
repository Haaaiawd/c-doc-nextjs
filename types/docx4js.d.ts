declare module 'docx4js' {
  export function load(filePath: string): Promise<DocxDocument>;
    export interface DocxNode {
    tag?: string;
    style?: {
      align?: string;
      font?: string;
      size?: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: string;
    };
    children?: DocxNode[];
    val?: string | Record<string, unknown>; // 可以是字符串或对象
    eastAsia?: string; // 中文字体属性
    ascii?: string;   // 西文字体属性
    hAnsi?: string;   // 高ANSI字体属性
    cs?: string;      // 复杂脚本字体属性
    [key: string]: string | boolean | number | object | undefined; // 支持任意字体相关属性，使用更具体的类型
  }
  
  export interface DocxDocument {
    parse(callback: (node: DocxNode) => boolean): Promise<void>;
  }
}
