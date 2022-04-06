import { AbstractModel } from "./AbstractModel";

export interface ITodoModel {
    id: string;
    title: string;
    description: string;
}

export class TodoModel extends AbstractModel<ITodoModel> implements ITodoModel {
    public id: string;
    public title: string;
    public description: string;

    constructor({ id, title, description }: ITodoModel) {
        super();

        this.id = id;
        this.title = title;
        this.description = description;
    }

    public clone = () => {
        return new TodoModel({
            id: this.id,
            title: this.title,
            description: this.description
        });
    };
}
