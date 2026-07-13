export default interface IRequest {
  userId?: string
  body?: unknown
  params?: Record<string, string | number | boolean>
}
