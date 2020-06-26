import { RepairBase } from "./repairBase"
import { CreepTask } from "./creepTasks"
import { task_names } from "../enums"

export class DecayRepair extends CreepTask {
    protected role = task_names[task_names.decayStructRepair]

    private base = new RepairBase()
    private decay_struct_types = [STRUCTURE_ROAD, STRUCTURE_RAMPART, STRUCTURE_CONTAINER]

    private isDecayingStruct(struct_type: string): boolean {
        let is_decaying_struct = false
        for (let i = 0; i < this.decay_struct_types.length; i++) {
            if (struct_type === this.decay_struct_types[i]) {
                is_decaying_struct = true
                break
            }
        }

        return is_decaying_struct
    }

    protected log(){

    }

    getRole() {
        return this.role
    }

    protected runLogic(creep: Creep) {
        const structs = creep.room.find(FIND_STRUCTURES, {
            filter: (structs) => {
                return this.isDecayingStruct(structs.structureType) && structs.hits < structs.hitsMax
            }
        })
        this.base.updateStructList(structs)


        this.base.run(creep)
    }

    protected createLogic(master: StructureSpawn) {

        this.skeleton.work = 4
        this.skeleton.move = 8
        this.skeleton.carry = 4

        const structs = master.room.find(FIND_STRUCTURES, {
            filter: (structs) => {
                return this.isDecayingStruct(structs.structureType) && structs.hits < structs.hitsMax
            }
        })
        this.base.updateStructList(structs)

        const was_created = this.base.create(master, this.cap, this.role, this.skeleton)

        return was_created
    }
}
