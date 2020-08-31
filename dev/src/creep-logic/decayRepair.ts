import { RepairBase } from "./repairBase"
import { CreepTask } from "./creepTasks"
import { task_names } from "../enums"
import { CreepData } from "../interfaces"

export class DecayRepair extends CreepTask {

    private readonly base = new RepairBase()
    private readonly decay_struct_types = [STRUCTURE_ROAD, STRUCTURE_RAMPART, STRUCTURE_CONTAINER]

    protected role = task_names[task_names.decayStructRepair]

    /**
     * This task is used to maintain structures that decay over time
     */
    constructor() {
        super()
    }


    /**
     * sets the structures that the base class repairBase will use
     * to determine which structures to repair
     *
     * @author Daniel Schechtman
     * @return  {void}
     */
    private setStructureList(room_name: string): void {
        const structs = this.manager.getMyStructs(this.decay_struct_types, (s) => {
            return s.hits < s.hitsMax * .6
        })
        this.base.updateStructList(room_name, structs)
    }

    protected startLogic(creep: Creep): void {
        this.base.start(creep)
        this.base.setOnRepairHandler(() => {
            if (typeof this.manager.getRoom()?.name === "string") {
                this.setStructureList(this.manager.getRoom()!!.name)
            }
        })
    }

    protected runLogic(creep: Creep): void {
        if (!this.base.hasStructList(creep.room.name)) {
            this.setStructureList(creep.room.name)
        }        
        this.base.run(creep)
    }

    protected spawnCheck(): boolean {
        const spawn = this.manager.getMyStructs([STRUCTURE_SPAWN])
        let was_created = false

        if (spawn.length > 0) {
            const a_spawn = spawn[0] as StructureSpawn
            if (!this.base.hasStructList(a_spawn.room.name)) {
                this.setStructureList(a_spawn.room.name)
            }

            this.skeleton.work = 4
            this.skeleton.move = 8
            this.skeleton.carry = 4

            was_created = this.base.create(this.cap, this.role, a_spawn)
            this.num_of_creeps = this.base.getNumOfCreeps()

        }

        return was_created
    }

    protected destroyLogic(creep: CreepData): void {
        this.base.destroyLogic(creep)
    }

    getRole(): string {
        return this.role
    }
}
