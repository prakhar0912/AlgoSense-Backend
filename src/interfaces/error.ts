export default interface IError {
    name: string
    message: string
    httpStatusCode: number
    details?: any
}