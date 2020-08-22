import { CreepTask } from "./creepTasks"
import { CommonFunctions } from "./commonFuncs"
import { flag_names, task_names } from "./enums"
import { CreepData } from "./interfaces"

export class TowerSupplier extends CreepTask {
    protected role = task_names[task_names.supplier]

    private creep_tower_tracker = new Map<string, string>()

    private creeps_near_link = new Map<string, boolean>()

    private assignTower(creep: Creep) {
        const struct_type: StructureConstant[] = [STRUCTURE_TOWER]
        const towers = this.manager.getMyStructs(struct_type)
        let found_tower = false

        for (const tower of towers) {
            if (!this.creep_tower_tracker.has(tower.id)) {
                creep.memory.game_object_id = tower.id
                this.creep_tower_tracker.set(tower.id, creep.name)
                found_tower = true
                break
            }
        }

        if (!found_tower){
            creep.suicide()
        }
    }

    protected startLogic(creep: Creep) {
        
    }

    protected runLogic(creep: Creep) {
        const state = CommonFunctions.changeWorkingState(creep)
        const source_ref = "source"


        if (state !== 1 && !creep.memory[source_ref]) {
            creep.memory[source_ref] = creep.pos.findClosestByPath(FIND_SOURCES)?.id
        }
        else if (state === 1) {
            creep.memory[source_ref] = null
        }

        if (!creep.memory.game_object_id) {
            this.assignTower(creep)
        }
        else if (!this.creep_tower_tracker.has(creep.memory.game_object_id)) {
            this.creep_tower_tracker.set(creep.memory.game_object_id, creep.name)
        }

        const should_ignore_creep = this.manager.isUnderAttack()
        const path_opts = CommonFunctions.pathOptions()

        if (!creep.memory.working) {
            this.creeps_near_link.set(creep.id, false)
            const tower = Game.getObjectById<StructureTower>(creep.memory.game_object_id)
            if (tower) {
                const structs_in_range = tower.pos.findInRange(FIND_MY_STRUCTURES, 3)
                let source: Source | StructureLink | StructureStorage = Game.getObjectById(creep.memory[source_ref]) as Source

                for (const structs of structs_in_range) {
                    if (structs.structureType === STRUCTURE_LINK) {
                        source = structs
                        this.creeps_near_link.set(creep.id, true)
                        break
                    }
                }

                let status
                if (!this.creeps_near_link.get(creep.id)) {
                    const struct_type: StructureConstant[] = [STRUCTURE_STORAGE]
                    const storeage = this.manager.getMyStructs(struct_type)
                    let store: StructureStorage | null = null

                    if (storeage.length > 0) {
                        store = storeage[0] as StructureStorage
                    }

                    if (store) {
                        source = store
                        status = creep.withdraw(source as StructureStorage, RESOURCE_ENERGY)
                    }
                    else {
                        status = creep.harvest(source as Source)
                    }
                }
                else {
                    status = creep.withdraw(source as StructureLink, RESOURCE_ENERGY)
                }


                if (status === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, CommonFunctions.pathOptions())
                }
                else if (this.creeps_near_link.get(creep.id) && status === OK) {
                    creep.memory.working = true
                }
            }
        }
        else {
            const tower = Game.getObjectById(creep.memory.game_object_id) as StructureTower

            if (tower === null){
                creep.suicide()
            }

            if (tower !== null && tower.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                const transfer_status = creep.transfer(tower, RESOURCE_ENERGY)
                if (transfer_status === ERR_NOT_IN_RANGE) {
                    creep.moveTo(tower, path_opts)
                }
            }
            else if (!this.creeps_near_link.get(creep.id)) {
                const flag = CommonFunctions.getFlagName(flag_names.supplier_wait, creep.room)
                creep.moveTo(Game.flags[flag])
            }
        }

        if (creep.ticksToLive!! === 1) {
            this.creeps_near_link.delete(creep.id)
        }
    }

    protected spawnCheck(): boolean {
        const tower_type: StructureConstant[] = [STRUCTURE_TOWER]
        const num_of_tower_suppliers = this.manager.getMyCreeps(this.role).length
        const num_of_towers = this.manager.getMyStructs(tower_type).length

        this.cap = num_of_towers
        this.num_of_creeps = num_of_tower_suppliers

        const should_spawn = num_of_tower_suppliers < num_of_towers

        const num_of_towers_with_links = this.manager.getMyStructs(tower_type, (tower: AnyStructure) => {
            let link_is_near = false
            const structs_nearby = (tower as StructureTower).pos.findInRange(FIND_MY_STRUCTURES, 3)
            for (const structs of structs_nearby) {
                if (structs.structureType === STRUCTURE_LINK) {
                    link_is_near = true
                    break
                }
            }
            return link_is_near
        }).length

        if (num_of_towers_with_links < num_of_towers) {
            this.skeleton.work = 4
            this.skeleton.carry = 4
            this.skeleton.move = 2
        }
        else {
            this.skeleton.work = 0
            this.skeleton.carry = 4
            this.skeleton.move = 1
        }


        return should_spawn
    }

    protected destroyLogic(creep: CreepData) {
        console.log(`${creep.name} has died`)
        let id_to_remove = ""

        for (const tower_id of this.creep_tower_tracker.keys()) {
            const name = this.creep_tower_tracker.get(tower_id)
            if (name === creep.name) {
                id_to_remove = tower_id
                break
            }
        }

        if (id_to_remove.length > 0) {
            this.creep_tower_tracker.delete(id_to_remove)
        }
    }

    getRole(): string {
        return this.role
    }

}
