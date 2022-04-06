import {Observable} from "rxjs";
import {useEffect, useState} from "react";

export const useStream = <TValue, TError>(observable$: Observable<TValue>) => {
    const [value, setValue] = useState<TValue | null>(null);
    const [error, setError] = useState<TError | null>(null);

    useEffect(() => {
        const subscription = observable$.subscribe({
            next: (nextValue) => {
                setValue(nextValue);
            },
            error: (err) => {
                setError(err);
            }
        });

        return subscription.unsubscribe;
    });

    return { value, error };
}
