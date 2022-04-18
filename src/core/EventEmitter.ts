export type Listener<TPayload> = (payload: TPayload) => void;
export type EventId = string | number | symbol;
export type Events = Map<EventId, Listener<any>[]>;

export interface IBaseEvent<TPayload = null> {
  id: EventId;
  payload: TPayload;
}

export class EventEmitter {
  private readonly events: Events = new Map();

  public on<TEvent extends IBaseEvent<any>>(
    id: TEvent['id'],
    listener: Listener<TEvent['payload']>
  ): () => void {
    if (!this.events.has(id)) {
      this.events.set(id, []);
    }

    this.events.get(id)!.push(listener);

    return () => this.off(id, listener);
  }

  public off(id: EventId, listener: Listener<any>): void {
    const listeners = this.events.get(id);

    if (!listeners) {
      return;
    }

    const idx: number = listeners.indexOf(listener);

    if (idx > -1) {
      listeners.splice(idx, 1);
    }
  }

  public emit<TEvent extends IBaseEvent<any>>(id: TEvent['id'], payload: TEvent['payload']): void {
    const listeners = this.events.get(id);

    if (!listeners) {
      return;
    }

    listeners.forEach(listener => listener(payload));
  }

  public once<TEvent extends IBaseEvent< any>>(id: TEvent['id'], listener: Listener<TEvent['payload']>): void {
    const unsubscribe: () => void = this.on<TEvent>(id, payload => {
      unsubscribe();
      listener.call(this, payload);
    });
  }
}
