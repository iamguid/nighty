export const apply = <TItem>(target: TItem[], updated: TItem | TItem[], idGetter: (item: TItem) => string): TItem[] => {
    if (Array.isArray(updated)) {
        return target.map(i => {
            const targetId = idGetter(i);

            for (const j of updated) {
                const updatedId = idGetter(j);

                if (targetId === updatedId) {
                    return j;
                }
            }

            return i;
        })
    } else {
        return target.map(i => idGetter(i) === idGetter(updated) ? updated : i)
    }
}
