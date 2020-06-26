import { CommonFunctions } from "./commonFuncs"
import { CreepTask } from "./creepTasks"
import { Defender } from "./defender"
import { flags, task_names } from "./enums"

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
        const num_of_harvesters = CommonFunctions.getMyCreeps(this.role, creep).length

        const source = "s"
        const link = "l"

        let room_id = creep.room.name

        if (!this.link_creep.has(creep.room.name)) {
            const nearest_link = creep.room.find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_LINK}})

            if (nearest_link.length > 0) {
                creep.memory[link] = nearest_link[0].id
            }

            const supplier: LinkSupplier = {
                id: creep.id,
                supplied: false
            }
            this.link_creep.set(creep.room.name, supplier)

        }
        else{
            const supplier_creep_id = this.link_creep.get(creep.room.name)!!.id
            const supplier_creep = Game.getObjectById(supplier_creep_id)
            if (!supplier_creep){
                this.link_creep.delete(creep.room.name)
            }
        }
        

        const pathOpts = CommonFunctions.pathOptions(false)
        if (!creep.memory.working) {

            if (!creep.memory[source]) {
                creep.memory[source] = creep.pos.findClosestByPath(FIND_SOURCES)!!.id
            }

            // gathering energy
            const energy = creep.pos.findClosestByPath(FIND_SOURCES)!!
            let status = creep.harvest(energy)
            if (status === ERR_NOT_IN_RANGE) {
                creep.moveTo(energy, pathOpts)
            }

            if (this.link_creep.get(room_id)?.id === creep.id) {
                this.link_creep.get(room_id)!!.supplied = false
            }
        }
        else {

            //storing energy
            const energy_store_units = creep.room.find(FIND_MY_STRUCTURES, {
                filter: (struct) => {
                    return (
                        struct.structureType === STRUCTURE_SPAWN
                        || struct.structureType === STRUCTURE_EXTENSION
                    ) && struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            })

            const becon_flag = Game.flags[flags[flags.becon]]

            const battery = creep.room.find(FIND_STRUCTURES, {
                filter: (struct) => {
                    let can_store = false
                    if (struct.structureType === STRUCTURE_CONTAINER) {
                        can_store = struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    }
                    else if (struct.structureType === STRUCTURE_STORAGE && !becon_flag) {
                        const max_capacity = struct.store.getCapacity() / 2
                        const cur_capacity = struct.store.getUsedCapacity(RESOURCE_ENERGY)

                        can_store = cur_capacity < max_capacity
                    }
                    return can_store
                }
            })

            const storage_unit = [...energy_store_units, ...battery]

            let store_target: AnyStructure | null = null

            if (storage_unit.length > 0) {
                store_target = storage_unit[0]
            }

            const is_link_creep = this.link_creep.get(room_id)?.id === creep.id
            const are_enough_harvesters = num_of_harvesters > 1
            const can_supply = this.link_creep.get(room_id)?.supplied === false || !becon_flag

            if (is_link_creep && are_enough_harvesters && can_supply) {
                const link_target = Game.getObjectById<StructureLink>(creep.memory[link])
                const change_target = link_target && link_target.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                if (change_target) {
                    store_target = link_target
                }
                else if (!Defender.underAttack && battery.length > 0 && !becon_flag) {
                    store_target = battery[0]
                }
            }


            if (store_target && this.getStore(store_target)!!.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                const transfer_status = creep.transfer(store_target, RESOURCE_ENERGY)
                const link_creep = this.link_creep.get(room_id)


                if (transfer_status === ERR_NOT_IN_RANGE) {
                    creep.moveTo(store_target, pathOpts)
                }
                else if (transfer_status === OK && link_creep && link_creep.id === creep.id) {
                    link_creep.supplied = true
                }
            }
            else {
                const flag = CommonFunctions.getFlagName(flags.harvester_wait, creep.room)
                creep.moveTo(Game.flags[flag], pathOpts)
            }
        }

        if(this.link_creep.get(room_id)?.id === creep.id && creep.ticksToLive!! === 1){
            this.link_creep.delete(room_id)
        }
    }

    protected createLogic(master: StructureSpawn): boolean {
        const num_harvesters = CommonFunctions.getMyCreeps(this.role, master).length
        const should_spawn = num_harvesters < this.cap



        if (should_spawn) {
            this.skeleton.work = 5
            this.skeleton.carry = 4
            this.skeleton.move = 9

            let body = CommonFunctions.createBody(this.skeleton)
            const name = CommonFunctions.createName(this.role)
            const role = CommonFunctions.createMemData(this.role, master.room.name)

            let spawn_status = master.spawnCreep(body, name, role)
            if (spawn_status === ERR_NOT_ENOUGH_ENERGY && num_harvesters === 0) {
                body = CommonFunctions.createBody()
                master.spawnCreep(body, name, role)
            }
        }

        return !should_spawn
    }

    static get harvestRole(): string {
        return Harvester.harvest_role
    }
}
