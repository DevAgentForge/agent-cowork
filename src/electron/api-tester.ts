import { log } from "./logger.js";

export interface ApiConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: string;
  responseTime?: number;
}

export async function testApiConnection(config: ApiConfig): Promise<TestResult> {
  const startTime = Date.now();
  log.info('Testing API connection', { baseURL: config.baseURL, model: config.model });

  try {
    // 验证配置
    if (!config.apiKey || !config.baseURL || !config.model) {
      return {
        success: false,
        message: "配置不完整",
        details: "请确保 API Key、Base URL 和 Model 都已填写"
      };
    }

    // 发送测试请求到 Anthropic API
    const response = await fetch(config.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      if (data.error) {
        return { success: false, message: "API 返回错误", details: data.error.message, responseTime };
      }
      return {
        success: true,
        message: "连接成功",
        details: "API 配置正确，可以正常使用",
        responseTime
      };
    } else {
      // 处理特定的 HTTP 状态码
      let message = "连接失败";
      let details = `HTTP ${response.status}: ${response.statusText}`;

      switch (response.status) {
        case 401:
          message = "认证失败";
          details = "API Key 不正确或已过期";
          break;
        case 403:
          message = "权限被拒绝";
          details = "API Key 没有访问此资源的权限";
          break;
        case 404:
          message = "API 地址不存在";
          details = "请检查 Base URL 是否正确";
          break;
        case 429:
          message = "请求过于频繁";
          details = "已达到速率限制，请稍后重试";
          break;
        case 500:
          message = "服务器错误";
          details = "Anthropic API 服务器出现问题，请稍后重试";
          break;
        case 503:
          message = "服务不可用";
          details = "Anthropic API 暂时不可用，请稍后重试";
          break;
      }

      return { success: false, message, details, responseTime };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    // 处理网络错误
    if (error.code === 'ENOTFOUND') {
      return {
        success: false,
        message: "无法解析服务器地址",
        details: "请检查 Base URL 是否正确",
        responseTime
      };
    }

    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        message: "连接被拒绝",
        details: "服务器拒绝连接，请检查 Base URL 和端口",
        responseTime
      };
    }

    if (error.code === 'ETIMEDOUT') {
      return {
        success: false,
        message: "连接超时",
        details: "服务器响应超时，请检查网络连接",
        responseTime
      };
    }

    // 其他错误
    log.error('API test error', error);
    return {
      success: false,
      message: "测试失败",
      details: error instanceof Error ? error.message : String(error),
      responseTime
    };
  }
}