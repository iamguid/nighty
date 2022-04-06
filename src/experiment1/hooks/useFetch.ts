import {Observable} from "rxjs";
import {useEffect, useState} from "react";

export const useFetch = <TValue, TError>(observable$: Observable<TValue>) => {
    const [value, setValue] = useState<TValue | null>(null);
    const [error, setError] = useState<TError | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const subscription = observable$.subscribe({
            next: (nextValue) => {
                setValue(nextValue);
                setIsLoading(false);
            },
            error: (err) => {
                setError(err);
                setIsLoading(false);
            }
        });

        return subscription.unsubscribe;
    });

    return { value, error, isLoading };
}
