import { CreepTask } from "./creepTasks"
import { CreepData } from "./interfaces"
import { task_names, flag_names } from "./enums"
import { CommonFunctions } from "./commonFuncs"
import { close, link } from "fs"


export class EnergyDistributor extends CreepTask {
    private readonly production_types = [
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION
    ]

    private readonly store_types = [
        STRUCTURE_LINK,
        STRUCTURE_STORAGE
    ]

    private readonly containers_id = new Map<string, Array<string>>()

    protected role = task_names[task_names.energy_distributor]
    protected cap = 2

    protected startLogic(creep: Creep): void {
        const energy_containers = this.manager.getMyStructs([STRUCTURE_CONTAINER])
        const num_of_distributors = this.manager.getMyCreeps(this.role).length

        if (num_of_distributors > this.cap) {
            creep.suicide()
        }
        this.containers_id.set(creep.room.name, new Array())

        for (const container of energy_containers) {
            this.containers_id.get(creep.room.name)!!.push(container.id)
        }
    }

    protected runLogic(creep: Creep): void {
        CommonFunctions.changeWorkingState(creep)

        if (!creep.memory.working) {
            let container_to_draw: StructureContainer | undefined = undefined

            for (const id of this.containers_id.get(creep.room.name)!!) {
                const container = Game.getObjectById<StructureContainer>(id)
                if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    container_to_draw = container
                }
            }

            if (container_to_draw) {
                const status = creep.withdraw(container_to_draw, RESOURCE_ENERGY)

                if (status === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container_to_draw, CommonFunctions.pathOptions())
                }
            }
        }
        else {
            const callback = (s: AnyStructure): boolean => {
                let needs_energy = false

                try {
                    needs_energy = (s as AnyStoreStructure).store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }
                catch (_e) {
                    needs_energy = false
                }

                return needs_energy
            }

            const storeCallBack = (s: AnyStructure): boolean => {
                let needs_energy = callback(s)

                if (needs_energy && s.structureType === STRUCTURE_LINK) {
                    const supply_flag_name = `${flag_names[flag_names.supply_link]} ${creep.room.name}`
                    const supply_flag = Game.flags[supply_flag_name]

                    if (supply_flag) {
                        const close_structs = supply_flag.pos.findInRange(FIND_STRUCTURES, 2)
                        let link_id = ""

                        for (const struct of close_structs) {
                            if (struct.structureType === STRUCTURE_LINK) {
                                link_id = struct.id 
                                break
                            }
                        }

                        needs_energy = link_id.length > 0 && s.id === link_id
                    }
                }

                return needs_energy
            }

            const store_structs = this.manager.getMyStructs(this.store_types, storeCallBack)
            const production_structs = this.manager.getMyStructs(this.production_types, callback)
            let struct: AnyStructure | null = null

            if (store_structs.length > 0) {
                struct = store_structs[0]
            }
            else if (production_structs.length > 0) {
                struct = production_structs[0]
            }

            if (struct) {
                const status = creep.transfer(struct, RESOURCE_ENERGY)

                if (status === ERR_NOT_IN_RANGE) {
                    creep.moveTo(struct, CommonFunctions.pathOptions())
                }
            }
            
        }
    }

    protected spawnCheck(): boolean {
        const num_of_containers = this.manager.getMyStructs([STRUCTURE_CONTAINER]).length
        const num_of_distributors = this.manager.getMyCreeps(this.role).length
        const should_spawn = num_of_containers > 0 && num_of_distributors < this.cap

        this.num_of_creeps = num_of_distributors

        this.skeleton.carry = 4
        this.skeleton.move = this.skeleton.carry
        
        const cost_to_create = CommonFunctions.calcEnergyCostForBody(this.skeleton)
        const total_energy = this.manager.getRoom()?.energyAvailable

        if (num_of_distributors === 0 && total_energy && total_energy < cost_to_create) {
            this.skeleton.carry = 3
            this.skeleton.move = 3
        }


       
        return should_spawn
    }

    protected destroyLogic(creep: CreepData): void {
        
    }

    getRole(): string {
        return this.role
    }

}