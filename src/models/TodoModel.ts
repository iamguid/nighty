import { AbstractModel } from "./AbstractModel";

export interface ITodoModel {
    id?: string;
    title: string;
    description: string;
    done: boolean;
}

export class TodoModel extends AbstractModel<ITodoModel> implements ITodoModel {
    public id?: string;
    public title: string;
    public description: string;
    public done: boolean;

    constructor({ id, title, description, done }: ITodoModel) {
        super();

        this.id = id;
        this.title = title;
        this.description = description;
        this.done = done;
    }

    public clone = () => {
        return new TodoModel({
            id: this.id,
            title: this.title,
            description: this.description,
            done: this.done,
        });
    };
}
