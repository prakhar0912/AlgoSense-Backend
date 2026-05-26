export default interface IRequest {
    token?: string
    body?: unknown
    params?: Record<string, string | number | boolean>
}