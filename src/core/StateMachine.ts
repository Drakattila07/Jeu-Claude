export class StateMachine<TState extends string> {
  constructor(public state: TState) {}
  transition(from: TState, to: TState): boolean {
    if (this.state !== from) return false;
    this.state = to;
    return true;
  }
}
