import { CommonFunctions} from "../commonFuncs";
import { Body } from "../interfaces";

export class RepairBase {
    // associates a struct id with a creep name
    // this tracks which structures are currently being
    // repaired by a creep
    private static structs_under_repair = new Map<string, string>()

    private sorted_structs_from_weakest_to_strongest: AnyStructure[] | null = null

    private removeStructFromTracking() {

        // I am not sure how maps work, so I want to avoid bugs
        // that come from deleting items while iterating over a map.
        const structs_under_repair_copy = new Map<string, string>()

        RepairBase.structs_under_repair.forEach((val: string, key: string) => {
            structs_under_repair_copy.set(key, val)
        })

        structs_under_repair_copy.forEach((repair_creep_name: string, struct_id: string) => {
            if (!Game.creeps[repair_creep_name]) {
                RepairBase.structs_under_repair.delete(struct_id)
            }
        })
    }

    private compareFunc(a: AnyStructure, b: AnyStructure) {
        let sort_val = 0
        if (a.hits < b.hits) {
            sort_val = -1
        }
        else if (a.hits > b.hits) {
            sort_val = 1
        }
        return sort_val
    }

    private getAllHarmedStructs(creep: Creep) {
        let structs = this.sorted_structs_from_weakest_to_strongest?.sort((a, b) => {return this.compareFunc(a, b)})
        if (!structs) {
            structs = creep.room.find(FIND_STRUCTURES).sort((a, b) => { return this.compareFunc(a, b) })
            console.log(`repair_base -> getAllDamagedStructsFromWeakestToStrongest: err perfered struct is null, getting all structures`)
        }
        return structs
    }

    private assignCreepStruct(creep: Creep) {
        const damaged_structs = this.getAllHarmedStructs(creep)
        let item_index = 0

        for (const struct_needing_repair of damaged_structs) {
            if (!RepairBase.structs_under_repair.has(struct_needing_repair.id)) {
                creep.memory.game_object_id = struct_needing_repair.id
                RepairBase.structs_under_repair.set(struct_needing_repair.id, creep.name)
                break
            }
            item_index++
        }

        if (item_index === damaged_structs.length) {
            creep.memory.game_object_id = ""
        }
    }

    updateStructList(new_struct_list: AnyStructure[]) {
        this.sorted_structs_from_weakest_to_strongest = new_struct_list
    }

    hasStructList(): boolean {
        return this.sorted_structs_from_weakest_to_strongest !== null
    }

    run(creep: Creep) {
        this.removeStructFromTracking()
        const source_ref = "source"

        switch (CommonFunctions.changeWorkingState(creep)) {
            case -1: {
                if (!creep.memory[source_ref]) {
                    let source: Source | StructureStorage = CommonFunctions.findClosestSource(creep)
                    const spawn = creep.room.find(FIND_MY_STRUCTURES, {filter: (s) => {return s.structureType === STRUCTURE_SPAWN}})
                    if(spawn.length > 0){
                        const closest_source_to_spawn = spawn[0].pos.findClosestByPath(FIND_SOURCES)
                        if(closest_source_to_spawn && closest_source_to_spawn.id === source.id){
                            const storage = creep.room.find(FIND_MY_STRUCTURES, {
                                filter: (s) => {
                                    return s.structureType === STRUCTURE_STORAGE && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                                }
                            })

                            if(storage.length > 0){
                                source = storage[0] as StructureStorage
                            }
                        }
                    }
                    creep.memory[source_ref] = source.id
                }
                break
            }
            case 1: {
                creep.memory[source_ref] = null
                break
            }
        }

        if (!creep.memory.game_object_id) {
            this.assignCreepStruct(creep)
        }
        else if (!RepairBase.structs_under_repair.has(creep.memory.game_object_id)) {
            RepairBase.structs_under_repair.set(creep.memory.game_object_id, creep.name)
        }

        if (!creep.memory.working) {
            const source = Game.getObjectById<Source | StructureStorage>(creep.memory[source_ref])
            let status

            if(source instanceof StructureStorage){
                status = creep.withdraw(source, RESOURCE_ENERGY)
            }
            else if(source instanceof Source){
                status = creep.harvest(source)
            }

            if(source && status === ERR_NOT_IN_RANGE){
                creep.moveTo(source, CommonFunctions.pathOptions())
            }
        }
        else {
            let struct = Game.getObjectById<Structure>(creep.memory.game_object_id)
            let repair_status = null

            if (struct instanceof Structure) {
                repair_status = creep.repair(struct)
            }

            switch (repair_status) {
                case ERR_NOT_IN_RANGE: {
                    creep.moveTo(struct!!, CommonFunctions.pathOptions())
                    break
                }
                case OK: {
                    const struct_fully_repaired = struct!!.hits === struct!!.hitsMax
                    if (struct_fully_repaired) {
                        this.assignCreepStruct(creep)
                    }
                    break
                }
                default: {
                    creep.suicide()
                }
            }
        }
    }

    create(master: StructureSpawn, cap: number, creep_role: string, skeleton: Body): boolean {
        const repairmen = CommonFunctions.getMyCreeps(creep_role, master).length
        const should_spawn = repairmen < cap && this.sorted_structs_from_weakest_to_strongest?.length

        if (should_spawn) {
            const body = CommonFunctions.createBody(skeleton)
            const name = CommonFunctions.createName(creep_role)
            const role = CommonFunctions.createMemData(creep_role, master.room.name)

            master.spawnCreep(body, name, role)
        }

        return !should_spawn
    }
}
