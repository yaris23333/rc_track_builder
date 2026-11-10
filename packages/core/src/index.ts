/**
 * @rctrack/core 的公共出口。
 *
 * 约束：本包不得依赖 DOM、React、浏览器全局（除 btoa/atob 这类通用编码函数），
 * 以便 Web 编辑器、MCP server、CLI 与测试共用同一套领域逻辑。
 */
export * from './types';
export * from './geometry';
export * from './tiles';
export * from './ports';
export * from './validate';
export * from './share';
export * from './export/dxf';
