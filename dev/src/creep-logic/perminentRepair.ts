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

    private updateList(){
        
        const structs = this.manager.getMyStructs(this.perminent_struct_type, (s: AnyStructure) => {
            return s.hits < s.hitsMax
        })

        this.base.updateStructList(structs)
    }

    protected log(){

    }

    getRole() {
        return this.role
    }

    protected runLogic(creep: Creep) {
        this.updateList
        this.base.run(creep)
    }

    protected createLogic(): boolean {


        this.skeleton.work = 4
        this.skeleton.move = 2
        this.skeleton.carry = 4

        this.updateList()

        let was_created = this.base.create(this.cap, this.role, this.skeleton)
        this.num_of_creeps = this.base.getNumOfCreeps()

        return was_created
    }

}
