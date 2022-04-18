import { useEffect, useState } from 'react';
import { eventsEmitter } from '../ServiceLocator';
import { EventId, IBaseEvent } from '../EventEmitter';

export const useEvent = <TPayload>(event: IBaseEvent<TPayload>) => {
    const [payload, setPayload] = useState<TPayload | null>(null);
    const [isSetted, setIsSetted] = useState<boolean>(false);

    useEffect(() => {
        return eventsEmitter.on(event.id, (payload) => {
            setPayload(payload)
            setIsSetted(true);
        });
    });

    return { payload, isSetted };
}
