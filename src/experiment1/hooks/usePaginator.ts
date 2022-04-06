import {BehaviorSubject, Observable} from "rxjs";
import {useEffect, useState} from "react";

export const usePaginator = <TValue, TError>(callback) => {
    const [value, setValue] = useState<TValue | null>(null);

    const loadNextPage = () => {

    }

    useEffect(() => {
        const subscription = subject$.subscribe({
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
