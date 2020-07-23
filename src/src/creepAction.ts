import { task_names } from "./enums"
import { CommonFunctions } from "./commonFuncs"

/**
* This class holds static methods that give a more universal way of performing creep actions
*/
export class CreepActions {

    /**
     * has creep draw energy from a source if it's a harvester creep or if there is not Storage in the room.
     * If there is Storage in the room, then all creeps but harvesters will draw energy from Storage
     * @param creep the creep that will be drawing energy from somewhere
     * @returns void
     * @author Daniel Schechtman
     */
    static harvest(creep: Creep): void{
        const storage = creep.room.storage

        if (storage !== undefined && creep.memory.role !== task_names[task_names.harvester]){
            const status = creep.withdraw(storage, RESOURCE_ENERGY)
            if (status === ERR_NOT_IN_RANGE){
                creep.moveTo(storage, CommonFunctions.pathOptions())
            }
        }
        else{
            const energy = creep.pos.findClosestByPath(FIND_SOURCES)!!
            const status = creep.harvest(energy)

            if (status === ERR_NOT_IN_RANGE){
                creep.moveTo(energy, CommonFunctions.pathOptions())
            }
        }
    }
}