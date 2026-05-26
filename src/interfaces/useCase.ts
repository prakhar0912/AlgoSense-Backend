export default interface IUseCase<T> {
    call(...args: unknown[]): Promise<T>
}