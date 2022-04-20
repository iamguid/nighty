import { of, throwError, pipe, Observable, MonoTypeOperatorFunction } from "rxjs";
import { mergeMap, retryWhen, delay, delayWhen } from "rxjs/operators";

export const retryWithDelay = <T>(ms: number, count: number): MonoTypeOperatorFunction<T> => {
    return pipe(
        retryWhen(errors => {
            return errors.pipe(
                mergeMap((err, i) => i >= count ? throwError(() => err) : of(err)),
                delay(ms)
            )
        })
    )
}