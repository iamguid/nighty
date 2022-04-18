import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

export const useObservable = <TValue>(observable$: Observable<TValue>) => {
    const [value, setValue] = useState<TValue | null>(null);

    useEffect(() => {
        const subscription = observable$.subscribe({
            next: (nextValue) => {
                setValue(nextValue);
            }
        });

        return subscription.unsubscribe;
    });

    return { value };
}
