import { CommonFunctions } from "../commonFuncs"
import { CreepTask } from "./creepTasks"
import { flag_names, task_names } from "../enums"
import { CreepData } from "../interfaces"
import { TwoDemMap } from "../DataStructures/map"

interface CreepSource {
    creep_id: string
    source_id: string
}

export class Harvester extends CreepTask {

    private readonly production_structs: Array<StructureConstant> = [
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION
    ]

    private readonly store_structs: Array<StructureConstant> = [
        STRUCTURE_LINK,
        STRUCTURE_CONTAINER,
        STRUCTURE_STORAGE
    ]

    private readonly sourceCreepMap = new Map<string, Array<CreepSource>>()
    private readonly supplyManager = new TwoDemMap<string, Array<StructureConstant>>()

    protected role = task_names[task_names.harvester]
    protected cap = 2


    /**
     * This task collects energy from a source and brings it to energy storage structures
     * (structures such as Links, Storage, Spawns, Extensions, Containers, etc)
     * @author Daniel Schechtman
     */
    constructor() {
        super()
    }

    /**
     * returns the link closest to the flag supply_link <room name>, null if there
     * are no links in the room.
     *
     * @param   {[string]}  creep_room_name  used to find the supply flag in the room
     *
     * @author Daniel Schechtman
     */
    private getSupplyLink(creep_room_name: string): StructureLink | null {
        const supply_flag = Game.flags[`${flag_names[flag_names.supply_link]} ${creep_room_name}`]
        let link: StructureLink | null = null

        if (supply_flag) {
            const supply_link = supply_flag.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (s) => {
                    return s.structureType === STRUCTURE_LINK
                }
            })

            if (supply_link instanceof StructureLink) {
                link = supply_link
            }
        }

        return link
    }

    /**
     * Will remove all links, except the link closest to the supply_link flag, and return a list with
     * all structures save for those links
     *
     * @param   {Array<AnyStructure>}  structures    list of structures that need to be filtered for links
     * @param   {string}  creep_room_name         used to find the supply link
     *
     * @return  {Array<AnyStructure>}                an array with all the structures originally in the passed in array
     * save for only having a link closest to supply_flag if any link was in the list
     * @author Daniel Schechtman
     */
    private removeRecieveLinks(structures: Array<AnyStructure>, creep_room_name: string): Array<AnyStructure> {
        const list_with_supply_link = new Array<AnyStructure>()
        const supply_link = this.getSupplyLink(creep_room_name)

        for (const struct of structures) {
            if (struct.structureType !== STRUCTURE_LINK || struct.id === supply_link?.id) {
                list_with_supply_link.push(struct)
            }
        }

        return list_with_supply_link
    }

    private IndexOf(room_name: string, creep_or_source_id: string): number | undefined {
        let index: number | undefined = undefined

        if (this.sourceCreepMap.has(room_name)) {
            for (let i = 0; i < this.sourceCreepMap.get(room_name)!!.length; i++) {
                const creep_source = this.sourceCreepMap.get(room_name)!![i]

                if (creep_source.creep_id === creep_or_source_id || creep_source.source_id === creep_or_source_id) {
                    index = i
                    break
                }
            }
        }

        return index
    }

    protected startLogic(creep: Creep) {

        const sources = this.manager.getSources()
        const supply_size = this.supplyManager.size(creep.room.name)
        console.log("starting")
        if (!this.sourceCreepMap.has(creep.room.name)) {
            this.sourceCreepMap.set(creep.room.name, new Array())
        }

        for (const energy of sources) {
            const index = this.IndexOf(creep.room.name, energy.id)
            if (index === undefined) {
                this.sourceCreepMap.get(creep.room.name)!!.push({
                    creep_id: creep.id,
                    source_id: energy.id
                })
                creep.memory.game_object_id = energy.id
                break
            }
        }

        if (this.IndexOf(creep.room.name, creep.id) === undefined) {
            creep.suicide()
        }

        if (supply_size === 0 || supply_size > 1) {
            console.log("setting into production")
            this.supplyManager.add(creep.room.name, creep.id, this.production_structs)
        }
        else if (supply_size === 1) {
            console.log("setting into storeage")
            this.supplyManager.add(creep.room.name, creep.id, this.store_structs)
        }
    }

    protected runLogic(creep: Creep) {
        CommonFunctions.changeWorkingState(creep)

        if (!creep.memory.working) {
            let source = creep.pos.findClosestByPath(FIND_SOURCES)!!

            const status = creep.harvest(source)

            if (status === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, CommonFunctions.pathOptions())
            }
        }
        else {
            const containers = this.manager.getMyStructs([STRUCTURE_CONTAINER]) as StructureContainer[]

            if (false) {
                let index = 0
                while (index < containers.length && containers[index].store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                    index++
                }

                if (index < containers.length) {
                    const status = creep.transfer(containers[index], RESOURCE_ENERGY)

                    if (status === ERR_NOT_IN_RANGE) {
                        creep.moveTo(containers[index], CommonFunctions.pathOptions())
                    }
                }
                else {
                    const wait_name = `${flag_names[flag_names.harvester_wait]} ${creep.room.name}`
                    const wait_flag = Game.flags[wait_name]

                    if (wait_flag) {
                        creep.moveTo(wait_flag, CommonFunctions.pathOptions())
                    }
                }
            }
            else {
                const supply_size = this.supplyManager.size(creep.room.name)

                if (supply_size === 1) {
                    this.supplyManager.set(creep.room.name, creep.id, this.production_structs)
                }


                const struct_types = this.supplyManager.get(creep.room.name, creep.id)
                let num = 0
                const callback = (s: AnyStructure, debug?: any) => {
                    let has_room_in_storage = false
                    try {
                        const store_struct = s as AnyStoreStructure
                        has_room_in_storage = store_struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    }
                    catch (e_) {
                        const error = e_ as Error

                        console.log(error.stack)
                        console.log(error.message)

                        has_room_in_storage = false
                    }
                    num++
                    return has_room_in_storage
                }

                let structs = this.manager.getMyStructs(struct_types!!, callback)

                if (struct_types === this.store_structs) {
                    structs = this.removeRecieveLinks(structs, creep.room.name)
                }

                if (structs.length === 0) {
                    structs = this.manager.getMyStructs(this.production_structs, callback)
                }

                if (structs.length > 0) {
                    const transfer_status = creep.transfer(structs[0] as AnyStoreStructure, RESOURCE_ENERGY)

                    if (transfer_status === ERR_NOT_IN_RANGE) {
                        creep.moveTo(structs[0], CommonFunctions.pathOptions())
                    }
                }
                else {
                    const wait_flag = Game.flags[CommonFunctions.getFlagName(flag_names.harvester_wait, creep.room)]
                    creep.moveTo(wait_flag, CommonFunctions.pathOptions())
                }
            }
        }
    }

    protected spawnCheck(): boolean {
        const num_harvesters = this.manager.getMyCreeps(this.role).length
        const num_of_sources = this.manager.getSources().length
        const num_of_containers = this.manager.getMyStructs([STRUCTURE_CONTAINER]).length
        const should_spawn = num_harvesters < this.cap
        this.skeleton.work = 5
        this.skeleton.carry = 4
        this.skeleton.move = this.skeleton.work + this.skeleton.carry

        const avalable_energy = this.manager.getRoom()!!.energyAvailable
        const cost_to_create = CommonFunctions.calcEnergyCostForBody(this.skeleton)

        this.num_of_creeps = num_harvesters



        if (avalable_energy < cost_to_create && num_harvesters === 0) {
            this.skeleton.work = 1
            this.skeleton.carry = 1
            this.skeleton.move = 2
        }


        return should_spawn
    }

    protected destroyLogic(creep: CreepData): void {
        this.supplyManager.delete(creep.origin_room, creep.id)

        const index = this.IndexOf(creep.origin_room, creep.id)
        if (index !== undefined) {
            this.sourceCreepMap.get(creep.origin_room)!!.splice(index, 1)
        }
    }

    getRole(): string {
        return this.role
    }
}
// onStart
/*

        const supply_size = this.supplyManager.size(creep.room.name)

        if (supply_size === 0 || supply_size > 1) {
            this.supplyManager.set(creep.room.name, creep.id, this.production_structs)
        }
        else if (supply_size === 1) {
            this.supplyManager.set(creep.room.name, creep.id, this.store_structs)
        }
*/

// onRun
/*
CommonFunctions.changeWorkingState(creep)

        const supply_size = this.supplyManager.size(creep.room.name)

        if (supply_size === 1) {
            this.supplyManager.set(creep.room.name, creep.id, this.production_structs)
        }

        if (!creep.memory.working) {
            CreepActions.harvest(creep)
        }
        else {
            const struct_types = this.supplyManager.get(creep.room.name, creep.id)
            let num = 0
            const callback = (s: AnyStructure, debug?: any) => {
                let has_room_in_storage = false
                try {
                    const store_struct = s as AnyStoreStructure
                    has_room_in_storage = store_struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }
                catch (e_) {
                    const error = e_ as Error

                    console.log(error.stack)
                    console.log(error.message)

                    has_room_in_storage = false
                }
                num++
                return has_room_in_storage
            }

            let structs = this.manager.getMyStructs(struct_types!!, callback)

            if (struct_types === this.store_structs) {
                structs = this.removeRecieveLinks(structs, creep.room.name)
            }

            if (structs.length === 0) {
                structs = this.manager.getMyStructs(this.production_structs, callback)
            }

            if (structs.length > 0) {
                const transfer_status = creep.transfer(structs[0] as AnyStoreStructure, RESOURCE_ENERGY)

                if (transfer_status === ERR_NOT_IN_RANGE) {
                    creep.moveTo(structs[0], CommonFunctions.pathOptions())
                }
            }
            else {
                const wait_flag = Game.flags[CommonFunctions.getFlagName(flag_names.harvester_wait, creep.room)]
                creep.moveTo(wait_flag, CommonFunctions.pathOptions())
            }

        }
*/