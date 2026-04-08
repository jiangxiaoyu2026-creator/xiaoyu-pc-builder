/**
 * 小鱼装机小程序 — 统一网络请求工具
 * 封装 Taro.request，统一处理 baseURL、token、错误提示
 */
import Taro from '@tarojs/taro'

// API 基础地址 —— 指向您已有的后端服务
const BASE_URL = 'https://www.diyxx.com/api'

// Token 存储 key
const TOKEN_KEY = 'xiaoyu_token'

/** 获取本地存储的 token */
export function getToken(): string {
  return Taro.getStorageSync(TOKEN_KEY) || ''
}

/** 保存 token 到本地 */
export function setToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token)
}

/** 清除 token */
export function clearToken() {
  Taro.removeStorageSync(TOKEN_KEY)
}

/** 通用请求参数 */
interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  showLoading?: boolean
  showError?: boolean
}

/** 通用 API 响应 */
interface ApiResponse<T = any> {
  data: T
  statusCode: number
}

/**
 * 统一请求方法
 * 自动拼接 baseURL、注入 token、处理错误
 */
export async function request<T = any>(options: RequestOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showLoading = false,
    showError = true
  } = options

  // 显示加载提示
  if (showLoading) {
    Taro.showLoading({ title: '加载中...', mask: true })
  }

  // 注入 Authorization header
  const token = getToken()
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }
  header['Content-Type'] = header['Content-Type'] || 'application/json'

  try {
    const response = await Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      timeout: 15000
    })

    if (showLoading) {
      Taro.hideLoading()
    }

    const { statusCode, data: resData } = response as ApiResponse<T>

    // 成功
    if (statusCode >= 200 && statusCode < 300) {
      return resData
    }

    // 401 未授权 —— token 过期
    if (statusCode === 401) {
      clearToken()
      Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
      return Promise.reject(new Error('未授权'))
    }

    // 其他错误
    if (showError) {
      const errMsg = (resData as any)?.detail || (resData as any)?.message || '请求失败'
      Taro.showToast({ title: errMsg, icon: 'none', duration: 2000 })
    }
    return Promise.reject(new Error(`HTTP ${statusCode}`))

  } catch (err: any) {
    if (showLoading) {
      Taro.hideLoading()
    }
    if (showError) {
      Taro.showToast({ title: '网络异常，请检查网络', icon: 'none', duration: 2000 })
    }
    return Promise.reject(err)
  }
}

/** 便捷方法 */
export const api = {
  get: <T = any>(url: string, data?: any) => request<T>({ url, method: 'GET', data }),
  post: <T = any>(url: string, data?: any) => request<T>({ url, method: 'POST', data }),
  put: <T = any>(url: string, data?: any) => request<T>({ url, method: 'PUT', data }),
  del: <T = any>(url: string, data?: any) => request<T>({ url, method: 'DELETE', data }),
}
