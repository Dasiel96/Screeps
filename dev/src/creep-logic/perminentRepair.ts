import { RepairBase } from "./repairBase"
import { CreepTask } from "./creepTasks"
import { CommonFunctions } from "../commonFuncs"
import { task_names } from "../enums"

export class PerminentStructRepair extends CreepTask {
    protected role = task_names[task_names.permStructRepair]

    private base = new RepairBase()
    private perminent_struct_type = [STRUCTURE_WALL, STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_STORAGE]

    private isPerminentStruct(struct_type: string) {
        let is_perm_struct = false
        for (let struct of this.perminent_struct_type) {
            if (struct_type === struct) {
                is_perm_struct = true
                break
            }
        }
        return is_perm_struct
    }

    protected log(){

    }

    getRole() {
        return this.role
    }

    protected runLogic(creep: Creep) {
        const filter: FilterOptions<FIND_STRUCTURES> = {
            filter: (structs) => {
                return this.isPerminentStruct(structs.structureType) && structs.hits < structs.hitsMax
            }
        }
        const structs = creep.room.find(FIND_STRUCTURES, filter)
        this.base.updateStructList(structs)


        this.base.run(creep)
    }

    protected createLogic(master: StructureSpawn): boolean {


        this.skeleton.work = 4
        this.skeleton.move = 2
        this.skeleton.carry = 4

        const filter: FilterOptions<FIND_STRUCTURES> = {
            filter: (structs) => {
                return this.isPerminentStruct(structs.structureType) && structs.hits < structs.hitsMax
            }
        }
        const structs = master.room.find(FIND_STRUCTURES, filter)
        this.base.updateStructList(structs)

        let was_created = this.base.create(master, this.cap, this.role, this.skeleton)

        if(was_created){
            
        }

        return was_created
    }

}
