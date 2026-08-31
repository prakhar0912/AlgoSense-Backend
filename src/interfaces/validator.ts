export interface IValidatorResult<T> {
  success: boolean
  data?: T
  errors?: {
    field: string
    message: string
  }[]
}


export interface IValidator<T> {
  validate(body: Partial<T>): IValidatorResult<T>
}
