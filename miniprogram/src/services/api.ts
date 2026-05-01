/**
 * 小鱼装机小程序 — 业务 API 接口
 * 调用后端已有的 API 端点（已对齐生产环境数据结构）
 */
import { api } from './request'

/* ============================================
   产品/硬件 相关
   ============================================ */

/** 获取产品列表（公开接口，只返回 active 产品） */
export function getProducts(params?: {
  category?: string
  brand?: string
  search?: string
  is_recommended?: boolean
  page?: number
  page_size?: number
}) {
  return api.get('/products/', params)
}

/** 获取单个产品详情 */
export function getProductDetail(id: string) {
  return api.get(`/products/${id}`)
}

/** 批量获取产品详情（用于配置单展示） */
export function getProductsBatch(ids: string[]) {
  return api.get('/products/batch', { ids: ids.join(',') })
}

/** 获取品牌列表 */
export function getBrands(category?: string) {
  return api.get('/products/brands', category ? { category } : undefined)
}

/* ============================================
   配置单 相关
   ============================================ */

/** 获取配置单列表 */
export function getConfigs(params?: {
  page?: number
  page_size?: number
  min_price?: number
  max_price?: number
  tag?: string
  search?: string
  sort_by?: string      // 'recommend' | 'hot' | 'new'
  is_recommended?: boolean
}) {
  return api.get('/configs/', params)
}

/** 获取单个配置单详情 */
export function getConfigDetail(id: string) {
  return api.get(`/configs/${id}`)
}

/** 创建/保存配置单 */
export function createConfig(data: {
  title: string
  items: Record<string, string>
  totalPrice?: number
  tags?: string[]
  description?: string
}) {
  return api.post('/configs', data)
}

/** 更新配置单 */
export function updateConfig(id: string, data: any) {
  return api.put(`/configs/${id}`, data)
}

/** 切换点赞 */
export function toggleConfigLike(id: string) {
  return api.post(`/configs/${id}/like`)
}

/** 获取评论列表 */
export function getConfigComments(id: string) {
  return api.get(`/configs/${id}/comments`)
}

/** 提交评论 */
export function addConfigComment(id: string, content: string) {
  return api.post(`/configs/${id}/comments`, { content })
}

/* ============================================
   回收报价 相关
   ============================================ */

/** 获取回收分类列表 */
export function getRecyclingCategories() {
  return api.get('/recycling-prices/categories')
}

/** 客户端回收估价搜索（必须提供 keyword） */
export function getRecyclingEstimate(params: {
  keyword: string
  category?: string
}) {
  return api.get('/recycling-prices/estimate', params)
}

/** 获取二手现货商城列表 */
export function getUsedItems(params?: {
  status?: string
  page?: number
  page_size?: number
  search?: string
}) {
  return api.get('/used', params)
}

/* ============================================
   文章/资讯 相关
   ============================================ */

/** 获取文章列表 */
export function getArticles(params?: {
  page?: number
  page_size?: number
}) {
  return api.get('/articles/', params)
}

/** 获取文章详情 */
export function getArticleDetail(id: string) {
  return api.get(`/articles/${id}`)
}

/* ============================================
   AI 聊天 相关
   ============================================ */

/** 发送 AI 装机咨询 */
export function sendChatMessage(data: {
  message: string
  conversation_id?: string
}) {
  return api.post('/chat/send', data)
}

/* ============================================
   用户/认证 相关
   ============================================ */

/** 微信登录 */
export function wxLogin(data: {
  code: string
  userInfo?: any
}) {
  return api.post('/auth/wechat-login', data)
}

/** 获取当前用户信息 */
export function getUserInfo() {
  return api.get('/auth/me')
}

/* ============================================
   统计 相关
   ============================================ */

/** 获取硬件行情统计 */
export function getMarketStats(params?: {
  category?: string
  days?: number
}) {
  return api.get('/stats/market-overview', params)
}

/* ============================================
   全局配置 相关
   ============================================ */

/** 获取全局配置 (包括定价策略) */
export function getSettings() {
  return api.get('/settings')
}
