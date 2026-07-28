export interface IValidatorResult<T> {
    success: boolean;
    data?: T;
    errors?: {
        field: string;
        message: string;
    }[];
}
export default interface IValidator<T> {
    validate(body: Partial<T>): IValidatorResult<T>;
}
//# sourceMappingURL=validator.d.ts.map