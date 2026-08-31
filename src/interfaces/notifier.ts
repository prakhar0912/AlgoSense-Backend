export interface INotifier {
  notify(notifierFunc: any, progress: number, total: number, status: string): Promise<void>
}
