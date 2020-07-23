import { CommonFunctions } from "../commonFuncs"
import { CreepTask } from "./creepTasks"
import { Defender } from "./defender"
import { flags, task_names } from "../enums"
import { stat } from "fs"

interface LinkSupplier {
    id: string,
    supplied: boolean,
}

// this task collects energy and brings it to the spawn so creeps can be
// made to perform tasks for the colony
export class Harvester extends CreepTask {
    private link_creep = new Map<string, LinkSupplier>()

    protected role = task_names[task_names.harvester]
    protected cap = 2

    private static harvest_role = task_names[task_names.harvester]

    constructor() {
        super()
        Harvester.harvest_role = this.role

    }

    private readonly store_types: StructureConstant[] = [
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION,
        STRUCTURE_CONTAINER,
        STRUCTURE_STORAGE
    ]

    private getStore(struct: AnyStructure) {
        let ret_store = null
        const store_types = [
            STRUCTURE_SPAWN,
            STRUCTURE_STORAGE,
            STRUCTURE_CONTAINER,
            STRUCTURE_LINK,
            STRUCTURE_EXTENSION,
        ]

        for (const store of store_types) {
            if (struct.structureType === store) {
                ret_store = struct.store
                break
            }
        }
        return ret_store
    }


    protected log() {

    }

    getRole() {
        return this.role
    }

    protected runLogic(creep: Creep) {

        // makes sure it only gathers more energy when it stores all the
        // energy it has gathered
        const should_get_energy = CommonFunctions.changeWorkingState(creep)
        const num_of_harvesters = this.manager.getMyCreeps(task_names[task_names.harvester]).length

        const source = "s"
        const link = "l"

        let room_id = creep.room.name

        if (!this.link_creep.has(creep.room.name)) {
            const struct_types: StructureConstant[] = [STRUCTURE_LINK]
            const nearest_link = this.manager.getMyStructs(struct_types)

            if (nearest_link.length > 0) {
                creep.memory[link] = nearest_link[0].id
            }

            const supplier: LinkSupplier = {
                id: creep.id,
                supplied: false
            }
            this.link_creep.set(creep.room.name, supplier)

        }
        else {
            const supplier_creep_id = this.link_creep.get(creep.room.name)!!.id
            const supplier_creep = Game.getObjectById(supplier_creep_id)
            if (!supplier_creep) {
                this.link_creep.delete(creep.room.name)
            }
        }


        const pathOpts = CommonFunctions.pathOptions()
        if (!creep.memory.working) {



            if (!creep.memory[source]) {
                creep.memory[source] = creep.pos.findClosestByPath(FIND_SOURCES)!!.id
            }

            // gathering energy



            if (this.link_creep.get(room_id)?.id === creep.id) {
                const energy = Game.getObjectById<Source>(creep.memory[source])!!
                let status = creep.harvest(energy)
                if (status === ERR_NOT_IN_RANGE) {
                    creep.moveTo(energy, pathOpts)
                } else if (creep.store.energy > 10 && creep.room.storage && num_of_harvesters > 1) {
                    creep.memory.working = true
                }

                this.link_creep.get(room_id)!!.supplied = false
            }
            else {
                const energy = creep.room.storage
                if (energy) {
                    const status = creep.withdraw(energy as StructureStorage, RESOURCE_ENERGY)
                    if (status === ERR_NOT_IN_RANGE) {
                        creep.moveTo(energy, CommonFunctions.pathOptions())
                    }
                }
                else {
                    const source = creep.pos.findClosestByPath(FIND_SOURCES)!!
                    const status = creep.harvest(source)

                    if (status === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source, CommonFunctions.pathOptions())
                    }
                }
            }
        }

        if (creep.memory.working) {

            const spawn_energy_struct_id = "energy_id"
            //storing energy
            const spawn_energy: StructureConstant[] = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION]
            const energy_store_units = this.manager.getMyStructs(spawn_energy, (s: AnyStructure) => {
                return (s as AnyStoreStructure).store.getFreeCapacity(RESOURCE_ENERGY) > 0
            })

            const becon_flag = Game.flags[flags[flags.becon]]

            const store_energy: StructureConstant[] = [STRUCTURE_STORAGE]
            const battery = this.manager.getMyStructs(store_energy)

            const storage_unit = [...energy_store_units, ...battery]

            let store_target: AnyStructure | null = null

            if (storage_unit.length > 0) {
                store_target = storage_unit[0]
            }


            const is_link_creep = this.link_creep.get(room_id)?.id === creep.id
            const are_enough_harvesters = num_of_harvesters > 1
            const can_supply = this.link_creep.get(room_id)?.supplied === false || !becon_flag

            if (is_link_creep && are_enough_harvesters) {
                const link_target = Game.getObjectById<StructureLink>(creep.memory[link])
                const change_target = link_target && link_target.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                if (change_target) {
                    store_target = link_target
                }
                else if (!Defender.underAttack) {
                    let battery_store: StructureStorage = battery[0] as StructureStorage
                    let storage = creep.room.storage

                    if (storage && battery_store.store.energy < battery_store.store.getCapacity() / 2) {
                        store_target = battery_store
                    }
                }
            }


            if (store_target && this.getStore(store_target)!!.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                const link_creep = this.link_creep.get(room_id)

                let status
                if (creep.room.storage && num_of_harvesters > 1) {

                    if (store_target instanceof StructureStorage && link_creep?.id !== creep.id) {
                        const flag = CommonFunctions.getFlagName(flags.harvester_wait, creep.room)
                        creep.moveTo(Game.flags[flag], pathOpts)
                    }

                    else if (link_creep?.id === creep.id) {
                        status = creep.transfer(store_target, RESOURCE_ENERGY, 10)
                    }
                    else {
                        status = creep.transfer(store_target, RESOURCE_ENERGY)
                    }

                    if (status === ERR_NOT_IN_RANGE) {
                        creep.moveTo(store_target, CommonFunctions.pathOptions())
                    }
                    else if (link_creep?.id === creep.id && (status === ERR_FULL || status === ERR_NOT_ENOUGH_ENERGY)) {
                        creep.transfer(store_target, RESOURCE_ENERGY)
                    }
                    else if (link_creep?.id === creep.id && status === OK) {
                        this.link_creep.get(creep.room.name)!!.supplied = true
                        creep.memory.working = false
                    }
                }
                else {
                    CommonFunctions.filterPrint(creep.room.name, 2, "transfering")
                    let status = creep.transfer(store_target, RESOURCE_ENERGY)
                    if (status === ERR_NOT_IN_RANGE) {
                        creep.moveTo(store_target, CommonFunctions.pathOptions())
                    }
                    this.link_creep.get(creep.room.name)!!.supplied = true
                }

            }
            else {
                const flag = CommonFunctions.getFlagName(flags.harvester_wait, creep.room)
                creep.moveTo(Game.flags[flag], pathOpts)
            }
        }

        if (this.link_creep.get(room_id)?.id === creep.id && creep.ticksToLive!! === 1) {
            this.link_creep.delete(room_id)
        }
    }

    protected createLogic(): boolean {
        const num_harvesters = this.manager.getMyCreeps(this.role).length
        const should_spawn = num_harvesters < this.cap
        this.skeleton.work = 5
        this.skeleton.carry = 4
        this.skeleton.move = 9

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

    static get harvestRole(): string {
        return Harvester.harvest_role
    }
}
