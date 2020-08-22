import { CreepTask } from "./creepTasks"
import { CreepData } from "./interfaces"

class Scout extends CreepTask {
    protected role = "null";

    protected startLogic(creep: Creep): void {
        throw new Error("Method not implemented.");
    }


    protected runLogic(creep: Creep): void {
        throw new Error("Method not implemented.");
    }


    protected spawnCheck(): boolean {
        throw new Error("Method not implemented.");
    }


    protected destroyLogic(creep: CreepData): void {
        throw new Error("Method not implemented.");
    }

    
    getRole(): string {
        throw new Error("Method not implemented.");
    }

}