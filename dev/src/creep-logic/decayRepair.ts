import { RepairBase } from "./repairBase"
import { CreepTask } from "./creepTasks"
import { task_names } from "../enums"

export class DecayRepair extends CreepTask {
    private base = new RepairBase()
    private decay_struct_types = [STRUCTURE_ROAD, STRUCTURE_RAMPART, STRUCTURE_CONTAINER]

    protected role = task_names[task_names.decayStructRepair]

    /**
     * This task is used to maintain structures that decay over time
     */
    constructor() {
        super()
    }

    private updateList() {
        const structs = this.manager.getMyStructs(this.decay_struct_types, (s: AnyStructure) => {
            return s.hits < s.hitsMax
        })
        this.base.updateStructList(structs)
    }

    protected runLogic(creep: Creep) {
        this.updateList

        this.base.run(creep)
    }

    protected createLogic() {

        this.skeleton.work = 4
        this.skeleton.move = 8
        this.skeleton.carry = 4

        this.updateList()

        const was_created = this.base.create(this.cap, this.role, this.skeleton)
        this.num_of_creeps = this.base.getNumOfCreeps()

        return was_created
    }

    getRole() {
        return this.role
    }
}
