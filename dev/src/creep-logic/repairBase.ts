import { CommonFunctions } from "../commonFuncs";
import { Body, CreepData } from "../interfaces";
import { RoomManager } from "../managers/roomManager";
import { CreepActions } from "./creepAction";
import { SortableStack } from "../DataStructures/stack";
import { createReadStream } from "fs";

/**
 * This class was made to allow for multiple repair creeps types.
 * This class accepts a list of structures and will have the creep repair structures 
 * in that list
 */
export class RepairBase {
    // associates a struct id with a creep name
    // this tracks which structures are currently being
    // repaired by a creep
    private static structs_under_repair = new Map<string, string>()

    private sorted_structs_from_weakest_to_strongest: Map<string, SortableStack<AnyStructure>> | null = null

    private num_of_creeps = 0

    private on_repair_callback: () => void = () => {}

    /**
    * This class was made to allow for multiple repair creeps types.
    * This class accepts a list of structures and will have the creep repair structures 
    * in that list
    */
    constructor() { }

    /**
     * check if a creep building a specific construction site is still alive
     * otherwise delete the construction site from memory
     * 
     * @author Daniel Schechtman
     */
    private removeStructFromTracking(): void {

        // I am not sure how maps work, so I want to avoid bugs
        // that come from deleting items while iterating over a map.
        const structs_under_repair_copy = new Map<string, string>()

        RepairBase.structs_under_repair.forEach((repair_creep_name: string, struct_id: string) => {
            structs_under_repair_copy.set(struct_id, repair_creep_name)
        })

        structs_under_repair_copy.forEach((repair_creep_name: string, struct_id: string) => {
            if (!Game.creeps[repair_creep_name]) {
                RepairBase.structs_under_repair.delete(struct_id)
            }
        })
    }


    /**
     * takes two structures and returns -1, 0, or 1.
     * -1 is returned if a.hits < b.hits
     * 0 is returned if a.hits === b.hits
     * 1 is returned if a.hits > b.hits
     *
     * @param   {AnyStructure}  a  first structure for comparison
     * @param   {AnyStructure}  b  second structure for comparison
     *
     * @return  {number} a value representing if a.hits is less, equal, or greater then b.hits
     * @author Daniel Schechtman
     */
    private sortCallBack(a: AnyStructure, b: AnyStructure): number {
        let sort_val = 0
        if (a.hits < b.hits) {
            sort_val = -1
        }
        else if (a.hits > b.hits) {
            sort_val = 1
        }
        return sort_val
    }

    /**
     * Sorts a list that was passed into this object via updateList() and returns it. Will return
     * all damaged structs found in the room under the player's control if there was no list passed in via
     * updateList()
     *
     * @return  {AnyStructure[]}         list of structures sorted from most to least damaged
     * @author Daniel Schechtman
     */
    private getAllDamagedStructs(room_name: string): Map<string, SortableStack<AnyStructure>> {
        let structs: Map<string, SortableStack<AnyStructure>> | null = this.sorted_structs_from_weakest_to_strongest
        if (!structs) {
            structs = new Map()
            structs.set(room_name, new SortableStack())
            for (const struct of RoomManager.getInstance().getMyStructs()) {
                structs.get(room_name)?.push(struct)
            }
            console.log(`repair_base -> getAllDamagedStructsFromWeakestToStrongest: err perfered struct is null, getting all structures`)
        }
        structs.get(room_name)?.sort(this.sortCallBack)
        return structs
    }

    /**
     * assigns an struct id to creep.memory.game_object_id if the list of structs
     * passed in isn't empty, otherwise stores an empty string in creep.memory.game_object_id
     *
     * @param   {Creep}  creep  creep to store struct ids in
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private assignCreepStruct(creep: Creep): void {
        const damaged_structs = this.getAllDamagedStructs(creep.room.name)
        const site = damaged_structs.get(creep.room.name)!!.peek()
        if (site) {
            const damaged_struct_id = site.id
            if (!RepairBase.structs_under_repair.has(damaged_struct_id)) {
                creep.memory.game_object_id = damaged_struct_id
                RepairBase.structs_under_repair.set(damaged_struct_id, creep.name)
            }
        }
        else {
            damaged_structs.delete(creep.room.name)
            creep.memory.game_object_id = ""
        }
    }

    setOnRepairHandler(callback: () => void) {
        this.on_repair_callback = callback
    }

    /**
     * sets the struct list used be RepairBase to repair structs
     * @param {AnyStructure[]} new_struct_list list of structs to be repaired
     * @author Daniel Schechtman
     */
    updateStructList(room_name: string, new_struct_list: AnyStructure[]): void {
        this.sorted_structs_from_weakest_to_strongest = new Map()
        this.sorted_structs_from_weakest_to_strongest.set(room_name, new SortableStack())
        for (const struct of new_struct_list) {
            this.sorted_structs_from_weakest_to_strongest.get(room_name)?.push(struct)
        }
    }

    /**
     * returns true if a list of structures was passed into updateStructList, false otherwise
     * @author Daniel Schechtman
     */
    hasStructList(room_name: string): boolean {
        let ret_val = false
        if (this.sorted_structs_from_weakest_to_strongest?.has(room_name)) {
            ret_val = this.sorted_structs_from_weakest_to_strongest.get(room_name)!!.size() > 0
        }
        return ret_val
    }

    start(creep: Creep) {
        RoomManager.getInstance().updateStructureList()   
    }

    /**
     * runs the logic to repair structs in the room
     * @param {Creep} creep the creep to perform repair tasks
     * @author Daniel Schechtman
     */
    run(creep: Creep): void {
        this.removeStructFromTracking()
        CommonFunctions.changeWorkingState(creep)

        if (!creep.memory.game_object_id) {
            this.assignCreepStruct(creep)
        }
        // makes sure that when the script restarts, the program doesn't forget what the creep is doing
        else if (!RepairBase.structs_under_repair.has(creep.memory.game_object_id)) {
            RepairBase.structs_under_repair.set(creep.memory.game_object_id, creep.name)
        }

        if (!creep.memory.working) {
            CreepActions.harvest(creep)
        }
        else {
            let struct = Game.getObjectById<Structure>(creep.memory.game_object_id)
            let repair_status = null

            if (struct) {
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
                        this.on_repair_callback()
                        this.sorted_structs_from_weakest_to_strongest?.get(creep.room.name)?.pop()
                        this.assignCreepStruct(creep)
                    }

                    if (creep.memory.game_object_id.length === 0){
                        creep.suicide()
                    }
                    break
                }
                default: {
                    creep.suicide()
                }
            }
        }
    }

    /**
     * determines if a repair creep should be spawned
     * @param {number} cap max number of creeps of a specific type that can be made
     * @param {string} creep_role the role the program will use to determine what task a creep should perform
     * 
     * @returns {boolean} true if a creep should be spawned, false otherwise
     * @author Daniel Schechtman
     */
    create(cap: number, creep_role: string, spawn: StructureSpawn): boolean {
        const repairmen = RoomManager.getInstance().getMyCreeps(creep_role).length
        const num_of_constructions = this.sorted_structs_from_weakest_to_strongest?.get(spawn.room.name)?.size()
        const should_spawn = repairmen < cap && num_of_constructions !== undefined && num_of_constructions > 0
        this.num_of_creeps = repairmen


        return should_spawn
    }

    /**
     * actions to be performed upon a creep's death
     * 
     * @param {CreepData} creep a object holding various pieces of data of a creep
     * @author Daniel Schechtman
     */
    destroyLogic(creep: CreepData): void {
        this.sorted_structs_from_weakest_to_strongest?.delete(creep.origin_room)
    }

    getNumOfCreeps() {
        return this.num_of_creeps
    }
}
