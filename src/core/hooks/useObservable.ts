import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

export const useObservable = <TValue>(observable$: Observable<TValue>) => {
    const [value, setValue] = useState<TValue | null>(null);
    const [isSetted, setIsSetted] = useState<boolean>(false);

    useEffect(() => {
        const subscription = observable$.subscribe({
            next: (nextValue) => {
                setValue(nextValue);
                setIsSetted(true);
            }
        });

        return subscription.unsubscribe;
    });

    return { value, isSetted };
}
