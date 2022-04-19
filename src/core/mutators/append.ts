export const append = <TItem>(target: TItem[], appended: TItem | TItem[]) => {
    if (Array.isArray(appended)) {
        return [...target, ...appended];
    } else {
        return [...target, appended];
    }
}
