import { RepairBase } from "./repairBase"
import { CreepTask } from "./creepTasks"
import { CommonFunctions } from "../commonFuncs"
import { task_names } from "../enums"
import { CreepData } from "../interfaces"

export class PerminentStructRepair extends CreepTask {
    protected role = task_names[task_names.permStructRepair]

    private base = new RepairBase()
    private perminent_struct_type = [STRUCTURE_WALL, STRUCTURE_TOWER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_STORAGE]

    /**
     * sets the list of structures the base class RepairBase will use
     * to determine what structures to repair
     *
     * @return  {void} 
     * @author Daniel Schechtman
     */
    private updateList(room_name: string): void {

        const structs = this.manager.getMyStructs(this.perminent_struct_type, (s: AnyStructure) => {
            return s.hits < s.hitsMax
        })

        this.base.updateStructList(room_name, structs)
    }

    protected startLogic(creep: Creep) {
        this.base.start(creep)
    }

    protected runLogic(creep: Creep) {
        if (!this.base.hasStructList(creep.room.name)) {
            this.updateList(creep.room.name)
        }
        this.base.run(creep)
    }

    protected spawnCheck(): boolean {
        const spawn = this.manager.getMyStructs([STRUCTURE_SPAWN])
        let was_created = false
        if (spawn.length > 0) {
            const a_spawn = spawn[0] as StructureSpawn

            if (!this.base.hasStructList(a_spawn.room.name)) {
                this.updateList(a_spawn.room.name)
            }

            this.skeleton.work = 4
            this.skeleton.move = 2
            this.skeleton.carry = 4

            was_created = this.base.create(this.cap, this.role, a_spawn)
            this.num_of_creeps = this.base.getNumOfCreeps()
        }

        return was_created
    }

    protected destroyLogic(creep: CreepData): void {
        this.base.destroyLogic(creep)
    }

    getRole() {
        return this.role
    }

}
