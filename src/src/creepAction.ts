import { task_names } from "./enums"
import { CommonFunctions } from "./commonFuncs"
import { RoomManager } from "./roomManager"

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
        const containers = RoomManager.getInstance().getMyStructs([STRUCTURE_CONTAINER], (s) => {
            let has_energy = false

            try {
                has_energy = (s as AnyStoreStructure).store.energy > 0
            }
            catch(_e) {
                has_energy = false
            }

            return has_energy
        })

        if (false){
            const status = creep.withdraw(containers[0], RESOURCE_ENERGY)
            if (status === ERR_NOT_IN_RANGE){
                creep.moveTo(containers[0], CommonFunctions.pathOptions())
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