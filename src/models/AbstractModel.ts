export abstract class AbstractModel<TModel> {
    public abstract clone: () => TModel;
}